"""Fresh production accounts, durable throttling and revocable opaque sessions."""
from __future__ import annotations

from contextlib import contextmanager
import hashlib
import hmac
import ipaddress
import math
import os
from pathlib import Path
import secrets
import sqlite3
import stat
import time

from .access_requests import _email, _has_controls
from .config import absolute_path, inside


SESSION_SECONDS = 8 * 60 * 60
SCRYPT_N, SCRYPT_R, SCRYPT_P = 32768, 8, 3
RATE_WINDOW = 15 * 60
ACCOUNT_ATTEMPTS, IP_ATTEMPTS = 5, 30
SCHEMA = "care-production-auth/1"


def password_hash(password: str, salt: bytes, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P) -> bytes:
    if (n, r, p) != (SCRYPT_N, SCRYPT_R, SCRYPT_P):
        raise ValueError("Unsupported password parameters.")
    return hashlib.scrypt(password.encode("utf-8"), salt=salt, n=n, r=r, p=p,
                          dklen=32, maxmem=64 * 1024 * 1024)


def validate_password(password):
    if (not isinstance(password, str) or not 12 <= len(password) <= 1024
            or any(0xD800 <= ord(c) <= 0xDFFF for c in password)):
        raise ValueError("Use a password of 12 to 1024 characters.")


def client_key(value):
    try:
        address = ipaddress.ip_address(value)
        # IPv6 clients cannot bypass limits by rotating addresses in one /64.
        return str(ipaddress.ip_network(str(address) + "/64", strict=False)) if address.version == 6 else str(address)
    except ValueError:
        return "unknown"


