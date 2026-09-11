import os
import sys
import asyncio
import subprocess
import json
from PIL import Image, ImageDraw, ImageFont

# Set UTF-8
sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = r"d:\project\PeoplePulse"
DOCS_DIR = os.path.join(ROOT_DIR, "docs")
BUILD_DIR = os.path.join(DOCS_DIR, "video_build")
ART_DIR = r"C:\Users\User\.gemini\antigravity\brain\b614a9e2-d8dc-4d78-acf2-d08de59eae0a"
FINAL_VIDEO = os.path.join(DOCS_DIR, "PeoplePulse_Hackathon_Submission.mp4")

os.makedirs(BUILD_DIR, exist_ok=True)

# 6 Storyboard Scenes (Modeled directly after the NetCraft AI structure)
SCENES = [
    {
        "id": 1,
        "stage": "Introduction & Platform Overview",
        "badge": "STAGE 1: GOAL CONTEXT",
        "badge_color": "#0284c7",
        "title": "PeoplePulse — Autonomous Enterprise HR Intelligence",
        "subtitle": "Tech Zephyr 4.0 | IIT Bhubaneswar — Agentic AI Hackathon",
        "script": (
            "Greetings, dear judges. Let me introduce PeoplePulse, an autonomous enterprise HR intelligence platform "
            "built for Tech Zephyr 4.0 at IIT Bhubaneswar. PeoplePulse transforms traditional passive employee surveys "
            "into real-time, confidential micro-pulses backed by an autonomous ReAct AI agent that diagnoses friction, "
            "prevents burnout, and executes organizational interventions directly in your browser."
        ),
        "source_image": os.path.join(ART_DIR, "player_stage1_dashboard.png")
    },
    {
        "id": 2,
        "stage": "Architecture & Why Agentic AI",
        "badge": "STAGE 2: DECISION FRAMEWORK",
        "badge_color": "#8b5cf6",
        "title": "Why Agentic AI? The 6-Stage Autonomous Loop",
        "subtitle": "Goal → Decision → Action → Evaluation → Adaptation → Outcome",
        "script": (
            "Before showing you the live workflow, let me explain how our agentic architecture works. "
            "Unlike simple chatbots that merely output text, PulseAgent implements an authentic six-stage lifecycle: "
            "Goal, Decision, Action, Evaluation, Adaptation, and Outcome. It is powered by Google Gemini 2.0 Flash Function Calling, "
            "running against Supabase PostgreSQL with strict Row Level Security, differential privacy where n is greater than or equal to 3, "
            "and an immutable audit trail."
        ),
        "source_image": os.path.join(ART_DIR, "pitch_pdf_page_1.png")
    },
    {
        "id": 3,
        "stage": "Live Workflow: Action Execution",
        "badge": "STAGE 3: ACTION EXECUTION",
        "badge_color": "#0284c7",
        "title": "Live Workflow: PulseAgent ReAct Loop & Database Actions",
        "subtitle": "Querying Supabase Telemetry with Injected Multi-Tenant Scoping",
        "script": (
            "Now, let's move to our live workflow demo. The Admin Dashboard provides real-time organizational KPIs: "
            "84% daily participation, team health distributions, and real-time sentiment telemetry. "
            "When we open the PulseAgent Copilot drawer, notice the top breadcrumb bar tracking all six stages. "
            "When we trigger an enterprise investigation, the agent enters Stage 2: Decision, selecting get_organization_metrics. "
            "In Stage 3: Action, it queries our database with server-injected tenant credentials."
        ),
        "source_image": os.path.join(ART_DIR, "player_stage3_react.png")
    },
    {
        "id": 4,
        "stage": "Dynamic Evaluation & Bottleneck Discovery",
        "badge": "STAGE 4: DYNAMIC EVALUATION",
        "badge_color": "#7c3aed",
        "title": "Stage 4: Mathematical Signal Evaluation",
        "subtitle": "Isolating Critical Burnout Drop in Customer Support (42%)",
        "script": (
            "In Stage 4: Evaluation, the agent analyzes the incoming data stream. "
            "It calculates mathematical averages across departments and isolates Customer Support as an urgent bottleneck, "
            "suffering from severe burnout at 42% due to shift overload. "
            "Rather than waiting for human managers, the agent autonomously decides to dispatch an immediate targeted pulse "
            "and prepare a 1:1 manager coaching brief."
        ),
        "source_image": os.path.join(ART_DIR, "player_stage3_react.png")
    },
    {
        "id": 5,
        "stage": "Environmental Failure & Autonomous Adaptation",
        "badge": "STAGE 5: AUTONOMOUS ADAPTATION",
        "badge_color": "#ea580c",
        "title": "Core Differentiator: Real Environmental Failure Recovery",
        "subtitle": "HTTP 503 Webhook Timeout Intercepted → Rerouted to Internal Queue",
        "script": (
            "Now, observe our primary differentiator—Stage 5: Adaptation. In real enterprise environments, external services fail. "
            "When PulseAgent attempts to broadcast an escalation alert to an external team webhook, it intercepts a real HTTP 503 service timeout. "
            "Rather than failing or dropping the notice, PulseAgent catches the exception, updates its reasoning state, "
            "and autonomously reroutes the escalation to our internal Supabase emergency dispatch queue with zero message loss."
        ),
        "source_image": os.path.join(ART_DIR, "player_stage5_adaptation.png")
    },
    {
        "id": 6,
        "stage": "Outcome, Verification & Closing",
        "badge": "STAGE 6: OUTCOME & GOVERNANCE",
        "badge_color": "#16a34a",
        "title": "Resolution, Audit Governance & Production Testing",
        "subtitle": "Human-in-the-Loop Safeguards, n ≥ 3 Privacy & 23 Passing Tests",
        "script": (
            "Finally, in Stage 6: Outcome, the agent schedules targeted check-in questions with Human-in-the-Loop approval, "
            "and writes an immutable record to the audit trail. "
            "Under the hood, PeoplePulse is production-hardened with 23 passing unit tests and an offline fallback planner. "
            "I believe PeoplePulse will serve as a transformative tool for enterprise organizations. "
            "I sincerely hope it proves useful and earns your positive review. Thank you for your attention!"
        ),
        "source_image": os.path.join(ART_DIR, "pitch_pdf_page_3.png")
    }
]

