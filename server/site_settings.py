"""One durable site mode, independent of accounts, sessions and access requests."""
from __future__ import annotations


MAX_REVISION = (1 << 63) - 2


class SiteSettingsConflict(Exception):
    """Another owner saved a newer revision before this request."""


class SiteSettingsStore:
    def __init__(self, auth):
        self.auth = auth
        with auth.connect() as db:
            db.execute("""CREATE TABLE IF NOT EXISTS site_settings (
                singleton INTEGER PRIMARY KEY CHECK (singleton=1),
                beta_enabled INTEGER NOT NULL CHECK (beta_enabled IN (0,1)),
                revision INTEGER NOT NULL CHECK (revision>=0)
            )""")
            # Additive migration: an existing OFF state or revision is untouched.
            db.execute("INSERT OR IGNORE INTO site_settings VALUES (1,1,0)")
        self.get()

    @staticmethod
    def _value(row):
        if (row is None or type(row["beta_enabled"]) is not int
                or row["beta_enabled"] not in (0, 1)
                or type(row["revision"]) is not int or not 0 <= row["revision"] <= MAX_REVISION + 1):
            raise ValueError("The site settings are unavailable.")
        return {"beta_enabled": bool(row["beta_enabled"]), "revision": row["revision"]}

    def get(self):
        with self.auth.connect(readonly=True) as db:
            row = db.execute("SELECT beta_enabled,revision FROM site_settings WHERE singleton=1").fetchone()
        return self._value(row)

    def update(self, beta_enabled, revision):
        if type(beta_enabled) is not bool or type(revision) is not int or not 0 <= revision <= MAX_REVISION:
            raise ValueError("Invalid site settings.")
        with self.auth.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            current = self._value(db.execute(
                "SELECT beta_enabled,revision FROM site_settings WHERE singleton=1").fetchone())
            if current["revision"] != revision:
                raise SiteSettingsConflict()
            changed = db.execute("""UPDATE site_settings SET beta_enabled=?,revision=revision+1
                WHERE singleton=1 AND revision=?""", (int(beta_enabled), revision)).rowcount
            if changed != 1:
                raise SiteSettingsConflict()
            return {"beta_enabled": beta_enabled, "revision": revision + 1}
