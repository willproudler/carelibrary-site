"""Cache only public assets at the edge; revalidate mode-dependent readings."""
from __future__ import annotations

from datetime import timezone
from email.utils import parsedate_to_datetime
from hashlib import sha256


NO_STORE = "no-store"
PUBLIC_ASSET = "public, max-age=0, s-maxage=86400, must-revalidate"
REVALIDATE_READING = "private, max-age=0, must-revalidate, no-transform"
CACHE_POLICIES = frozenset({NO_STORE, PUBLIC_ASSET, REVALIDATE_READING})


def scoped_etag(file_etag: str, resource: str, revision: int | None) -> str:
    # FileResponse's validator covers the selected identity/gzip file. Include
    # the resource and live mode revision so a prior full-text validator cannot
    # turn a newly restricted metadata response into a misleading 304.
    value = f"{file_etag}\0{resource}\0{revision}".encode("utf-8")
    return '"' + sha256(value).hexdigest() + '"'


def not_modified(request_headers, response_headers) -> bool:
    """Evaluate GET/HEAD validators after the caller has checked authorization."""
    values = request_headers.getlist("if-none-match")
    if values:
        # If-None-Match takes precedence even when it does not match. Our own
        # validators are quoted hex, so commas inside opaque tags cannot match.
        candidate = response_headers["etag"]
        return any(tag.strip().removeprefix("W/") in {"*", candidate}
                   for value in values for tag in value.split(","))
    value = request_headers.get("if-modified-since")
    if not value:
        return False
    try:
        since = parsedate_to_datetime(value)
        modified = parsedate_to_datetime(response_headers["last-modified"])
        if since.tzinfo is None:
            since = since.replace(tzinfo=timezone.utc)
        return since >= modified
    except (ValueError, TypeError, OverflowError):
        return False
