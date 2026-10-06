#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Build a fully self-contained single-file version of the THshaper store.
Inlines CSS, JS, and all images as base64 data URIs so that the page works
even when served as a lone static HTML snapshot (no sibling files).
"""
import base64
import io
import os
import re
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(ROOT, "images")
OUT = os.path.join(ROOT, "THshaper.html")

MAX_SIDE = 700          # px, longest side for product photos
JPEG_QUALITY = 82


def to_data_uri(path, max_side=MAX_SIDE, force_jpeg=True):
    """Compress an image and return a base64 data URI."""
    img = Image.open(path)
    has_alpha = img.mode in ("RGBA", "LA", "P")
    img = img.convert("RGBA") if has_alpha else img.convert("RGB")

    w, h = img.size
    scale = min(1.0, max_side / float(max(w, h)))
    if scale < 1.0:
        img = img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)

    buf = io.BytesIO()
    if has_alpha and not force_jpeg:
        img.save(buf, format="PNG", optimize=True)
        mime = "image/png"
    else:
        # flatten alpha onto white so JPEG looks clean
        if has_alpha:
            bg = Image.new("RGB", img.size, (255, 255, 255))
            bg.paste(img, mask=img.split()[-1])
            img = bg
        img.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
        mime = "image/jpeg"

    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return "data:%s;base64,%s" % (mime, b64), len(buf.getvalue())


def read(name):
    with open(os.path.join(ROOT, name), "r", encoding="utf-8") as f:
        return f.read()


def main():
    html = read("index.html")
    css = read("style.css")
    data_js = read("data.js")
    app_js = read("app.js")

    total = 0

    # ---- product images -> data URIs inside data.js ----
    # Auto-discover every "images/product-N.png" reference so new products
    # (and removed ones) are handled without editing this script.
    refs = sorted(set(re.findall(r"images/product-\d+\.png", data_js)))
    for rel in refs:
        path = os.path.join(ROOT, rel.replace("/", os.sep))
        if not os.path.exists(path):
            print("WARNING: missing image file ->", rel)
            continue
        uri, size = to_data_uri(path)
        total += size
        data_js = data_js.replace('"%s"' % rel, '"%s"' % uri)

    # ---- logo -> data URI ----
    logo_uri, logo_size = to_data_uri(
        os.path.join(IMAGES, "logo.png"), max_side=260, force_jpeg=False
    )
    total += logo_size
    html = html.replace("images/logo.png", logo_uri)

    # ---- inline CSS ----
    html = html.replace(
        '<link rel="stylesheet" href="style.css">',
        "<style>\n%s\n</style>" % css,
    )

    # ---- inline JS ----
    html = html.replace(
        '<script src="data.js"></script>\n    <script src="app.js"></script>',
        "<script>\n%s\n</script>\n    <script>\n%s\n</script>" % (data_js, app_js),
    )

    with open(OUT, "w", encoding="utf-8") as f:
        f.write(html)

    kb = os.path.getsize(OUT) / 1024.0
    print("wrote %s (%.0f KB)  images-inlined=%.0f KB" % (OUT, kb, total / 1024.0))
    # sanity: no leftover external local refs
    for bad in ("images/product-", "images/logo.png", 'href="style.css"', 'src="data.js"', 'src="app.js"'):
        if bad in html:
            print("WARNING: leftover reference ->", bad)


if __name__ == "__main__":
    main()
