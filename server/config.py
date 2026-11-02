"""Explicit production configuration; no development paths or secret defaults."""
from __future__ import annotations

from dataclasses import dataclass
import ipaddress
import os
from pathlib import Path
import re
from urllib.parse import urlsplit

from .access_requests import _email, _has_controls


def inside(path: Path, directory: Path) -> bool:
    try:
        path.relative_to(directory)
        return True
    except ValueError:
        return False


def absolute_path(value: str, name: str) -> Path:
    if not isinstance(value, str) or not value or not Path(value).is_absolute():
        raise ValueError(name + " must be an explicit absolute path.")
    path = Path(value)
    for component in (path, *path.parents):
        if component.is_symlink():
            raise ValueError(name + " must not contain symlinks.")
    return path.resolve()


def origin(value: str) -> str:
    if (not isinstance(value, str) or not value or not value.isascii()
            or any(ord(c) <= 32 or ord(c) == 127 for c in value)):
        raise ValueError("Origins must be explicit HTTPS domain origins.")
    try:
        parsed = urlsplit(value)
        host = parsed.hostname or ""
        port = parsed.port
    except ValueError as error:
        raise ValueError("Origins must be explicit HTTPS domain origins.") from error
    labels = host.split(".")
    if (parsed.scheme != "https" or parsed.username or parsed.password
            or port not in (None, 443) or parsed.path not in ("", "/")
            or parsed.query or parsed.fragment or len(host) > 253 or len(labels) < 2
            or any(not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", label) for label in labels)):
        raise ValueError("Origins must be explicit HTTPS domain origins.")
    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        raise ValueError("Use a domain name for the production origin.")
    return "https://" + host


@dataclass(frozen=True)
class Settings:
    web_root: Path
    database_path: Path
    public_origin: str
    origins: frozenset[str]
    trusted_proxies: tuple
    site_admin_emails: frozenset[str] = frozenset()

    @classmethod
    def from_env(cls, env=None):
        values = os.environ if env is None else env
        web_root = absolute_path(values.get("CARE_WEB_ROOT", ""), "CARE_WEB_ROOT")
        if (not web_root.is_dir() or (web_root / ".git").exists()
                or (web_root / "server").exists() or (web_root / "tools").exists()):
            raise ValueError("CARE_WEB_ROOT must point to the built website directory, not the repository.")
        if not (web_root / "index.html").is_file():
            raise ValueError("The built website must contain index.html.")
        database = absolute_path(values.get("CARE_DATABASE_PATH", ""), "CARE_DATABASE_PATH")
        if inside(database, web_root):
            raise ValueError("CARE_DATABASE_PATH must be outside the built website.")
        public_origin = origin(values.get("CARE_PUBLIC_ORIGIN", ""))
        extras = values.get("CARE_ADDITIONAL_ORIGINS", "")
        if not isinstance(extras, str):
            raise ValueError("CARE_ADDITIONAL_ORIGINS must be comma-separated HTTPS origins.")
        origins = frozenset([public_origin, *(origin(item.strip()) for item in extras.split(",") if item.strip())])
        if len(origins) > 6:
            raise ValueError("At most six explicit website origins are supported.")
        proxies = []
        for item in values.get("CARE_TRUSTED_PROXY_CIDRS", "").split(","):
            if not item.strip():
                continue
            try:
                network = ipaddress.ip_network(item.strip(), strict=False)
            except ValueError as error:
                raise ValueError("CARE_TRUSTED_PROXY_CIDRS must contain explicit IP networks.") from error
            if network.prefixlen == 0:
                raise ValueError("Trusting every proxy address is forbidden.")
            proxies.append(network)
        admins = values.get("CARE_SITE_ADMIN_EMAILS", "")
        if not isinstance(admins, str) or len(admins) > 4096 or _has_controls(admins):
            raise ValueError("CARE_SITE_ADMIN_EMAILS must contain explicit email addresses.")
        try:
            admin_emails = frozenset(_email(item) for item in admins.split(",")) if admins.strip() else frozenset()
        except ValueError:
            raise ValueError("CARE_SITE_ADMIN_EMAILS must contain explicit email addresses.") from None
        if len(admin_emails) > 32 or any("*" in email for email in admin_emails):
            raise ValueError("CARE_SITE_ADMIN_EMAILS must contain at most 32 explicit email addresses.")
        return cls(web_root, database, public_origin, origins, tuple(proxies), admin_emails)
