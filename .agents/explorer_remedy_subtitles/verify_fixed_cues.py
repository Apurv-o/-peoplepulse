import json, sys

sys.stdout.reconfigure(encoding='utf-8')

sub = json.load(open("demo_video_player/assets/subtitles/subtitles.json", encoding="utf-8"))
cues = sub["cues"]

fixed_cues = []
inverted_count = 0
out_of_bounds_count = 0

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

        if t_start >= t_end:
            inverted_count += 1
        if t_start < c["start"] or t_end > c["end"]:
            out_of_bounds_count += 1

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
        "spokenDuration": min(spoken, alloc),
        "text": c["text"],
        "tokens": new_tokens
    }
    fixed_cues.append(c_new)

print(f"Total cues: {len(fixed_cues)}")
print(f"Total tokens: {sum(len(c['tokens']) for c in fixed_cues)}")
print(f"Inverted tokens count: {inverted_count}")
print(f"Out of bounds tokens count: {out_of_bounds_count}")
