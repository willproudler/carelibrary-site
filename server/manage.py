"""Explicit production account administration; run only in the hosting shell."""
from __future__ import annotations

import argparse
import getpass
import sqlite3
import sys

from .auth import AuthStore
from .config import Settings


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    add = commands.add_parser("add-user", help="Create an approved production account")
    add.add_argument("--email", required=True)
    add.add_argument("--name", required=True)
    reset = commands.add_parser("reset-password", help="Reset a password and revoke all sessions")
    reset.add_argument("--email", required=True)
    disable = commands.add_parser("disable-user", help="Disable an account and revoke all sessions")
    disable.add_argument("--email", required=True)
    args = parser.parse_args(argv)
    try:
        settings = Settings.from_env()
        store = AuthStore(settings.database_path, settings.web_root)
        if args.command == "disable-user":
            store.disable_user(args.email)
            print("Production account disabled; all sessions revoked.")
            return 0
        if not sys.stdin.isatty():
            parser.error("Use an interactive hosting terminal to enter the password securely.")
        password = getpass.getpass("New password (at least 12 characters): ")
        if password != getpass.getpass("Confirm password: "):
            parser.error("Passwords do not match.")
        if args.command == "add-user":
            store.add_user(args.email, args.name, password)
            print("Production account created.")
        else:
            store.reset_password(args.email, password)
            print("Password reset; all sessions revoked. Disabled accounts remain disabled.")
    except ValueError as error:
        parser.error(str(error))
    except (OSError, sqlite3.Error):
        parser.error("The private production database could not be opened or updated.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
