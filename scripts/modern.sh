#!/usr/bin/env bash
set -euo pipefail

revision=83eb3376109f0676fc8d12c6b2455dd3258c84db
usage() {
  echo 'Usage: npm run modern -- {build|serve|verify} /path/to/horizon-web [port]' >&2
  exit 2
}

[[ $# -ge 2 && $# -le 3 ]] || usage
action=$1
case "$action" in build|serve|verify) ;; *) usage ;; esac
[[ $# == 2 || "$action" == serve ]] || usage
checkout=$(cd "$2" && pwd -P)
launcher=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
case "$checkout/" in "$launcher/"*) echo 'Use a Horizon Web checkout outside the launcher repository.' >&2; exit 1 ;; esac
cd "$checkout"
if [[ "$(git rev-parse HEAD)" != "$revision" ]]; then
  echo "Expected Horizon Web revision $revision. See the launcher README." >&2
  exit 1
fi

verify() {
  python3 - <<'PY'
import hashlib
import json
from pathlib import Path

root = Path("web/dist")
expected = {
    "pkg/horizon-client_bg.wasm", "fs/boot.tar.gz",
    "pkg/horizon-client.js", "main.js", "worker.js", "fs/manifest.txt",
}
try:
    manifest = json.loads((root / "build.json").read_text())
    for name in ("index.html", "audio.js", "sw.js"):
        if not (root / name).is_file():
            raise ValueError(f"missing {name}")
    for name in sorted(expected):
        with (root / name).open("rb") as artifact:
            actual = hashlib.file_digest(artifact, "sha256").hexdigest()[:16]
        if manifest.get(name) != actual:
            raise ValueError(f"build hash mismatch for {name}")
    with (root / "pkg/horizon-client_bg.wasm").open("rb") as wasm:
        if wasm.read(8) != bytes.fromhex("0061736d01000000"):
            raise ValueError("invalid WebAssembly header")
except (OSError, ValueError, AttributeError) as error:
    raise SystemExit(f"Private Horizon Web build incomplete: {error}") from error
print("Verified Horizon Web entry point, WebAssembly and resource build hashes.")
PY
}

case "$action" in
  build)
    resources=${HORIZON_RESOURCES:-.local/horizon-client/26.3}
    if [[ ! -f "$resources/horizon-resources.json" ]]; then
      echo "Prepared Minecraft 26.3 resources are missing in $resources. Follow the private resource setup in README.md." >&2
      exit 1
    fi
    PROFILE=${PROFILE:-fast} DIST=web/dist BUNDLE=1 HORIZON_RESOURCES="$resources" bash web/build.sh
    verify
    ;;
  verify) verify ;;
  serve)
    verify
    exec python3 web/serve.py "${3:-8080}"
    ;;
esac
