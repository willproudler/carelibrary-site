"""Open the built CARE website with an isolated local preview account."""
from __future__ import annotations

import errno
import secrets
import socket
import subprocess
import sys
from pathlib import Path

import uvicorn
from starlette.responses import JSONResponse, RedirectResponse


SITE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SITE))
from server.app import COOKIE_NAME, create_app
from server.config import Settings


HOST = "127.0.0.1"
PORT = 8876
URL = f"http://{HOST}:{PORT}/library.html"
PREVIEW_HOST = b"care-preview.test"
PREVIEW_ORIGIN = "https://care-preview.test"
LOCAL_ORIGIN = f"http://{HOST}:{PORT}".encode()
PREVIEW_ACCOUNT = "preview@care-preview.test"
ACCOUNT_PAGES = {"/login.html", "/request-access.html", "/site-settings.html"}


def make_preview(web_root: Path, database: Path):
    settings = Settings(web_root, database, PREVIEW_ORIGIN, frozenset({PREVIEW_ORIGIN}), ())
    site = create_app(env={}, settings=settings)
    password = secrets.token_urlsafe(32)
    auth = site.state.auth
    if auth.has_enabled_users():
        auth.reset_password(PREVIEW_ACCOUNT, password)
    else:
        auth.add_user(PREVIEW_ACCOUNT, "Local preview", password)
    user, session_token, _ = auth.login(PREVIEW_ACCOUNT, password, HOST)
    if not user or not session_token:
        raise RuntimeError("The local preview account could not sign in.")
    cookie = f"{COOKIE_NAME}={session_token}".encode()

    async def preview(scope, receive, send):
        if scope["type"] != "http":
            await site(scope, receive, send)
            return
        host = [value for key, value in scope["headers"] if key == b"host"]
        if scope["client"][0] != HOST or host != [f"{HOST}:{PORT}".encode()]:
            await JSONResponse({"error": "This preview is local to your Mac."}, 403)(scope, receive, send)
            return
        path = scope["path"].casefold()
        studio = path in {"/api/studio/drafts", "/api/studio/binder"} or path.startswith("/api/studio/drafts/")
        search = path == "/api/library/search"
        writing = scope["method"] not in {"GET", "HEAD"}
        aq = path == "/api/numo/aq" and not writing
        origins = [value for key, value in scope["headers"] if key == b"origin"]
        if (writing and (not (studio or search) or origins != [LOCAL_ORIGIN])
                or path.startswith("/api/") and not (studio or search or aq) and path != "/api/session"):
            await JSONResponse({"error": "Account actions are unavailable in the local preview."}, 403)(scope, receive, send)
            return
        if path in ACCOUNT_PAGES:
            await RedirectResponse("/library.html", 303)(scope, receive, send)
            return
        # The preview's browser never receives a reusable account cookie.
        headers = [(key, value) for key, value in scope["headers"] if key not in {b"host", b"cookie", b"origin"}]
        headers.extend([(b"host", PREVIEW_HOST), (b"cookie", cookie)])
        if writing:
            headers.append((b"origin", PREVIEW_ORIGIN.encode()))

        async def preview_send(message):
            if path == "/api/session" and message["type"] == "http.response.start":
                message = {**message, "headers": [*message.get("headers", []), (b"x-care-local-preview", b"1")]}
            await send(message)

        await site({**scope, "scheme": "https", "headers": headers}, receive, preview_send)

    return preview


class PreviewServer(uvicorn.Server):
    async def startup(self, sockets=None):
        await super().startup(sockets=sockets)
        if self.started:
            print(f"\nCARE Library Beta preview: {URL}\nKeep this window open while browsing. Press Control-C to stop.\n", flush=True)
            subprocess.run(["/usr/bin/open", URL], check=False)


def main():
    web_root = (SITE / "dist").resolve()
    if not (web_root / "data/catalogue.json").is_file():
        raise SystemExit("Build the CARE Library website before opening the preview.")
    database = SITE / ".care-beta" / "browser-preview" / "preview.sqlite3"
    # Reserve the port before rotating the local login. Starting a second
    # launcher must never revoke the session of the already-running preview.
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            listener.bind((HOST, PORT))
            listener.listen()
        except OSError as error:
            if error.errno != errno.EADDRINUSE:
                raise
            raise SystemExit(
                "CARE Beta Preview is already running. In its Terminal window, "
                "press Control-C, then reopen this launcher."
            ) from None
        preview = make_preview(web_root, database)
        config = uvicorn.Config(preview, host=HOST, port=PORT, proxy_headers=False, access_log=False)
        PreviewServer(config).run(sockets=[listener])


if __name__ == "__main__":
    main()
