"""Production access requests; persistence and configured outbound email only.

The HTTP server owns origin/body checks and keeps this SQLite database outside
the website root. This module never creates or approves library accounts.
"""
from __future__ import annotations

import hashlib
from contextlib import contextmanager
import ipaddress
import json
import os
from pathlib import Path
import re
import smtplib
import sqlite3
import ssl
import time
from email.message import EmailMessage
from typing import Mapping
import uuid


RECIPIENTS = ("willproudler@gmail.com", "ianwenzelgaray@gmail.com")
PREVIEW_MESSAGE = "Your request was saved, but email delivery is unavailable. Please try again later."
SENT_MESSAGE = "Thank you. Your access request has been sent. We'll get back to you by email."
FAILED_MESSAGE = "Your request was saved, but we could not deliver the email. Please try again."
RATE_LIMIT = 5
RATE_WINDOW_SECONDS = 15 * 60
SENDING_LEASE_SECONDS = 120
SMTP_TIMEOUT_SECONDS = 5

_LOCAL_PART = re.compile(r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+\Z")
_DOMAIN_LABEL = re.compile(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\Z")


def _has_controls(value: str) -> bool:
    # JSON permits escaped lone surrogates, which cannot be encoded as UTF-8 by
    # SQLite or email. Reject these alongside control/newline characters.
    return any(ord(character) < 32 or 0x7F <= ord(character) <= 0x9F
               or 0xD800 <= ord(character) <= 0xDFFF or character in "\u2028\u2029"
               for character in value)


def _email(value: object) -> str:
    if not isinstance(value, str) or len(value) > 254 or _has_controls(value):
        raise ValueError("Enter a valid email address.")
    value = value.strip()
    if value.count("@") != 1:
        raise ValueError("Enter a valid email address.")
    local, domain = value.rsplit("@", 1)
    labels = domain.split(".")
    if (not local or len(local) > 64 or not _LOCAL_PART.fullmatch(local)
            or local.startswith(".") or local.endswith(".") or ".." in local
            or len(labels) < 2 or any(not _DOMAIN_LABEL.fullmatch(label) for label in labels)):
        raise ValueError("Enter a valid email address.")
    return value.lower()


def _loopback(host: str) -> bool:
    if host.lower() == "localhost":
        return True
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return False


def _smtp_configuration(env: Mapping[str, str]) -> dict | None:
    """Treat missing/invalid settings as unconnected; never expose their values."""
    host = env.get("CARE_BETA_SMTP_HOST", "").strip()
    sender = env.get("CARE_BETA_SMTP_FROM", "")
    if not host or not sender or _has_controls(host) or any(c.isspace() for c in host):
        return None
    try:
        sender = _email(sender)
        mode = env.get("CARE_BETA_SMTP_TLS", "starttls").strip().lower()
        port = int(env.get("CARE_BETA_SMTP_PORT", "465" if mode == "ssl" else "587"))
        if mode not in {"starttls", "ssl"} or not 1 <= port <= 65535:
            return None
        if mode == "none" and not _loopback(host):
            return None
        username = env.get("CARE_BETA_SMTP_USERNAME", "")
        password = env.get("CARE_BETA_SMTP_PASSWORD", "")
        if bool(username) != bool(password):
            return None
        return {"host": host, "port": port, "sender": sender, "mode": mode,
                "username": username, "password": password}
    except (TypeError, ValueError):
        return None


class AccessRequestService:
    def __init__(self, db_path: str | Path, *, env: Mapping[str, str] | None = None):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.smtp = _smtp_configuration(os.environ if env is None else env)
        with self._connect() as connection:
            connection.executescript("""
                CREATE TABLE IF NOT EXISTS access_requests (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    status TEXT NOT NULL DEFAULT 'pending',
                    delivery_status TEXT NOT NULL,
                    delivered_recipients TEXT NOT NULL DEFAULT '[]',
                    delivery_attempts INTEGER NOT NULL DEFAULT 0,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL
                );
                CREATE TABLE IF NOT EXISTS access_request_limits (
                    client_key TEXT NOT NULL,
                    requested_at REAL NOT NULL
                );
                CREATE INDEX IF NOT EXISTS access_request_limits_lookup
                    ON access_request_limits(client_key, requested_at);
            """)

    @contextmanager
    def _connect(self):
        connection = sqlite3.connect(self.db_path, timeout=5)
        connection.row_factory = sqlite3.Row
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def config(self) -> dict:
        # Readiness describes configuration, not a verified provider connection.
        return {"email_delivery_ready": self.smtp is not None}

    def _rate_allowed(self, connection, client_ip: str, now: float) -> bool:
        key = hashlib.sha256(str(client_ip or "unknown").encode()).hexdigest()
        connection.execute("DELETE FROM access_request_limits WHERE requested_at <= ?",
                           (now - RATE_WINDOW_SECONDS,))
        count = connection.execute(
            "SELECT COUNT(*) FROM access_request_limits WHERE client_key = ?", (key,)
        ).fetchone()[0]
        if count >= RATE_LIMIT:
            return False
        connection.execute("INSERT INTO access_request_limits VALUES (?, ?)", (key, now))
        return True

    @staticmethod
    def _response(delivered: bool, message: str) -> dict:
        return {"ok": True, "saved": True, "delivered": delivered, "message": message}

    def submit(self, payload: object, client_ip: str = "") -> tuple[int, dict]:
        now = time.time()
        # Count malformed requests as well; callers supply the socket peer, never
        # an untrusted X-Forwarded-For value.
        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            allowed = self._rate_allowed(connection, client_ip, now)
        if not allowed:
            return 429, {"ok": False, "delivered": False,
                         "message": "Too many requests. Please try again in 15 minutes."}
        if not isinstance(payload, dict):
            return 400, {"ok": False, "delivered": False, "message": "Enter your name and email address."}
        if payload.get("website", "") != "":
            return 400, {"ok": False, "delivered": False, "message": "Unable to accept this request."}
        name = payload.get("name")
        if (not isinstance(name, str) or not 1 <= len(name) <= 120
                or not name.strip() or _has_controls(name)):
            return 400, {"ok": False, "delivered": False, "message": "Enter your name (up to 120 characters)."}
        name = name.strip()
        try:
            email = _email(payload.get("email"))
        except ValueError as error:
            return 400, {"ok": False, "delivered": False, "message": str(error)}

        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            previous = connection.execute("SELECT * FROM access_requests WHERE email = ?", (email,)).fetchone()
            if previous and previous["delivery_status"] == "delivered":
                return 200, self._response(True, SENT_MESSAGE)
            if (previous and previous["delivery_status"] == "sending"
                    and previous["updated_at"] > now - SENDING_LEASE_SECONDS):
                return 202, self._response(False, "Your request is saved and email delivery is in progress. Please check again shortly.")
            request_id = previous["id"] if previous else uuid.uuid4().hex
            delivered = json.loads(previous["delivered_recipients"]) if previous else []
            delivery_status = "sending" if self.smtp else "unconfigured"
            if previous:
                connection.execute(
                    "UPDATE access_requests SET name = ?, delivery_status = ?, updated_at = ? WHERE id = ?",
                    (name, delivery_status, now, request_id),
                )
            else:
                connection.execute(
                    "INSERT INTO access_requests (id, name, email, delivery_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                    (request_id, name, email, delivery_status, now, now),
                )
            if self.smtp:
                connection.execute("UPDATE access_requests SET delivery_attempts = delivery_attempts + 1 WHERE id = ?", (request_id,))
        if not self.smtp:
            return 503, {**self._response(False, PREVIEW_MESSAGE), "ok": False}

        pending_recipients = [address for address in RECIPIENTS if address not in delivered]
        try:
            refused = self._send(name, email, request_id, pending_recipients)
            delivered.extend(address for address in pending_recipients if address not in refused)
        except (OSError, smtplib.SMTPException, ValueError):
            # Provider errors can contain passwords or message content. Persist
            # only delivery state and never log or return the exception.
            pass
        complete = all(address in delivered for address in RECIPIENTS)
        with self._connect() as connection:
            connection.execute(
                "UPDATE access_requests SET delivery_status = ?, delivered_recipients = ?, updated_at = ? WHERE id = ?",
                ("delivered" if complete else "failed", json.dumps(delivered), time.time(), request_id),
            )
        if complete:
            return 200, self._response(True, SENT_MESSAGE)
        return 503, {**self._response(False, FAILED_MESSAGE), "ok": False}

    def _send(self, name: str, email: str, request_id: str, recipients: list[str]) -> dict:
        configuration = self.smtp
        if not configuration:
            raise ValueError("Email delivery is not configured.")
        message = EmailMessage()
        message["Subject"] = "Care Library beta access request"
        message["From"] = configuration["sender"]
        message["To"] = ", ".join(RECIPIENTS)
        message["Reply-To"] = email
        message["Message-ID"] = f"<care-beta-access-{request_id}@{configuration['sender'].rsplit('@', 1)[1]}>"
        message.set_content(f"A visitor has requested access to the Care Library beta.\n\nName: {name}\nEmail: {email}\n\nThis request is pending review. No library account has been created or approved.\n")
        context = ssl.create_default_context()
        if configuration["mode"] == "ssl":
            client = smtplib.SMTP_SSL(configuration["host"], configuration["port"],
                                      timeout=SMTP_TIMEOUT_SECONDS, context=context)
        else:
            client = smtplib.SMTP(configuration["host"], configuration["port"], timeout=SMTP_TIMEOUT_SECONDS)
        try:
            client.ehlo()
            if configuration["mode"] == "starttls":
                client.starttls(context=context)
                client.ehlo()
            if configuration["username"]:
                client.login(configuration["username"], configuration["password"])
            # Only these fixed server-side recipients receive mail. The visitor
            # email is Reply-To, never an envelope destination or sender.
            return client.send_message(message, from_addr=configuration["sender"], to_addrs=recipients)
        finally:
            # Failure while closing must not turn an acknowledged delivery into
            # a retry that would email the recipients twice.
            try:
                client.quit()
            except (OSError, smtplib.SMTPException):
                try:
                    client.close()
                except (OSError, smtplib.SMTPException):
                    pass