async def generate_audio():
    import edge_tts
    print("--- [1/4] Generating Studio Neural Voiceover per Scene ---")
    voice = "en-US-ChristopherNeural"
    
    for scene in SCENES:
        raw_mp3 = os.path.join(BUILD_DIR, f"scene_{scene['id']}_raw.mp3")
        norm_mp3 = os.path.join(BUILD_DIR, f"scene_{scene['id']}.mp3")
        
        communicate = edge_tts.Communicate(scene['script'], voice, rate="+2%", volume="+0%")
        await communicate.save(raw_mp3)
        
        # Apply loudnorm + alimiter for broadcast-level loudness
        cmd = [
            "ffmpeg", "-y", "-i", raw_mp3,
            "-filter:a", "dynaudnorm=f=150:g=15:p=0.95,volume=2.2,alimiter=limit=0.98",
            "-b:a", "192k", norm_mp3
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        
        # Measure duration with ffprobe
        probe_cmd = [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", norm_mp3
        ]
        res = subprocess.run(probe_cmd, capture_output=True, text=True, check=True)
        dur = float(res.stdout.strip())
        scene['duration'] = dur
        print(f"  Scene {scene['id']}: {dur:.2f}s | {scene['badge']}")

def get_font(size, bold=False):
    # Try system fonts
    font_paths = [
        "C:\\Windows\\Fonts\\segoeuib.ttf" if bold else "C:\\Windows\\Fonts\\segoeui.ttf",
        "C:\\Windows\\Fonts\\arialbd.ttf" if bold else "C:\\Windows\\Fonts\\arial.ttf"
    ]
    for p in font_paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

def render_scene_frame(scene):
    W, H = 1920, 1080
    im = Image.new("RGB", (W, H), (15, 23, 42)) # Slate 900 background
    draw = ImageDraw.Draw(im)

    # Top Header Bar
    draw.rectangle([(0, 0), (W, 90)], fill=(10, 15, 30))
    draw.line([(0, 90), (W, 90)], fill=(30, 41, 59), width=2)

    font_brand = get_font(28, bold=True)
    draw.text((40, 26), "PeoplePulse", font=font_brand, fill=(255, 255, 255))
    font_sub = get_font(18, bold=False)
    draw.text((215, 33), "• Autonomous HR Intelligence (Tech Zephyr 4.0 | IIT Bhubaneswar)", font=font_sub, fill=(148, 163, 184))

    # Badge in Header
    badge_text = scene["badge"]
    font_badge = get_font(16, bold=True)
    b_color = scene["badge_color"]
    # Draw pill
    draw.rounded_rectangle([(W - 440, 24), (W - 40, 68)], radius=8, fill=b_color)
    draw.text((W - 425, 33), badge_text, font=font_badge, fill=(255, 255, 255))

    # Title & Subtitle banner below header
    draw.rectangle([(0, 92), (W, 175)], fill=(15, 23, 42))
    font_title = get_font(28, bold=True)
    draw.text((40, 102), scene["title"], font=font_title, fill=(248, 250, 252))
    font_desc = get_font(18, bold=False)
    draw.text((40, 142), scene["subtitle"], font=font_desc, fill=(56, 189, 248))

    # Center Visual Container
    content_box = (40, 185, W - 40, H - 150) # W: 1840, H: 745
    box_w = content_box[2] - content_box[0]
    box_h = content_box[3] - content_box[1]

    draw.rounded_rectangle(content_box, radius=12, fill=(2, 6, 23), outline=(51, 65, 85), width=2)

    # Load source image if available
    src_path = scene.get("source_image")
    if src_path and os.path.exists(src_path):
        try:
            raw_shot = Image.open(src_path)
            # Aspect fit inside content box
            raw_shot.thumbnail((box_w - 20, box_h - 20), Image.Resampling.LANCZOS)
            shot_w, shot_h = raw_shot.size
            pos_x = content_box[0] + (box_w - shot_w) // 2
            pos_y = content_box[1] + (box_h - shot_h) // 2
            im.paste(raw_shot, (pos_x, pos_y))
        except Exception as e:
            print(f"Error embedding {src_path}:", e)

    # Bottom Subtitle Overlay Bar
    draw.rectangle([(0, H - 135), (W, H)], fill=(2, 6, 23))
    draw.line([(0, H - 135), (W, H - 135)], fill=(30, 41, 59), width=2)

    # Script summary text inside subtitle bar
    font_script = get_font(20, bold=False)
    script_snippet = scene["script"]
    if len(script_snippet) > 175:
        # Split into two lines
        words = script_snippet.split()
        mid = len(words) // 2
        line1 = " ".join(words[:mid])
        line2 = " ".join(words[mid:mid+len(words[:mid])]) + ("..." if len(words) > 2*mid else "")
    else:
        line1 = script_snippet
        line2 = ""

    draw.text((40, H - 118), f"🎤 {line1}", font=font_script, fill=(226, 232, 240))
    if line2:
        draw.text((68, H - 75), line2, font=font_script, fill=(148, 163, 184))

    out_frame = os.path.join(BUILD_DIR, f"frame_{scene['id']}.png")
    im.save(out_frame, "PNG")
    scene["frame_path"] = out_frame

def render_all_frames():
    print("--- [2/4] Rendering High-Definition 1080p Visual Scene Frames ---")
    for s in SCENES:
        render_scene_frame(s)
        print(f"  Rendered Frame {s['id']} -> {s['frame_path']}")

def build_scene_videos():
    print("--- [3/4] Compiling Video Segments via FFmpeg ---")
    segment_files = []
    
    for s in SCENES:
        dur = s["duration"] + 0.5 # Add small padding
        seg_mp4 = os.path.join(BUILD_DIR, f"seg_{s['id']}.mp4")
        audio_mp3 = os.path.join(BUILD_DIR, f"scene_{s['id']}.mp3")
        frame_png = s["frame_path"]

        # Generate 1080p 30fps video clip looping the image for duration of audio
        cmd = [
            "ffmpeg", "-y",
            "-loop", "1", "-i", frame_png,
            "-i", audio_mp3,
            "-c:v", "libx264", "-tune", "stillimage", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k",
            "-t", f"{dur:.3f}",
            "-shortest",
            seg_mp4
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        segment_files.append(seg_mp4)
        print(f"  Compiled Segment {s['id']} ({dur:.2f}s)")

    # Concat all segments
    concat_list_path = os.path.join(BUILD_DIR, "concat_list.txt")
    with open(concat_list_path, "w", encoding="utf-8") as f:
        for seg in segment_files:
            # Escape path for ffmpeg concat
            f.write(f"file '{os.path.abspath(seg)}'\n")

    print("--- [4/4] Concatenating Final 1080p Master Video ---")
    concat_cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0", "-i", concat_list_path,
        "-c", "copy",
        FINAL_VIDEO
    ]
    subprocess.run(concat_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    print(f"\n=======================================================")
    print(f"  SUCCESS! Master Submission Video Generated at:")
    print(f"  {FINAL_VIDEO}")
    print(f"=======================================================")

async def main():
    await generate_audio()
    render_all_frames()
    build_scene_videos()

if __name__ == '__main__':
    asyncio.run(main())
