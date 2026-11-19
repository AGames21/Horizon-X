"""Install Horizon X loading styles and the optional HUD in a private build."""
from pathlib import Path
from shutil import copyfile
import sys


root = Path(sys.argv[1])
page = root / "index.html"
entries = {
    "</head>": '<link rel="stylesheet" href="./horizon-x-loading.css">',
    "</body>": '<script type="module" src="./horizon-x-hud.js"></script>',
}
html = page.read_text(encoding="utf-8")
if any(html.count(tag) != 1 for tag in entries):
    raise SystemExit("The Horizon Web entry point has an unexpected format.")
for source, output in (
    ("horizon-hud.js", "horizon-x-hud.js"),
    ("horizon-loading.css", "horizon-x-loading.css"),
):
    copyfile(Path(__file__).with_name(source), root / output)
for tag, entry in entries.items():
    if entry not in html:
        html = html.replace(tag, f"{entry}\n{tag}")
page.write_text(html, encoding="utf-8")
