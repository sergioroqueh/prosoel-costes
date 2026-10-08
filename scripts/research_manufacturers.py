#!/usr/bin/env python3
"""PROSOEL Costes: bounded official-source research worker.

Never edits orders/prices or auto-publishes normalized identities.
Only stages official manufacturer links for supervised review.
Usage: python3 scripts/research_manufacturers.py [--limit 12] [--scan 120] [--dry-run]
Required for live mode: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (GitHub secret).
Optional: BRAVE_SEARCH_API_KEY to discover more manufacturer pages.
"""
from __future__ import annotations

import argparse
import hashlib
import html
from html.parser import HTMLParser
import ipaddress
import json
import os
import re
import socket
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urljoin, urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler

ALLOWED_DOMAINS = frozenset({
    "www.aiscan.com", "aiscan.com",
    "www.legrand.es", "legrand.es",
    "www.se.com", "se.com", "www.schneider-electric.es",
    "www.televes.com", "televes.com",
    "www.fermax.com", "fermax.com",
    "www.jung-group.com", "jung-group.com",
    "www.pinazo.com", "pinazo.com",
})
MAX_BYTES = 950_000
TIMEOUT = 9
AGENT = "PROSOEL-Costes-Research/1.0 (limited manufacturer page checks)"
OFFICIAL_KNOWN = {
    ("LEGRAND", "403586"):
        "https://www.legrand.es/es/productos/magnetotermico-tx3-1pn-230v-16a-curva-2-modulos-403586",
    ("LEGRAND", "403585"):
        "https://www.legrand.es/es/productos/proteccion-modular-magnetotermica-y-diferencial",
}

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

class PlainText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
        self.hidden = 0
        self.title_parts = []
        self.in_title = False
        self.description = ""
    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript"):
            self.hidden += 1
        if tag == "title":
            self.in_title = True
        if tag == "meta":
            a = dict(attrs)
            if (a.get("name") or "").lower() == "description":
                self.description = (a.get("content") or "")[:500]
    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript") and self.hidden:
            self.hidden -= 1
        if tag == "title":
            self.in_title = False
    def handle_data(self, value):
        if self.in_title:
            self.title_parts.append(value)
        if not self.hidden:
            self.text.append(value)

def hostname_allowed(url):
    try:
        p = urlsplit(url)
        return (p.scheme == "https" and p.hostname in ALLOWED_DOMAINS
                and p.username is None and p.password is None and p.port in (None, 443))
    except (ValueError, TypeError):
        return False

def public_dns(url):
    """Reject private/loopback/link-local results; allow only known official hostnames."""
    if not hostname_allowed(url):
        return False
    host = urlsplit(url).hostname
    try:
        addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
        return bool(addresses) and all(ipaddress.ip_address(x[4][0]).is_global for x in addresses)
    except (OSError, ValueError):
        return False

def open_safe_official(url):
    opener = build_opener(NoRedirect)
    for _ in range(4):
        if not public_dns(url):
            raise ValueError("Official destination not allowed or unavailable")
        request = Request(url, headers={"User-Agent": AGENT, "Accept": "text/html"})
        try:
            response = opener.open(request, timeout=TIMEOUT)
        except HTTPError as exc:
            if exc.code in (301, 302, 303, 307, 308):
                location = exc.headers.get("Location")
                if not location:
                    raise
                url = urljoin(url, location)
                continue
            raise
        with response:
            ctype = response.headers.get("Content-Type", "").lower()
            if "text/html" not in ctype:
                raise ValueError("Non-HTML manufacturer page; skip PDF/other media")
            data = response.read(MAX_BYTES + 1)
            if len(data) > MAX_BYTES:
                raise ValueError("Manufacturer response too large")
            encoding = response.headers.get_content_charset() or "utf-8"
            return url, data.decode(encoding, errors="replace")
    raise ValueError("Too many redirects")

def extract_page(page):
    parser = PlainText()
    parser.feed(page)
    title = " ".join(parser.title_parts).strip()[:450]
    readable = re.sub(r"\s+", " ", html.unescape(" ".join(parser.text))).strip()
    meta = re.sub(r"\s+", " ", html.unescape(parser.description)).strip()
    return title, meta, readable[:200_000]

