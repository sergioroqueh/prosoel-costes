#!/usr/bin/env python3
"""Genera un lector REBT estático desde la API oficial de legislación consolidada BOE.
No sintetiza, cambia ni corrige el texto legal: conserva la última versión vigente
de cada bloque, sus párrafos, tablas, notas e imágenes publicadas por la AEBOE.
El texto consolidado es INFORMATIVO; la fuente jurídica primaria es el BOE oficial.
"""
import argparse
import base64
import datetime as dt
import hashlib
import html
import json
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

DOCUMENT = "BOE-A-2002-18099"
SOURCE = "https://www.boe.es/buscar/act.php?id=" + DOCUMENT
API = "https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/" + DOCUMENT + "/texto"
SAFE_TAGS = {"p", "div", "span", "blockquote", "br", "strong", "em", "b", "i",
             "u", "sup", "sub", "h2", "h3", "h4", "ul", "ol", "li", "table",
             "thead", "tbody", "tfoot", "tr", "td", "th", "caption", "img",
             "ins", "del", "small"}
SAFE_ATTRS = {"class", "colspan", "rowspan", "scope", "alt", "title", "width", "height"}
VOID = {"img", "br"}
ART = re.compile(r"^Art[ií]culo\s+(\d+)\b", re.I)
ITC = re.compile(r"\bITC[\s-]*BT[\s-]*(\d{1,2})\b", re.I)


def request_xml(url):
    req = urllib.request.Request(
        url, headers={"User-Agent": "PROSOEL-Costes-REBT-Reader/1.0 (+https://github.com/sergioroqueh/prosoel-costes)",
                      "Accept": "application/xml, text/xml;q=0.9"})
    with urllib.request.urlopen(req, timeout=100) as response:
        if response.status != 200:
            raise RuntimeError(f"BOE API returned HTTP {response.status}")
        raw = response.read(70_000_001)
    if len(raw) > 70_000_000:
        raise RuntimeError("Unexpected oversized BOE response")
    if not raw.lstrip().startswith(b"<?xml") and not raw.lstrip().startswith(b"<response"):
        raise RuntimeError("BOE did not return expected XML")
    return ET.fromstring(raw), raw


def local_name(tag):
    return tag.split("}", 1)[-1].lower() if isinstance(tag, str) else ""


def safe_text(text):
    return html.escape(text or "", quote=False)


def plain(element):
    return " ".join(" ".join(element.itertext()).split())


def determine_id(node):
    title = node.get("titulo", "").strip()
    block_id = node.get("id", "")
    if re.match(r"^Art[ií]culo\s+[uú]nico\b", title, re.I):
        return None
    a = ART.match(title)
    if a and 1 <= int(a.group(1)) <= 29:
        return f"N-ART-{int(a.group(1)):02d}"
    itc = ITC.search(title)
    if itc and 1 <= int(itc.group(1)) <= 52:
        return f"N-ITC-{int(itc.group(1)):02d}"
    # El id del BOE sirve de respaldo cuando el título incorpora descripción.
    itc_id = re.fullmatch(r"ib-(\d{1,2})", block_id)
    if itc_id and 1 <= int(itc_id.group(1)) <= 52:
        return f"N-ITC-{int(itc_id.group(1)):02d}"
    return None


def latest_version(block, now):
    versions = block.findall("version")
    def version_date(v):
        return v.get("fecha_vigencia") or v.get("fecha_publicacion") or "00000000"
    valid = [v for v in versions if version_date(v) <= now]
    if not valid:
        return None
    return max(valid, key=lambda v: (version_date(v), v.get("fecha_publicacion") or ""))


def image_src(src, figures):
    if not src or not src.startswith("data:image/png;base64,"):
        return None
    b64 = src.split(",", 1)[1]
    try:
        data = base64.b64decode(b64, validate=True)
    except (ValueError, base64.binascii.Error):
        return None
    if len(data) > 8_000_000 or not data.startswith(b"\x89PNG\r\n\x1a\n"):
        return None
    digest = hashlib.sha256(data).hexdigest()[:24]
    target = figures / (digest + ".png")
    if not target.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    return "./rebt_figures/" + target.name


