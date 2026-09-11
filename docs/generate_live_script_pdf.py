import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#0284c7"))
        
        if self._pageNumber > 1:
            self.drawString(14 * mm, 285 * mm, "PeoplePulse — Live Production Video Script (peoplepulse-app.vercel.app)")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748b"))
            self.drawRightString(196 * mm, 285 * mm, "Tech Zephyr 4.0 | IIT Bhubaneswar")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(14 * mm, 282 * mm, 196 * mm, 282 * mm)
            
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(14 * mm, 10 * mm, "Live Deployed App: https://peoplepulse-app.vercel.app/ (Admin: admin@company.com)")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(196 * mm, 10 * mm, page_text)
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(14 * mm, 13 * mm, 196 * mm, 13 * mm)
        self.restoreState()

def create_pdf(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=15 * mm,
        bottomMargin=16 * mm
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=16, leading=20,
        textColor=colors.HexColor('#0f172a')
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=9, leading=12,
        textColor=colors.HexColor('#0284c7')
    )
    meta_style = ParagraphStyle(
        'MetaStyle', parent=styles['Normal'],
        fontName='Helvetica', fontSize=7.5, leading=10.5,
        textColor=colors.HexColor('#475569')
    )
    sec_heading = ParagraphStyle(
        'SecHeading', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=10.5, leading=14,
        textColor=colors.HexColor('#0f172a'), spaceBefore=5, spaceAfter=2
    )
    time_badge = ParagraphStyle(
        'TimeBadge', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=8, leading=10,
        textColor=colors.HexColor('#0284c7')
    )
    act_title = ParagraphStyle(
        'ActTitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=8.5, leading=11,
        textColor=colors.HexColor('#0f172a')
    )
    cue_lbl = ParagraphStyle(
        'CueLabel', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=7, leading=8.5,
        textColor=colors.HexColor('#64748b')
    )
    cue_txt = ParagraphStyle(
        'CueText', parent=styles['Normal'],
        fontName='Helvetica', fontSize=7.5, leading=10,
        textColor=colors.HexColor('#334155')
    )
    spoken_txt = ParagraphStyle(
        'SpokenText', parent=styles['Normal'],
        fontName='Helvetica-Oblique', fontSize=8, leading=11.5,
        textColor=colors.HexColor('#1e293b')
    )

    story = []

    # Header
    t_p = Paragraph("<b>PeoplePulse — Live Production Demo Script</b>", title_style)
    s_p = Paragraph("Exact Screen-Accurate Recording Guide for <b>https://peoplepulse-app.vercel.app/</b>", subtitle_style)
    m_p = Paragraph(
        "<b>Target Runtime:</b> 2:45 – 3:00 min (~175 sec)<br/>"
        "<b>Login:</b> admin@company.com / Password123!<br/>"
        "<b>Style:</b> NetCraft AI Hackathon Submission",
        meta_style
    )

    hdr = Table([[[t_p, Spacer(1, 1*mm), s_p], m_p]], colWidths=[124*mm, 58*mm])
    hdr.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(hdr)
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceBefore=2, spaceAfter=4))

    def make_act_card(time_range, title, stage, on_screen, spoken, is_accent=False):
        accent_color = colors.HexColor('#ea580c') if is_accent else colors.HexColor('#0284c7')
        accent_bg = colors.HexColor('#fff7ed') if is_accent else colors.HexColor('#f8fafc')
        card_bg = colors.HexColor('#ffffff')

        t_time = Paragraph(f"<b>[{time_range}]</b>", time_badge)
        t_title = Paragraph(f"<b>{title}</b>", act_title)
        t_stage = Paragraph(f"<b>{stage}</b>", ParagraphStyle('Stg', parent=meta_style, fontName='Helvetica-Bold', fontSize=7, textColor=accent_color))

        hdr_row = Table([[t_time, t_title, t_stage]], colWidths=[24*mm, 110*mm, 48*mm])
        hdr_row.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), accent_bg),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ALIGN', (2,0), (2,0), 'RIGHT'),
            ('LEFTPADDING', (0,0), (-1,-1), 5),
            ('RIGHTPADDING', (0,0), (-1,-1), 5),
            ('TOPPADDING', (0,0), (-1,-1), 2.5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ]))

        v_lbl = Paragraph("🖥️ ON-SCREEN ACTIONS (MOUSE & CLICKS)", cue_lbl)
        v_body = Paragraph(on_screen, cue_txt)
        cue_row = Table([[[v_lbl, Spacer(1, 1*mm), v_body]]], colWidths=[182*mm])
        cue_row.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), card_bg),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('RIGHTPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ]))

        s_lbl = Paragraph("🎤 SPOKEN NARRATION (WORD-FOR-WORD)", ParagraphStyle('SpkLbl', parent=cue_lbl, textColor=accent_color))
        s_body = Paragraph(spoken, spoken_txt)
        spk_row = Table([[[s_lbl, Spacer(1, 1*mm), s_body]]], colWidths=[182*mm])
        spk_row.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), accent_bg),
            ('LINELEFT', (0,0), (-1,-1), 2.5, accent_color),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('RIGHTPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 3.5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ]))

        block = Table([[hdr_row], [cue_row], [spk_row]], colWidths=[182*mm])
        block.setStyle(TableStyle([
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        return block

    # Act 1
    story.append(make_act_card(
        "0:00 – 0:28",
        "Act 1: Login & The Autonomous Shift",
        "Stage 1: Goal Context",
        "Start on <b>Login Page</b>. Type <code>admin@company.com</code> and password. Click <b>Sign in to PeoplePulse</b>. Dashboard loads.",
        "\"Greetings, dear judges. Let me introduce <b>PeoplePulse</b>, an autonomous enterprise HR intelligence platform built for Tech Zephyr 4.0 at IIT Bhubaneswar.<br/><br/>"
        "In modern engineering and enterprise teams, <b>76% of employees experience burnout</b> before leadership realizes there's a problem. Traditional annual surveys fail because of survey fatigue and 6-month time lags.<br/><br/>"
        "PeoplePulse transforms passive employee engagement into <b>60-second confidential daily micro-pulses</b>, backed by <b>PulseAgent</b>: an autonomous ReAct AI agent that continuously diagnoses team friction, isolates burnout bottlenecks, and executes organizational interventions directly in your browser.\""
    ))
    story.append(Spacer(1, 2.5*mm))

    # Act 2
    story.append(make_act_card(
        "0:28 – 0:58",
        "Act 2: Architecture & Why Agentic AI",
        "Stage 2: Decision Framework",
        "Hover cursor over top KPI cards: <b>Organization Members</b> (12/100), <b>Active Teams</b> (4/10), <b>Daily Participation</b> (83% live), <b>Org. Engagement</b> (74/100). Scroll past Recharts trend chart and Sentiment donut.",
        "\"Before showing you the live workflow, let me explain how our agentic architecture works.<br/><br/>"
        "Unlike simple chatbots that merely output text, PulseAgent implements an authentic 6-stage lifecycle: <b>Goal, Decision, Action, Evaluation, Adaptation, and Outcome</b>.<br/><br/>"
        "It is powered by Google Gemini 2.0 Flash Function Calling, running against our multi-tenant Supabase PostgreSQL backend with strict Row Level Security. We enforce differential privacy where <b>n &ge; 3</b> at the database engine level, mathematically preventing individual de-anonymization, while every decision is recorded to an immutable audit trail.\""
    ))
    story.append(Spacer(1, 2.5*mm))

    # Act 3
    story.append(make_act_card(
        "0:58 – 1:35",
        "Act 3: Live Workflow Demo — Opening PulseAgent",
        "Stage 3: Action Execution",
        "Scroll up to <b>PulseAgent HR Copilot</b> banner. Click <b>Open PulseAgent</b>. Right drawer slides open. Point cursor to 6-stage breadcrumbs. Click Quick Prompt: <i>'Investigate Customer Success team burnout...'</i>.",
        "\"Now, let's move to our live workflow demo. On the Organization Overview dashboard, we click <b>Open PulseAgent</b> to open our copilot drawer.<br/><br/>"
        "Notice the top breadcrumb bar tracking all 6 stages. We trigger an organizational investigation with one click.<br/>"
        "• <b>Stage 1: Goal Established.</b> PulseAgent sets the enterprise objective.<br/>"
        "• <b>Stage 2: Decision.</b> The model inspects its tool registry and autonomously selects <code>get_organization_metrics</code>—labeled as <b>Checking Company Numbers</b>.<br/>"
        "• <b>Stage 3: Action.</b> It executes the tool against our live Supabase database. Notice that the organization ID is automatically injected from the session claims—the LLM is never allowed to fabricate tenant boundaries.\""
    ))

    story.append(PageBreak())

    # Act 4
    story.append(make_act_card(
        "1:35 – 2:02",
        "Act 4: Dynamic Evaluation & Bottleneck Discovery",
        "Stage 4: Evaluation",
        "Point cursor to incoming Observation card: Overall is 74%, but <b>Customer Support has dropped to 42% burnout</b>. Stream calls <i>'Adding Follow-Up Question'</i> and <i>'Preparing Manager Talking Points'</i>.",
        "\"In <b>Stage 4: Evaluation</b>, the agent parses the live telemetry.<br/><br/>"
        "It calculates mathematical averages across teams and isolates Customer Support as an urgent bottleneck, suffering from severe burnout at 42% due to shift overload.<br/><br/>"
        "Rather than waiting for human HR intervention, PulseAgent autonomously decides on two corrective actions: injecting an adaptive follow-up question into tomorrow's check-in battery, and synthesizing a personalized 1:1 action brief for the Customer Support manager.\""
    ))
    story.append(Spacer(1, 2.5*mm))

    # Act 5 (Accent)
    story.append(make_act_card(
        "2:02 – 2:32",
        "Act 5: Failure Interception & Self-Healing Adaptation",
        "Stage 5: Autonomous Adaptation",
        "Highlight prominent <b>orange event card</b>: <code>Stage 5: Adaptation (Failure Interception & Self-Correction)</code>. Shows HTTP 503 error, followed by <code>send_emergency_notification</code> card.",
        "\"Now, pay close attention to <b>Stage 5: Adaptation</b>—our primary hackathon differentiator.<br/><br/>"
        "In real-world enterprise environments, external webhooks and third-party APIs fail. When PulseAgent attempts to broadcast an escalation alert, it intercepts a real <b>HTTP 503 service timeout</b>.<br/><br/>"
        "A standard script would crash or silently drop the alert. <b>PulseAgent catches the network exception, evaluates the failure context, triggers a strategy adaptation event, and autonomously reroutes the escalation</b> to our internal Supabase emergency dispatch queue.<br/><br/>"
        "Zero message loss, zero human intervention, <b>100% self-healing resilience</b>.\"",
        is_accent=True
    ))
    story.append(Spacer(1, 2.5*mm))

    # Act 6
    story.append(make_act_card(
        "2:32 – 2:58",
        "Act 6: Outcome, Governance & Winning Closing",
        "Stage 6: Outcome & Closing",
        "Green <b>Stage 6: Outcome</b> card appears. Click <b>Activity</b> tab in drawer header to show immutable audit log. Click <b>Tools</b> tab to show schemas. Close drawer, return to dashboard.",
        "\"This brings us to <b>Stage 6: Outcome</b>.<br/><br/>"
        "The adaptive questions are live, the manager brief is delivered, and in the <b>Activity tab</b>, judges can inspect the permanent, sanitized audit log recorded in <code>agent_activity_logs</code>.<br/><br/>"
        "Under the hood, PeoplePulse is production-hardened: 23 unit tests passing in 500 milliseconds, strict PostgreSQL Row Level Security, and an offline fallback planner guaranteeing continuous uptime.<br/><br/>"
        "I believe PeoplePulse demonstrates the true potential of autonomous Agentic AI in the enterprise. I sincerely hope it earns your positive review. Thank you for your attention!\""
    ))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated at: {output_path}")

if __name__ == '__main__':
    out_pdf = r"d:\project\PeoplePulse\docs\PeoplePulse_Live_App_Demo_Script.pdf"
    create_pdf(out_pdf)
