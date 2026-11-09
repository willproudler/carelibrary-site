"""Copy the desktop's portable Studio retrieval and counterpoint engines."""
from pathlib import Path
import shutil
import sys


def main():
    site = Path(__file__).resolve().parents[1]
    workspace = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else site.parents[1]
    for name in ("writing_search.py", "writing_search_challenges.py"):
        shutil.copyfile(workspace / "care_platform" / name, site / "server" / name)


if __name__ == "__main__":
    main()