def render_node(el, figures):
    tag = local_name(el.tag)
    body = safe_text(el.text)
    for child in el:
        body += render_node(child, figures)
        body += safe_text(child.tail)
    if tag not in SAFE_TAGS:
        return body
    if tag == "img":
        src = image_src(el.get("src"), figures)
        if not src:
            return ""
        attrs = [('src',src)]
        if el.get("alt"):
            attrs.append(("alt",el.get("alt")))
        return "<img " + " ".join(f'{name}="{html.escape(value, quote=True)}"' for name,value in attrs) + ">"
    if tag in VOID:
        return f"<{tag}>"
    attrs = []
    for key,value in el.attrib.items():
        if key not in SAFE_ATTRS:
            continue
        if key == "class":
            value = " ".join(token for token in value.split() if re.fullmatch(r"[A-Za-z0-9_-]+", token))
        elif key in ("rowspan","colspan","height","width"):
            value = value if re.fullmatch(r"\d{1,4}", value) else ""
        if value:
            attrs.append(f'{key}="{html.escape(value, quote=True)}"')
    return f'<{tag}{(" " + " ".join(attrs)) if attrs else ""}>{body}</{tag}>'


def generate(root, destination, figures, today):
    code = root.findtext(".//status/code")
    if code != "200":
        raise RuntimeError(f"BOE API status not OK: {code}")
    blocks = root.findall(".//texto/bloque")
    if not blocks:
        raise RuntimeError("BOE API did not return texto/bloque")
    entries = {}
    counts = {"found": len(blocks), "no_latest": 0, "matched": 0}
    for node in blocks:
        uid = determine_id(node)
        if not uid:
            continue
        version = latest_version(node, today)
        if version is None:
            counts["no_latest"] += 1
            continue
        if node.get("fecha_caducidad") and node.get("fecha_caducidad") <= today:
            continue
        text = plain(version)
        if len(text) < 40:
            raise RuntimeError(f"Unexpected empty regulatory block: {uid} ({node.get('titulo')})")
        markup = "".join(render_node(child, figures) + safe_text(child.tail) for child in version)
        if not markup.strip():
            raise RuntimeError(f"Unable to render regulatory block: {uid}")
        block = {
            "id": uid, "blockId": node.get("id"), "heading": node.get("titulo"),
            "html": markup, "text": text, "url": SOURCE + "#" + node.get("id",""),
            "publicationDate": version.get("fecha_publicacion"),
            "effectiveDate": version.get("fecha_vigencia"),
            "origin": version.get("id_norma")
        }
        # Si un título se repite, conservar solo el bloque cuya ID coincida
        # con el índice y fallar ante ambigüedad, no reemplazar silenciosamente.
        if uid in entries:
            raise RuntimeError(f"Repeated regulatory block in BOE XML: {uid} ({node.get('id')})")
        entries[uid] = block
        counts["matched"] += 1
    required = [f"N-ART-{i:02d}" for i in range(1,30)] + [f"N-ITC-{i:02d}" for i in range(1,53)]
    missing = [k for k in required if k not in entries]
    if missing:
        raise RuntimeError("BOE text missing expected blocks: " + ", ".join(missing))
    # Un documento completo debe tener contenido amplio; evita publicar una
    # búsqueda sobre un corpus vacío o sobre errores HTTP convertidos en texto.
    total_chars = sum(len(v["text"]) for v in entries.values())
    if total_chars < 100_000:
        raise RuntimeError(f"Unexpectedly short BOE text: {total_chars} chars")
    generated = {
        "source": DOCUMENT, "sourceUrl": SOURCE, "sourceKind": "Texto consolidado informativo del BOE",
        "snapshotDate": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "readableBlocks": len(entries), "characters": total_chars, "blocks": entries
    }
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(generated,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    print(f"REBT reader: {len(entries)} bloques, {total_chars:,} caracteres, "
          f"{len(list(figures.glob('*.png')))} figuras, JSON {destination.stat().st_size:,} bytes")
    print(f"BOE: {SOURCE}. Estado: texto consolidado informativo, no reproducción auténtica.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="app/static/rebt_legal_text.json")
    parser.add_argument("--figures", default="app/static/rebt_figures")
    parser.add_argument("--input", help="XML oficial local para pruebas sin red")
    options=parser.parse_args()
    if options.input:
        root=ET.parse(options.input).getroot()
    else:
        root,_=request_xml(API)
    generate(root,Path(options.output),Path(options.figures),dt.datetime.now(dt.timezone.utc).strftime("%Y%m%d"))

if __name__ == "__main__":
    try: main()
    except Exception as exc:
        print(f"ERROR lector REBT: {exc}",file=sys.stderr)
        sys.exit(1)
