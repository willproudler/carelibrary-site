#!/bin/zsh
set -eu

care_beta_dir="${0:A:h}"
exec "$care_beta_dir/../../.venv/bin/python" "$care_beta_dir/tools/preview-local.py"