def reference_occurs(content, ref):
    if not ref or len(ref) < 3:
        return False
    return bool(re.search(r"(?<![A-Z0-9])" + re.escape(ref.upper()) + r"(?![A-Z0-9])",
                          content.upper()))

def manufacturer_and_code(item):
    reference = (item.get("supplier_reference") or "").strip().upper()
    desc = (item.get("supplier_description") or "").upper()
    if re.fullmatch(r"CR(16|20|25|32|40|50)", reference) and "AISCAN" in desc:
        return "AISCAN", reference
    if re.fullmatch(r"4035(?:84|85|86|87|88|89|90)", reference) and "TX3" in desc:
        return "LEGRAND", reference
    if "TELEV" in desc and len(reference) >= 5:
        return "TELEVES", reference
    if "FERMAX" in desc and len(reference) >= 5:
        return "FERMAX", reference
    if "JUNG" in desc and len(reference) >= 5:
        return "JUNG", reference
    return None, None

def official_urls(item, brave_key=None):
    brand, code = manufacturer_and_code(item)
    if not code:
        return []
    candidates = []
    if brand == "AISCAN":
        candidates.append(f"https://www.aiscan.com/producto/cr/tubo-aiscan-cr-{code.lower()}/")
    known = OFFICIAL_KNOWN.get((brand, code))
    if known:
        candidates.append(known)
    if brave_key:
        query = f'site:{brand_domain(brand)} "{code}"'
        request = Request("https://api.search.brave.com/res/v1/web/search?" +
                          urlencode({"q": query, "count": 5}),
                          headers={"X-Subscription-Token": brave_key,
                                   "Accept": "application/json", "User-Agent": AGENT})
        from urllib.request import urlopen
        try:
            with urlopen(request, timeout=TIMEOUT) as response:
                payload = json.load(response)
            for result in payload.get("web", {}).get("results", []):
                url = result.get("url", "")
                if hostname_allowed(url):
                    candidates.append(url)
        except Exception as exc:
            print(f"Search provider unavailable for {code}: {type(exc).__name__}", file=sys.stderr)
    return list(dict.fromkeys(candidates))[:5]

def brand_domain(brand):
    return {"AISCAN": "aiscan.com", "LEGRAND": "legrand.es",
            "TELEVES": "televes.com", "FERMAX": "fermax.com",
            "JUNG": "jung-group.com"}[brand]

def matches_purchase(item, brand, reference):
    desc = (item.get("supplier_description") or "").upper()
    if brand == "AISCAN":
        actual = re.search(r"DI[AÁ]METRO\s*(\d{2})|D\.\s*(\d{2})", desc)
        if actual:
            size = actual.group(1) or actual.group(2)
            return size == reference[2:]
        return False
    if brand == "LEGRAND":
        amps = {"403585": "10", "403586": "16", "403587": "20",
                "403588": "25", "403589": "32", "403590": "40"}.get(reference)
        if amps:
            return bool(re.search(r"(?<!\d)" + amps + r"\s*A(?![A-Z])", desc))
    return False

def build_evidence(item, url, page):
    brand, ref = manufacturer_and_code(item)
    if not brand:
        return None
    title, meta, body = extract_page(page)
    if not reference_occurs(body, ref) and not reference_occurs(title, ref):
        return None
    summary = (meta or (body[max(0, body.upper().find(ref)-80):
                             max(0,body.upper().find(ref)-80)+420])).strip()
    return {
        "p_item_id": int(item["commercial_item_id"]),
        "p_source_url": url,
        "p_source_title": title or (brand + " " + ref),
        "p_source_excerpt": summary[:1000],
        "p_manufacturer": brand,
        "p_reference": ref,
        "p_code_match": True,
        "p_description_match": matches_purchase(item,brand,ref),
        "p_content_hash": hashlib.sha256(page.encode("utf-8")).hexdigest(),
    }

