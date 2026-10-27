#!/usr/bin/env python3
"""Render one public.team_survey_responses row as a Slack message (same markdown style as vicmetro-careers/slack_post/render.py).

Usage:  python3 render.py row.json   |   cat row.json | python3 render.py
Input: one row (from `select row_to_json(r) from public.team_survey_responses r ...`); also accepts a list (first item) or {"r": row}.
Question text and order come from ../src/questions.json (answers are keyed by question id).
Destination: private Slack channel #vic-metro-hr (C0CCP2BBN1Y). Nothing is posted from here. A posting routine would:
  1) select row_to_json(r) from public.team_survey_responses r where posted_at is null and is_test = false order by created_at limit 20;
  2) render each row with this script and post it to C0CCP2BBN1Y;
  3) update public.team_survey_responses set posted_at = now(), slack_ts = '<ts>' where id = '<id>' and posted_at is null returning id;
"""
import json, os, sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

MEL = ZoneInfo("Australia/Melbourne")
Q = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "questions.json")))


def load(argv):
    r = json.loads(open(argv[0]).read() if argv else sys.stdin.read())
    if isinstance(r, list): r = r[0]
    if isinstance(r, dict) and isinstance(r.get("r"), dict): r = r["r"]
    if isinstance(r, dict) and isinstance(r.get("row_to_json"), dict): r = r["row_to_json"]
    for k in ("details", "answers"):
        if isinstance(r.get(k), str): r[k] = json.loads(r[k])
    return r


def mel(iso):
    if not iso: return ""
    t = datetime.fromisoformat(str(iso).replace("Z", "+00:00").replace(" ", "T"))
    if t.tzinfo is None: t = t.replace(tzinfo=timezone.utc)
    return t.astimezone(MEL).strftime("%a %-d %b %Y, %-I:%M %p").replace("AM", "am").replace("PM", "pm")


def scale(q, v):
    """Compact scale: just the picked option (no n/5 position: several scales aren't ordered good-to-bad)."""
    return v


def quote(s):
    return "\n".join("> " + (ln.strip() or " ") for ln in str(s).strip().splitlines())


def render(r):
    a, d = r.get("answers") or {}, r.get("details") or {}
    name = (r.get("name") or "").strip() or "Anonymous"
    L = [f"{'[TEST] ' if r.get('is_test') else ''}**New team survey response: {name}**", f"_{mel(r.get('created_at'))} (Melbourne time)_"]
    flags = []
    if d.get("honeypot") or r.get("source") == "web-hp": flags.append("hidden anti-spam box was filled (could be a bot or phone autofill), check it looks real")
    if d.get("send_rescue"): flags.append("the form had to be re-sent in a slim copy, some long answers may be cut short")
    if flags: L.append("⚠️ " + "; ".join(flags).capitalize())
    n = 0
    for s in Q["sections"]:
        L += ["", f"**{s['title']}**"]
        for q in s["questions"]:
            n += 1; v = a.get(q["id"])
            if q["type"] == "scale":
                L.append(f"- {n}. {q['text'].rstrip(':')}: **{scale(q, v) if v else '(no answer)'}**")
            else:
                if not v and q.get("optional"): continue
                L.append(f"{n}. *{q['text']}*")
                L.append(quote(v) if v else "> (no answer)")
    known = {q["id"] for s in Q["sections"] for q in s["questions"]}
    extra = {k: v for k, v in a.items() if k not in known}  # answers to questions since removed from questions.json
    if extra:
        L += ["", "**Other answers**"] + [f"- {k}: {v}" for k, v in extra.items()]
    return "\n".join(L)


if __name__ == "__main__":
    print(render(load([x for x in sys.argv[1:] if not x.startswith("--")])))
