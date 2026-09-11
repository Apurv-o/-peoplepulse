import json, sys

sys.stdout.reconfigure(encoding='utf-8')

# Read existing presentationData.js
with open("demo_video_player/js/presentationData.js", "r", encoding="utf-8") as f:
    orig_lines = f.readlines()

# Read bundled cues
with open(".agents/explorer_remedy_subtitles/bundled_cues.json", "r", encoding="utf-8") as f:
    cues_data = json.load(f)

cues_js = "    // 27 Official Word-for-Word Subtitle Cues with Token Timing\n"
cues_js += "    cues: " + json.dumps(cues_data, indent=4, ensure_ascii=False) + ",\n\n"

# Insert cues right after stages array (around line 88)
# Find line with "    stages: [" and find its matching closing "    ],"
out_lines = []
inserted = False
for line in orig_lines:
    out_lines.append(line)
    if "    stages: [" in line:
        pass
    elif line.strip() == "]," and not inserted:
        # Check if previous context was stages
        out_lines.append("\n" + cues_js)
        inserted = True

with open(".agents/explorer_remedy_subtitles/proposed_presentationData.js", "w", encoding="utf-8") as f:
    f.writelines(out_lines)

print(f"Generated proposed_presentationData.js, inserted={inserted}")
