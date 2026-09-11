import json, sys

sys.stdout.reconfigure(encoding='utf-8')

sub = json.load(open("demo_video_player/assets/subtitles/subtitles.json", encoding="utf-8"))
cues = sub["cues"]

for i, c in enumerate(cues):
    print(f"{i+1:2d}. {c['id']:5s} Stage {c['stageId']} [{c['start']:5.1f} - {c['end']:5.1f}] ({c['stageName']}): {c['text'][:65]}...")
