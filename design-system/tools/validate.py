#!/usr/bin/env python3
"""Validate a PULSE manifest without mutating the live site."""
import argparse, hashlib, json, pathlib, re, subprocess, sys
root=pathlib.Path(__file__).resolve().parents[2]
ds=root/"design-system"
p=argparse.ArgumentParser()
p.add_argument("--manifest",default="design-system/pages/b2c.baseline.json")
p.add_argument("--release",action="store_true")
args=p.parse_args()
registry=json.loads((ds/"sections/registry.json").read_text())
manifest=json.loads((root/args.manifest).read_text())
errors=[]
def check(ok,msg):
    if not ok: errors.append(msg)
seen=set()
for item in manifest["sections"]:
    sid,vid=item["id"],item["variant"]
    check(sid not in seen,"Duplicate section: "+sid);seen.add(sid)
    v=registry["sections"].get(sid,{}).get("variants",{}).get(vid)
    if not v:
        errors.append("Unknown variant: "+sid+"/"+vid);continue
    path=root/v["markup"]
    check(path.is_file(),"Missing markup: "+str(path))
    check(bool(re.fullmatch(r"[0-9a-f]{40}",v["source_commit"])),"Unpinned source: "+sid)
    if args.release:
        check(v.get("module_ready") and v.get("status")=="approved","Variant is not approved: "+sid+"/"+vid)
        for asset in v.get("assets",[]): check((root/asset).is_file(),"Missing asset: "+asset)
if args.release:
    check(manifest.get("tokens_status")=="approved","Design tokens not approved")
    check(manifest.get("status")=="approved","Manifest not approved")
else:
    archive=ds/"references/legacy-main/index.html"
    if manifest.get("revision")=="legacy-baseline":
        check(archive.read_bytes()==(root/"index.html").read_bytes(),"Baseline index.html differs from archive")
if errors:
    print("\n".join("ERROR: "+e for e in errors));sys.exit(1)
print("Manifest references valid. "+("Release metadata valid; browser QA still required." if args.release else "Reference check only; no production approval."))
