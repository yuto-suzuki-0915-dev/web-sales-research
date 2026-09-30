import json
T = "2026-09-30T00:00:00Z"
OUT = "research/market-runs/nishinomiya-eikaiwa-juku-20260930/work/"


def rec(lid, act, gap, dec, reason, oa, sa, ow, sw, site=None, excl=None, vis="unverified"):
    ev = [
        {"id": "a1", "kind": "activity", "status": "observed", "observation": oa, "source_url": sa, "checked_at": T},
        {"id": "w1", "kind": "web_gap", "status": "not_checked" if gap == "unknown" else "observed",
         "observation": ow, "source_url": sw, "checked_at": T},
    ]
    r = {
        "lead_id": lid,
        "activity": {"status": act, "evidence_ids": ["a1"]},
        "web_gap": {"status": gap, "evidence_ids": ["w1"]},
        "triage": {"decision": dec, "reason": reason, "checked_at": T},
        "evidence": ev,
        "website": ({"presence": "confirmed", "url": site} if site else {"presence": "unconfirmed"}),
        "visual": {"status": vis},
        "lead": ({"status": "excluded", "exclusion_reasons": [excl]} if excl else {"status": "candidate", "exclusion_reasons": []}),
        "workflow": {"stage": "triaged", "result": "in_progress"},
    }
    return json.dumps(r, ensure_ascii=False)


def U(lid, dec, reason, src, act="uncertain", oa="掲載情報のみ。最近の活動は未確認", ow="公式サイト未確認"):
    return rec(lid, act, "unknown", dec, reason, oa, src, ow, src)


def CH(lid, name, url, act="uncertain"):
    return rec(lid, act, "unknown", "stop", name + "は大手FC/全国チェーンでSegment対象外", "本部サイト・掲載元から大手チェーン校舎と判断", url,
               "未確認（対象外のため調査せず）", url, None,
               "大手FC/全国チェーン（%s）の校舎でSegment対象外 出典: %s" % (name, url))


def save(name, rows):
    with open(OUT + name, "w", encoding="utf-8") as f:
        f.write("\n".join(rows) + "\n")
    print(name, len(rows))