def api_rpc(endpoint, key, name, body):
    from urllib.request import urlopen
    url = endpoint.rstrip("/") + "/rest/v1/rpc/" + name
    req = Request(url, data=json.dumps(body,ensure_ascii=False).encode("utf-8"),
        method="POST", headers={"apikey":key, "Authorization":"Bearer "+key,
                                 "Content-Type":"application/json","Accept":"application/json"})
    with urlopen(req,timeout=20) as response:
        raw=response.read(3_000_000)
    return json.loads(raw) if raw else None

def run(limit=12,scan=120,dry_run=False):
    endpoint = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    brave = os.getenv("BRAVE_SEARCH_API_KEY","").strip() or None
    if not endpoint or not key:
        print("NOT CONFIGURED: add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as protected GitHub secrets.")
        return 0
    queue = api_rpc(endpoint,key,"material_research_priority",{"result_limit":min(scan,150)})
    if not isinstance(queue,list):
        raise RuntimeError("Unexpected research queue response")
    researched = 0
    submitted = 0
    unsupported = 0
    reachable_pages = 0
    transient_errors = 0
    items_blocked = 0
    for item in queue:
        if researched >= limit:
            break
        urls = official_urls(item,brave)
        if not urls:
            unsupported += 1
            continue  # no paid API? keep candidate untouched, do not claim research
        researched += 1
        found = False
        checked_without_match = False
        temporary_issue = False
        for url in urls:
            try:
                final, page = open_safe_official(url)
                reachable_pages += 1
                checked_without_match = True
                evidence = build_evidence(item,final,page)
                if evidence is None:
                    continue
                found = True
                if dry_run:
                    print(json.dumps({"dry_run":True,"item":item.get("commercial_item_id"),
                                      "source":final,"match":evidence["p_description_match"]}))
                else:
                    response = api_rpc(endpoint,key,"material_research_submit",evidence)
                    print(json.dumps({"item":item.get("commercial_item_id"),
                                      "source":final,"result":response},ensure_ascii=False))
                    submitted += 1
                break  # one official link per item per run
            except HTTPError as exc:
                if exc.code in (404, 410):
                    checked_without_match = True
                else:
                    temporary_issue = True
                    transient_errors += 1
                print("Official source HTTP problem:",exc.code,
                      "for",urlsplit(url).hostname,file=sys.stderr)
            except (URLError, OSError, TimeoutError, ValueError) as exc:
                temporary_issue = True
                transient_errors += 1
                print("Official source connection problem:",
                      type(exc).__name__,str(exc)[:150],file=sys.stderr)
        if not found:
            if temporary_issue:
                items_blocked += 1
            elif checked_without_match and not dry_run:
                # A genuine 404 or a fetched page with no reference is a no-match.
                # A blocked host/timeout is NOT a no-match.
                api_rpc(endpoint,key,"material_research_mark_attempt",
                        {"p_item_id":int(item["commercial_item_id"]),"p_found":False})
        time.sleep(0.7)
    print(json.dumps({"scanned":len(queue),"attempted":researched,
                      "proposals_recorded":submitted,"unsupported":unsupported,
                      "reachable_pages":reachable_pages,
                      "items_blocked_by_network":items_blocked,
                      "transient_connection_errors":transient_errors,
                      "dry_run":dry_run,"search_provider_configured":bool(brave)}))
    if researched and not reachable_pages and items_blocked:
        print("RESEARCH INCOMPLETE: none of the official manufacturer pages "+
              "were reachable. No reference is marked absent because of this.",
              file=sys.stderr)
        return 2
    return 0

if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--limit",type=int,default=12)
    parser.add_argument("--scan",type=int,default=120)
    parser.add_argument("--dry-run",action="store_true")
    args=parser.parse_args()
    try:
        sys.exit(run(limit=max(1,min(args.limit,25)),
                     scan=max(1,min(args.scan,150)),dry_run=args.dry_run))
    except Exception as exc:
        print("Research worker failed: "+type(exc).__name__+": "+str(exc)[:240],
              file=sys.stderr)
        sys.exit(1)
