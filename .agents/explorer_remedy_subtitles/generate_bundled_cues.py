import json, sys

sys.stdout.reconfigure(encoding='utf-8')

sub = json.load(open("demo_video_player/assets/subtitles/subtitles.json", encoding="utf-8"))
cues = sub["cues"]

fixed_cues = []
for c in cues:
    tokens = c.get("tokens", [])
    n = len(tokens)
    alloc = round(c["end"] - c["start"], 2)
    spoken = c.get("spokenDuration", alloc)
    effective_dur = min(spoken, alloc)
    dur_per_word = effective_dur / max(n, 1)

    new_tokens = []
    for i, t in enumerate(tokens):
        t_start = round(c["start"] + i * dur_per_word, 2)
        t_end = round(c["start"] + (i + 1) * dur_per_word, 2)
        if i == n - 1:
            t_end = min(t_end, c["end"])
        if t_end <= t_start:
            t_end = round(t_start + 0.05, 2)
        if t_end > c["end"]:
            t_end = c["end"]
            if t_start >= t_end:
                t_start = max(c["start"], round(t_end - 0.05, 2))

        new_tokens.append({
            "text": t["text"],
            "start": t_start,
            "end": t_end,
            "highlight": t.get("highlight", False)
        })

    c_new = {
        "id": c["id"],
        "stageId": c["stageId"],
        "stageName": c["stageName"],
        "stageClass": c["stageClass"],
        "start": c["start"],
        "end": c["end"],
        "spokenDuration": round(min(spoken, alloc), 2),
        "text": c["text"],
        "tokens": new_tokens
    }
    fixed_cues.append(c_new)

# Generate formatted JS snippet
js_cues_json = json.dumps(fixed_cues, indent=2, ensure_ascii=False)
with open("d:/project/PeoplePulse/.agents/explorer_remedy_subtitles/bundled_cues.json", "w", encoding="utf-8") as f:
    f.write(js_cues_json)

print(f"Successfully generated bundled_cues.json ({len(fixed_cues)} cues, {sum(len(c['tokens']) for c in fixed_cues)} tokens)")