class AuthStore:
    def __init__(self, database, web_root):
        self.path = absolute_path(str(database), "CARE_DATABASE_PATH")
        if inside(self.path, Path(web_root).resolve()):
            raise ValueError("The production database must stay outside the web root.")
        self.path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        parent = self.path.parent.stat()
        if parent.st_uid != os.getuid() or stat.S_IMODE(parent.st_mode) != 0o700:
            raise ValueError("The private database directory must be owned by the service user with permissions 0700.")
        try:
            fd = os.open(str(self.path), os.O_CREAT | os.O_EXCL | os.O_WRONLY | os.O_NOFOLLOW, 0o600)
            os.close(fd)
        except FileExistsError:
            pass
        info = self.path.lstat()
        if (not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid()
                or stat.S_IMODE(info.st_mode) != 0o600 or info.st_nlink != 1):
            raise ValueError("The production database must be a private, unlinked 0600 file owned by the service user.")
        for suffix in ("-wal", "-shm", "-journal"):
            if Path(str(self.path) + suffix).is_symlink():
                raise ValueError("Database sidecars must not be symlinks.")
        with self.connect() as db:
            names = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            if names and "care_metadata" not in names:
                raise ValueError("Use a fresh production database; local preview accounts are not imported.")
            if "care_metadata" in names:
                marker = db.execute("SELECT value FROM care_metadata WHERE key='schema'").fetchone()
                if not marker or marker[0] != SCHEMA:
                    raise ValueError("Unsupported production account database.")
            db.execute("PRAGMA journal_mode=WAL")
            db.executescript("""
                CREATE TABLE IF NOT EXISTS care_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS users (
                    email TEXT PRIMARY KEY, name TEXT NOT NULL,
                    salt BLOB NOT NULL, password_hash BLOB NOT NULL,
                    algorithm TEXT NOT NULL, n INTEGER NOT NULL, r INTEGER NOT NULL, p INTEGER NOT NULL,
                    enabled INTEGER NOT NULL DEFAULT 1, password_version INTEGER NOT NULL DEFAULT 1,
                    created_at REAL NOT NULL
                );
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY, email TEXT NOT NULL REFERENCES users(email),
                    expires_at REAL NOT NULL, created_at REAL NOT NULL
                );
                CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
                CREATE INDEX IF NOT EXISTS sessions_user ON sessions(email);
                CREATE TABLE IF NOT EXISTS login_attempts (
                    scope TEXT PRIMARY KEY, count INTEGER NOT NULL, started_at REAL NOT NULL
                );
                CREATE INDEX IF NOT EXISTS login_attempts_expiry ON login_attempts(started_at);
            """)
            db.execute("INSERT OR IGNORE INTO care_metadata VALUES ('schema', ?)", (SCHEMA,))
        self.dummy_salt = secrets.token_bytes(16)
        self.dummy_hash = password_hash(secrets.token_urlsafe(32), self.dummy_salt)

    @contextmanager
    def connect(self, readonly=False):
        name = self.path.as_uri() + "?mode=ro" if readonly else str(self.path)
        db = sqlite3.connect(name, uri=readonly, timeout=10)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        try:
            with db:
                yield db
        finally:
            db.close()

    def add_user(self, email, name, password):
        email = _email(email)
        if not isinstance(name, str) or not 1 <= len(name.strip()) <= 100 or _has_controls(name):
            raise ValueError("Enter a name of 1 to 100 characters.")
        validate_password(password)
        salt = secrets.token_bytes(16)
        encoded = password_hash(password, salt)
        try:
            with self.connect() as db:
                db.execute("""INSERT INTO users(email,name,salt,password_hash,algorithm,n,r,p,created_at)
                    VALUES (?,?,?,?,?,?,?,?,?)""", (email, name.strip(), salt, encoded,
                    "scrypt", SCRYPT_N, SCRYPT_R, SCRYPT_P, time.time()))
        except sqlite3.IntegrityError as error:
            raise ValueError("That production account already exists.") from error
        return {"email": email, "name": name.strip()}

    def reset_password(self, email, password):
        email = _email(email)
        validate_password(password)
        salt = secrets.token_bytes(16)
        encoded = password_hash(password, salt)
        with self.connect() as db:
            changed = db.execute("""UPDATE users SET salt=?,password_hash=?,algorithm='scrypt',
                n=?,r=?,p=?,password_version=password_version+1 WHERE email=?""",
                (salt, encoded, SCRYPT_N, SCRYPT_R, SCRYPT_P, email)).rowcount
            if not changed:
                raise ValueError("That production account does not exist.")
            db.execute("DELETE FROM sessions WHERE email=?", (email,))
            db.execute("DELETE FROM login_attempts WHERE scope=?", (self._account_scope(email),))

    def disable_user(self, email):
        email = _email(email)
        with self.connect() as db:
            changed = db.execute("UPDATE users SET enabled=0,password_version=password_version+1 WHERE email=?", (email,)).rowcount
            if not changed:
                raise ValueError("That production account does not exist.")
            db.execute("DELETE FROM sessions WHERE email=?", (email,))

    def has_enabled_users(self):
        with self.connect(readonly=True) as db:
            return db.execute("SELECT 1 FROM users WHERE enabled=1 LIMIT 1").fetchone() is not None

    @staticmethod
    def token_hash(token):
        return hashlib.sha256(token.encode("ascii")).hexdigest()

    def session(self, token):
        if not isinstance(token, str) or not 20 <= len(token) <= 128 or not token.isascii():
            return None
        with self.connect(readonly=True) as db:
            row = db.execute("""SELECT users.email,users.name FROM sessions JOIN users USING(email)
                WHERE token_hash=? AND expires_at>? AND enabled=1""",
                (self.token_hash(token), time.time())).fetchone()
        return dict(row) if row else None

    @staticmethod
    def _account_scope(email):
        return "account:" + hashlib.sha256(email.encode("utf-8")).hexdigest()

    def _reserve_attempt(self, email, peer):
        now = time.time()
        scopes = ((self._account_scope(email), ACCOUNT_ATTEMPTS),
                  ("ip:" + hashlib.sha256(client_key(peer).encode()).hexdigest(), IP_ATTEMPTS))
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute("DELETE FROM login_attempts WHERE started_at<=?", (now - RATE_WINDOW,))
            retries = []
            for scope, limit in scopes:
                row = db.execute("SELECT count,started_at FROM login_attempts WHERE scope=?", (scope,)).fetchone()
                if row and row["count"] >= limit:
                    retries.append(max(1, math.ceil(row["started_at"] + RATE_WINDOW - now)))
            if retries:
                return max(retries)
            for scope, _ in scopes:
                db.execute("""INSERT INTO login_attempts VALUES (?,1,?)
                    ON CONFLICT(scope) DO UPDATE SET count=count+1""", (scope, now))
        return 0

    def login(self, email, password, client_ip, previous_token=""):
        try:
            email = _email(email)
        except ValueError:
            email = ""
        retry = self._reserve_attempt(email, client_ip)
        if retry:
            return None, None, retry
        with self.connect(readonly=True) as db:
            row = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        usable = (row is not None and row["enabled"] == 1 and row["algorithm"] == "scrypt"
                  and (row["n"], row["r"], row["p"]) == (SCRYPT_N, SCRYPT_R, SCRYPT_P))
        encoded = password_hash(password, row["salt"] if usable else self.dummy_salt)
        expected = row["password_hash"] if usable else self.dummy_hash
        if not hmac.compare_digest(encoded, expected) or not usable:
            return None, None, 0
        token = secrets.token_urlsafe(32)
        now = time.time()
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            # Reset/disable racing with hashing must invalidate this attempt.
            current = db.execute("SELECT enabled,password_version FROM users WHERE email=?", (email,)).fetchone()
            if not current or not current["enabled"] or current["password_version"] != row["password_version"]:
                return None, None, 0
            db.execute("DELETE FROM sessions WHERE expires_at<=?", (now,))
            if isinstance(previous_token, str) and previous_token.isascii() and len(previous_token) <= 128:
                db.execute("DELETE FROM sessions WHERE token_hash=?", (self.token_hash(previous_token),))
            db.execute("INSERT INTO sessions VALUES (?,?,?,?)",
                       (self.token_hash(token), email, now + SESSION_SECONDS, now))
            db.execute("DELETE FROM login_attempts WHERE scope=?", (self._account_scope(email),))
        return {"email": row["email"], "name": row["name"]}, token, 0

    def logout(self, token):
        if isinstance(token, str) and token.isascii() and len(token) <= 128:
            with self.connect() as db:
                db.execute("DELETE FROM sessions WHERE token_hash=?", (self.token_hash(token),))
