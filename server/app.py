"""Production ASGI entry point. Run with one Uvicorn worker and persistent disk."""
from __future__ import annotations

import ipaddress
import json
import mimetypes
import os
from pathlib import Path
import sqlite3
from urllib.parse import quote

import anyio
from starlette.applications import Starlette
from starlette.concurrency import run_in_threadpool
from starlette.exceptions import HTTPException
from starlette.middleware import Middleware
from starlette.requests import Request, ClientDisconnect
from starlette.responses import FileResponse, JSONResponse, Response
from starlette.routing import Route

from .access_requests import AccessRequestService
from .auth import AuthStore, SESSION_SECONDS, client_key
from .config import Settings, inside
from .site_settings import MAX_REVISION, SiteSettingsConflict, SiteSettingsStore


COOKIE_NAME = "__Host-care_session"
MAX_BODY_BYTES = 4096
OWNER_FILES = frozenset({"site-settings.html", "site-settings.mjs"})
PUBLIC_FILES = frozenset({
    "index.html", "discover.html", "about.html", "welcome.html", "login.html", "request-access.html",
    "auth.mjs", "login.mjs", "landing.mjs", "legacy-landing.mjs", "request-access.mjs",
    "auth.css", "styles.css", "discover.css", "discover-atlas.css",
    "discover-experiments.css", "brand-header.css", "site.webmanifest",
    "favicon.ico", "favicon.svg", "quick-start.pdf", "robots.txt", "sitemap.xml", "llms.txt",
})
PUBLIC_BRANDING = frozenset({
    "assets/care-header-mark.svg", "assets/care-mark.svg", "assets/favicon-32.png",
    "assets/favicon-128.png", "assets/favicon-light-32.png", "assets/favicon-light-128.png",
    "assets/apple-touch-icon.png", "assets/app-icon-512.png",
})
IMAGE_SUFFIXES = frozenset({".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".svg", ".ico"})
SECURITY_HEADERS = {
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY", "Referrer-Policy": "same-origin",
    "Content-Security-Policy": "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
}


def json_response(payload, status=200, headers=None):
    return JSONResponse(payload, status_code=status, headers={**SECURITY_HEADERS, **(headers or {})})


def header_values(scope, name):
    return [value.decode("latin-1") for key, value in scope.get("headers", []) if key.lower() == name]


def safe_path(path):
    return (isinstance(path, str) and path.startswith("/") and not path.startswith("//")
            and "\\" not in path and not any(ord(c) < 32 or 0xD800 <= ord(c) <= 0xDFFF for c in path)
            and not any(part.startswith(".") for part in path.split("/") if part))


class SecurityBoundary:
    """Honor only explicitly trusted proxy peers, and never the first XFF by default."""
    def __init__(self, app, settings):
        self.app, self.settings = app, settings

    def trusted(self, address):
        return any(address in network for network in self.settings.trusted_proxies)

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        scope = dict(scope)
        try:
            peer = ipaddress.ip_address((scope.get("client") or ("", 0))[0])
        except ValueError:
            peer = None
        if peer is not None and self.trusted(peer):
            forwarded = ",".join(header_values(scope, b"x-forwarded-for"))
            if forwarded:
                parts = [part.strip() for part in forwarded.split(",")]
                try:
                    if len(forwarded) > 2048 or len(parts) > 32:
                        raise ValueError
                    addresses = [ipaddress.ip_address(part) for part in parts]
                except ValueError:
                    await json_response({"error": "Invalid proxy headers."}, 400)(scope, receive, send)
                    return
                client = next((address for address in reversed(addresses) if not self.trusted(address)), peer)
                scope["client"] = (str(client), 0)
            protocols = ",".join(header_values(scope, b"x-forwarded-proto"))
            if protocols:
                values = [part.strip().lower() for part in protocols.split(",")]
                if len(values) > 8 or any(value not in {"http", "https"} for value in values):
                    await json_response({"error": "Invalid proxy headers."}, 400)(scope, receive, send)
                    return
                scope["scheme"] = values[-1]
        hosts = header_values(scope, b"host")
        if len(hosts) != 1:
            await json_response({"error": "Invalid website host."}, 400)(scope, receive, send)
            return
        host = hosts[0].lower()
        if host.endswith(":443"):
            host = host[:-4]
        expected_origin = "https://" + host
        if expected_origin not in self.settings.origins:
            await json_response({"error": "Invalid website host."}, 400)(scope, receive, send)
            return
        scope["care_origin"] = expected_origin
        if not safe_path(scope["path"]):
            await json_response({"error": "Not found."}, 404)(scope, receive, send)
            return
        health = scope["path"] in {"/healthz", "/readyz"} and scope["method"] in {"GET", "HEAD"}
        if scope.get("scheme") != "https" and not health:
            await json_response({"error": "HTTPS is required."}, 400)(scope, receive, send)
            return

        async def secure_send(message):
            if message["type"] == "http.response.start":
                message = dict(message)
                headers = {key.lower(): value for key, value in message.get("headers", [])
                           if key.lower() not in {name.lower().encode() for name in SECURITY_HEADERS}}
                # Preserve repeated Set-Cookie fields if future endpoints need them.
                cookies = [(key, value) for key, value in message.get("headers", []) if key.lower() == b"set-cookie"]
                headers.pop(b"set-cookie", None)
                headers.update({key.lower().encode(): value.encode() for key, value in SECURITY_HEADERS.items()})
                if scope.get("scheme") == "https":
                    headers[b"strict-transport-security"] = b"max-age=31536000"
                message["headers"] = list(headers.items()) + cookies
            await send(message)
        await self.app(scope, receive, secure_send)


async def body(request: Request):
    origins = request.headers.getlist("origin")
    if len(origins) != 1 or origins[0] != request.scope["care_origin"]:
        raise HTTPException(403, "Use the website form to continue.")
    if request.headers.get("sec-fetch-site") not in (None, "same-origin"):
        raise HTTPException(403, "Use the website form to continue.")
    content_types = request.headers.getlist("content-type")
    if len(content_types) != 1 or content_types[0].split(";", 1)[0].strip().lower() != "application/json":
        raise HTTPException(415, "Send a JSON request.")
    lengths = request.headers.getlist("content-length")
    if (len(lengths) > 1 or (lengths and not lengths[0].isdigit())
            or (lengths and request.headers.get("transfer-encoding"))):
        raise HTTPException(400, "Invalid request body.")
    expected = int(lengths[0]) if lengths else None
    if expected is not None and expected > MAX_BODY_BYTES:
        raise HTTPException(413, "Request body is too large.")
    encoded = bytearray()
    try:
        with anyio.fail_after(5):
            async for chunk in request.stream():
                if len(encoded) + len(chunk) > MAX_BODY_BYTES:
                    raise HTTPException(413, "Request body is too large.")
                encoded.extend(chunk)
    except TimeoutError:
        raise HTTPException(408, "The request timed out.") from None
    except ClientDisconnect:
        raise HTTPException(400, "Invalid request body.") from None
    if expected is not None and len(encoded) != expected:
        raise HTTPException(400, "Invalid request body.")
    try:
        def unique_fields(pairs):
            result = {}
            for key, item in pairs:
                if key in result:
                    raise ValueError("Duplicate request fields.")
                result[key] = item
            return result
        value = json.loads(encoded.decode("utf-8"), object_pairs_hook=unique_fields)
    except (ValueError, UnicodeError):
        raise HTTPException(400, "Invalid request body.") from None
    if not isinstance(value, dict):
        raise HTTPException(400, "Invalid request body.")
    return value


def token(request):
    return request.cookies.get(COOKIE_NAME, "")


def set_cookie(response, value, lifetime=SESSION_SECONDS):
    response.set_cookie(COOKIE_NAME, value, max_age=lifetime,
                        expires=0 if not lifetime else None, secure=True,
                        httponly=True, samesite="strict", path="/")


async def session(request):
    user = await run_in_threadpool(request.app.state.auth.session, token(request))
    configuration = await run_in_threadpool(request.app.state.site_settings.get)
    payload = {"authenticated": True, "user": user} if user else {"authenticated": False}
    return json_response({**payload, "beta_enabled": configuration["beta_enabled"],
                          "can_manage_site": is_owner(request, user)})


def is_owner(request, user):
    return bool(user and user["email"] in request.app.state.settings.site_admin_emails)


async def require_owner(request):
    user = await run_in_threadpool(request.app.state.auth.session, token(request))
    if not user:
        raise HTTPException(401, "Log in to manage the website.")
    if not is_owner(request, user):
        raise HTTPException(403, "Only the website owner can manage these settings.")
    return user


async def site_settings(request):
    value = await body(request) if request.method == "POST" else None
    await require_owner(request)
    store = request.app.state.site_settings
    if value is None:
        return json_response(await run_in_threadpool(store.get))
    if (set(value) != {"beta_enabled", "revision"} or type(value["beta_enabled"]) is not bool
            or type(value["revision"]) is not int or not 0 <= value["revision"] <= MAX_REVISION):
        raise HTTPException(400, "Invalid site settings.")
    try:
        updated = await run_in_threadpool(store.update, value["beta_enabled"], value["revision"])
    except SiteSettingsConflict:
        return json_response({"error": "The settings changed. Reload them before saving again."}, 409)
    return json_response(updated)


async def login(request):
    value = await body(request)
    password = value.get("password")
    email = value.get("email")
    if (set(value) != {"email", "password"} or not isinstance(email, str) or len(email) > 254
            or not isinstance(password, str) or len(password) > 1024
            or any(0xD800 <= ord(c) <= 0xDFFF for c in password)):
        raise HTTPException(400, "Invalid request body.")
    peer = request.client.host if request.client else "unknown"
    user, new_token, retry = await anyio.to_thread.run_sync(
        lambda: request.app.state.auth.login(email, password, peer, token(request)),
        limiter=request.app.state.hash_limiter)
    if retry:
        return json_response({"error": "Too many attempts. Please try again later."}, 429, {"Retry-After": str(retry)})
    if not user:
        return json_response({"error": "Email or password is incorrect."}, 401)
    response = json_response({"authenticated": True, "user": user})
    set_cookie(response, new_token)
    return response


async def logout(request):
    if await body(request):
        raise HTTPException(400, "Invalid request body.")
    await run_in_threadpool(request.app.state.auth.logout, token(request))
    response = json_response({"authenticated": False})
    set_cookie(response, "", 0)
    return response


async def access_config(request):
    return json_response(request.app.state.access_requests.config())


async def access_request(request):
    value = await body(request)
    if set(value) - {"name", "email", "website"}:
        raise HTTPException(400, "Invalid request body.")
    peer = request.client.host if request.client else "unknown"
    status, result = await anyio.to_thread.run_sync(
        lambda: request.app.state.access_requests.submit(value, client_ip=client_key(peer)),
        limiter=request.app.state.mail_limiter)
    return json_response(result, status, {"Retry-After": "900"} if status == 429 else None)


async def health(request):
    return json_response({"status": "ok"})


async def ready(request):
    await run_in_threadpool(request.app.state.site_settings.get)
    enabled = await run_in_threadpool(request.app.state.auth.has_enabled_users)
    available = enabled and request.app.state.access_requests.config()["email_delivery_ready"]
    return json_response({"status": "ready" if available else "not_ready"}, 200 if available else 503)


def resource_path(root, relative):
    current = root
    for part in Path(relative).parts:
        current = current / part
        if current.is_symlink():
            raise HTTPException(404, "Not found.")
    if not inside(current.resolve(), root) or not current.is_file():
        raise HTTPException(404, "Not found.")
    return current


async def static_file(request):
    relative = request.url.path.lstrip("/") or "index.html"
    parts = Path(relative).parts
    if relative != "/".join(parts):
        raise HTTPException(404, "Not found.")
    # Keep owner resources private even on case-insensitive filesystems.
    if relative.casefold() in OWNER_FILES and relative not in OWNER_FILES:
        raise HTTPException(404, "Not found.")
    suffix = Path(relative).suffix.lower()
    public = relative in PUBLIC_FILES or relative in PUBLIC_BRANDING
    owner_only = relative in OWNER_FILES
    permitted = (public or owner_only or relative == "library.html"
                 or (len(parts) == 1 and suffix in {".mjs", ".js", ".css"})
                 or (parts[0] == "native" and suffix in {".mjs", ".js", ".css", ".html", ".json"})
                 or (parts[0] == "data" and suffix in {".json", ".jsonpart"})
                 or (parts[:2] == ("assets", "covers") and suffix in IMAGE_SUFFIXES))
    if not permitted:
        raise HTTPException(404, "Not found.")
    configuration = await run_in_threadpool(request.app.state.site_settings.get)
    if not configuration["beta_enabled"] and relative == "index.html":
        destination = "/library.html" + ("?" + request.url.query if request.url.query else "")
        return json_response({"location": destination}, 303, {"Location": destination})
    if owner_only or (not public and configuration["beta_enabled"]):
        user = await run_in_threadpool(request.app.state.auth.session, token(request))
        if not user:
            message = "Log in to manage the website." if owner_only else "Log in to open the library."
            if relative in {"library.html", "site-settings.html"}:
                destination = "/" + relative + ("?" + request.url.query if request.url.query else "")
                return json_response({"error": message}, 303,
                                     {"Location": "/login.html?next=" + quote(destination, safe="")})
            return json_response({"error": message}, 401)
        if owner_only and not is_owner(request, user):
            raise HTTPException(403, "Only the website owner can manage these settings.")
    root = request.app.state.settings.web_root
    resource = "index.html" if relative == "discover.html" else relative
    path = resource_path(root, resource)
    media_type = ("application/json" if suffix in {".json", ".jsonpart"}
                  else "text/javascript" if suffix in {".mjs", ".js"}
                  else mimetypes.guess_type(str(path))[0] or "application/octet-stream")
    headers = {"Vary": "Cookie, Accept-Encoding"}
    if not public:
        headers["X-Robots-Tag"] = "noindex"
    # Built gzip copies are served only after the same authorization checks.
    accepted = request.headers.get("accept-encoding", "")
    if any(item.strip().lower() == "gzip" for item in accepted.split(",")) and Path(str(path) + ".gz").exists():
        path = resource_path(root, resource + ".gz")
        headers["Content-Encoding"] = "gzip"
    return FileResponse(path, media_type=media_type, headers=headers)


async def http_error(request, error):
    return json_response({"error": error.detail}, error.status_code, error.headers)


async def unexpected_error(request, error):
    # No traceback, secrets, provider errors or database paths in responses.
    return json_response({"error": "This service is temporarily unavailable. Please try again shortly."}, 503)


def create_app(*, env=None, settings=None, access_service=None):
    values = dict(os.environ if env is None else env)
    settings = Settings.from_env(values) if settings is None else settings
    auth = AuthStore(settings.database_path, settings.web_root)
    site_configuration = SiteSettingsStore(auth)
    access = access_service or AccessRequestService(settings.database_path, env=values)
    routes = [
        Route("/healthz", health, methods=["GET", "HEAD"]),
        Route("/readyz", ready, methods=["GET", "HEAD"]),
        Route("/api/session", session, methods=["GET", "HEAD"]),
        Route("/api/login", login, methods=["POST"]),
        Route("/api/logout", logout, methods=["POST"]),
        Route("/api/site-settings", site_settings, methods=["GET", "HEAD", "POST"]),
        Route("/api/access-requests/config", access_config, methods=["GET", "HEAD"]),
        Route("/api/access-requests", access_request, methods=["POST"]),
        Route("/{path:path}", static_file, methods=["GET", "HEAD"]),
    ]
    app = Starlette(debug=False, routes=routes,
                    middleware=[Middleware(SecurityBoundary, settings=settings)],
                    exception_handlers={HTTPException: http_error, Exception: unexpected_error})
    app.state.settings, app.state.auth, app.state.access_requests = settings, auth, access
    app.state.site_settings = site_configuration
    # On the initial 512 MB host at most two 32 MiB scrypt operations run at once.
    app.state.hash_limiter = anyio.CapacityLimiter(2)
    app.state.mail_limiter = anyio.CapacityLimiter(2)
    return app
