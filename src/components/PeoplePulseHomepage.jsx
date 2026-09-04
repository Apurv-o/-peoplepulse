import React, { useEffect, useRef, useState } from "react";
import backgroundVideo from "@video";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  Menu, X, Lock, Sparkles, TrendingDown, MessageCircle, ArrowRight, Bell,
  Flame, TrendingUp, Clock, BarChart3, ShieldCheck, Activity, ClipboardList,
  AlertTriangle, EyeOff, CheckCircle2,
} from "lucide-react";

/* ============================================================
   TOKENS
   ============================================================ */
const T = {
  primary: "#4E6ABF",
  primaryDark: "#344A91",
  bg: "#F7F7F5",
  surface: "#FFFFFF",
  text: "#1F2A28",
  muted: "#7B8494",
  border: "#E6E7EA",
  positive: "#6FAE8C",
  positiveBg: "#EAF3EE",
  amber: "#E0B15C",
  amberBg: "#FBF3E4",
  negative: "#D9847B",
  negativeBg: "#FBEDEB",
};

const engagementTrend = [
  { week: "W1", score: 71 },
  { week: "W2", score: 73 },
  { week: "W3", score: 75 },
  { week: "W4", score: 78 },
];

const sentimentSplit = [
  { name: "Positive", value: 68, color: T.positive },
  { name: "Neutral", value: 24, color: "#C7CBD1" },
  { name: "Negative", value: 8, color: T.negative },
];

/* ============================================================
   SCROLL REVEAL
   ============================================================ */
function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(18px)",
        transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ============================================================
   FALLBACK / REDUCED-MOTION NETWORK SCENE
   ============================================================ */
function NetworkScene() {
  const nodes = [
    { x: 60, y: 70, r: 5 }, { x: 180, y: 40, r: 8 }, { x: 260, y: 130, r: 4 },
    { x: 120, y: 190, r: 6 }, { x: 320, y: 60, r: 5 }, { x: 340, y: 210, r: 7 },
    { x: 220, y: 250, r: 4 }, { x: 40, y: 220, r: 4 }, { x: 380, y: 150, r: 5 },
  ];
  const edges = [[0,1],[1,2],[1,4],[2,5],[3,0],[3,6],[4,8],[5,8],[5,6],[2,4]];
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      aria-hidden="true"
      style={{
        maskImage: "radial-gradient(ellipse 70% 70% at 65% 45%, black 55%, transparent 90%)",
        WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 65% 45%, black 55%, transparent 90%)",
      }}
    >
      <svg viewBox="0 0 420 300" className="absolute right-[-4%] top-[6%] w-[62%] max-w-[560px] h-auto animate-[pp-drift_16s_ease-in-out_infinite]">
        <defs>
          <radialGradient id="ppNode" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#EAF0FF" />
            <stop offset="100%" stopColor={T.primary} />
          </radialGradient>
        </defs>
        {edges.map(([a, b], i) => (
          <line
            key={i}
            x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
            stroke={T.primary} strokeOpacity="0.18" strokeWidth="1"
          />
        ))}
        {nodes.map((n, i) => (
          <circle
            key={i}
            cx={n.x} cy={n.y} r={n.r}
            fill="url(#ppNode)"
            opacity="0.85"
            style={{ animation: `pp-pulse 4.5s ease-in-out ${i * 0.4}s infinite` }}
          />
        ))}
      </svg>
      <div
        className="absolute right-[8%] top-[30%] w-64 h-64 rounded-full blur-3xl animate-[pp-glow_9s_ease-in-out_infinite]"
        style={{ background: "radial-gradient(circle, rgba(78,106,191,0.22), transparent 70%)" }}
      />
    </div>
  );
}

/* ============================================================
   3D BACKGROUND VIDEO COMPONENT (Subtle, Infinite, Silent)
   Uses the actual existing video file directly.
   ============================================================ */
function Background3DHeroVideo() {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Strict audio disablement: Guarantee mute and zero volume
    video.muted = true;
    video.volume = 0;

    const playVideo = () => {
      const promise = video.play();
      if (promise !== undefined) {
        promise.catch((err) => {
          console.debug("Video autoplay state:", err?.message);
        });
      }
    };

    playVideo();
  }, []);

  return (
    <div
      className="absolute inset-0 overflow-hidden select-none pointer-events-none"
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
    >
      {/* 3D Background Video */}
      <video
        ref={videoRef}
        src={backgroundVideo}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        tabIndex={-1}
        className="absolute right-[-8%] sm:right-[-2%] lg:right-[0%] top-[-5%] w-[120%] sm:w-[95%] lg:w-[66%] max-w-[860px] h-[115%] object-cover opacity-85 transition-opacity duration-1000 motion-reduce-hide"
        style={{
          maskImage:
            "radial-gradient(ellipse 72% 70% at 65% 45%, black 40%, rgba(0,0,0,0.6) 65%, transparent 92%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 72% 70% at 65% 45%, black 40%, rgba(0,0,0,0.6) 65%, transparent 92%)",
          pointerEvents: "none",
        }}
      />

      {/* Reduced-motion / graceful fallback network */}
      <div className="hidden motion-reduce:block">
        <NetworkScene />
      </div>

      {/* Left side soft gradient mask for clear copy contrast */}
      <div
        className="absolute left-0 top-0 bottom-0 w-full md:w-[65%] lg:w-[54%] pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, #F7F7F5 50%, rgba(247,247,245,0.88) 75%, transparent 100%)",
        }}
      />

      {/* Bottom fade into the canvas */}
      <div
        className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
        style={{
          background: "linear-gradient(to top, #F7F7F5, transparent)",
        }}
      />
    </div>
  );
}

/* ============================================================
   SHARED UI
   ============================================================ */
function Eyebrow({ children }) {
  return (
    <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: T.primary }}>
      {children}
    </p>
  );
}

function PrimaryButton({ children, onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-sm font-semibold text-white px-5 py-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 ${className}`}
      style={{
        background: T.primary,
        boxShadow: "0 10px 24px -10px rgba(78,106,191,0.55)",
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-sm font-semibold px-5 py-3 rounded-xl border transition-all duration-200 hover:bg-white hover:border-[#D1D5DB] active:translate-y-0 ${className}`}
      style={{ borderColor: T.border, color: T.text }}
    >
      {children}
    </button>
  );
}

function SectionHeading({ eyebrow, title, sub, center = false }) {
  return (
    <div className={center ? "text-center max-w-2xl mx-auto" : "max-w-xl"}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="text-3xl sm:text-4xl font-bold mt-2.5 leading-tight tracking-tight" style={{ color: T.text }}>
        {title}
      </h2>
      {sub && <p className="text-base mt-3 leading-relaxed" style={{ color: T.muted }}>{sub}</p>}
    </div>
  );
}

/* ============================================================
   NAVBAR
   ============================================================ */
function Navbar({ onSignIn, onGetStarted }) {
  const [open, setOpen] = useState(false);

  const scrollTo = (id) => {
    setOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="sticky top-4 z-50 px-4 sm:px-8">
      <nav
        className="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3 rounded-2xl backdrop-blur-md transition-all duration-200"
        style={{
          background: "rgba(255, 255, 255, 0.85)",
          border: `1px solid ${T.border}`,
          boxShadow: "0 8px 30px -18px rgba(31,42,40,0.18)",
        }}
      >
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm" style={{ background: T.primary }}>
            <span className="text-white text-xs font-bold">P</span>
          </div>
          <span className="font-semibold text-[15px] tracking-tight" style={{ color: T.text }}>PeoplePulse</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: T.muted }}>
          <button onClick={() => scrollTo("product")} className="hover:text-[#1F2A28] transition-colors">
            Product
          </button>
          <button onClick={() => scrollTo("how-it-works")} className="hover:text-[#1F2A28] transition-colors">
            How it works
          </button>
          <button onClick={() => scrollTo("insights")} className="hover:text-[#1F2A28] transition-colors">
            Insights
          </button>
          <button onClick={() => scrollTo("privacy")} className="hover:text-[#1F2A28] transition-colors">
            Privacy
          </button>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={onSignIn}
            className="text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-[#EEF1FA]/60 transition-colors"
            style={{ color: T.text }}
          >
            Sign in
          </button>
          <PrimaryButton onClick={onGetStarted} className="!py-2 !px-4 text-xs font-semibold">
            Get started
          </PrimaryButton>
        </div>

        <button
          className="md:hidden p-1.5 rounded-lg text-[#1F2A28] hover:bg-gray-100"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {open && (
        <div
          className="md:hidden max-w-5xl mx-auto mt-2 p-5 rounded-2xl flex flex-col gap-3 text-sm font-medium shadow-xl backdrop-blur-md"
          style={{ background: "rgba(255, 255, 255, 0.98)", border: `1px solid ${T.border}`, color: T.text }}
        >
          <button onClick={() => scrollTo("product")} className="text-left py-1.5 hover:text-[#4E6ABF]">
            Product
          </button>
          <button onClick={() => scrollTo("how-it-works")} className="text-left py-1.5 hover:text-[#4E6ABF]">
            How it works
          </button>
          <button onClick={() => scrollTo("insights")} className="text-left py-1.5 hover:text-[#4E6ABF]">
            Insights
          </button>
          <button onClick={() => scrollTo("privacy")} className="text-left py-1.5 hover:text-[#4E6ABF]">
            Privacy
          </button>
          <div className="h-px my-1" style={{ background: T.border }} />
          <button onClick={() => { setOpen(false); onSignIn(); }} className="text-left py-1.5 font-medium" style={{ color: T.primary }}>
            Sign in
          </button>
          <PrimaryButton onClick={() => { setOpen(false); onGetStarted(); }} className="justify-center">
            Get started
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MINI DASHBOARD PREVIEW (Harmonized with Application)
   ============================================================ */
function DashboardPreview({ compact = false }) {
  return (
    <div
      className="rounded-2xl bg-white overflow-hidden transition-shadow duration-300"
      style={{
        border: `1px solid ${T.border}`,
        boxShadow: "0 25px 50px -20px rgba(31,42,40,0.18)",
      }}
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: T.border }}>
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ background: T.primary }}>
            P
          </div>
          <span className="text-xs font-semibold" style={{ color: T.text }}>Manager dashboard · Engineering</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: T.positiveBg, color: "#3F7A5C" }}>
            Live
          </span>
          <Bell size={13} style={{ color: T.muted }} />
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3 mb-4">
          {[
            { l: "Engagement", v: "78", sub: "/100", delta: "+4.2%" },
            { l: "Check-in rate", v: "86%", sub: "", delta: "+8%" },
            { l: "Avg. stress", v: "2.4", sub: "/5", delta: "-0.3" },
            { l: "Attention", v: "3", sub: "", delta: "2 med" },
          ].map((k) => (
            <div key={k.l} className="rounded-xl p-2.5 sm:p-3" style={{ background: T.bg }}>
              <p className="text-[10px] font-medium truncate" style={{ color: T.muted }}>{k.l}</p>
              <p className="text-base sm:text-lg font-bold mt-1" style={{ color: T.text }}>
                {k.v}<span className="text-[10px] font-normal" style={{ color: T.muted }}>{k.sub}</span>
              </p>
              <p className="text-[9px] sm:text-[10px] font-medium mt-0.5" style={{ color: "#3F7A5C" }}>
                {k.delta}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 rounded-xl p-3" style={{ background: T.bg }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium" style={{ color: T.muted }}>Engagement trend (4 wks)</p>
              <span className="text-[10px] font-semibold" style={{ color: T.primary }}>+7 pts</span>
            </div>
            <ResponsiveContainer width="100%" height={compact ? 70 : 88}>
              <LineChart data={engagementTrend}>
                <Line type="monotone" dataKey="score" stroke={T.primary} strokeWidth={2.2} dot={{ r: 2, fill: T.primary }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl p-3 flex flex-col items-center justify-center" style={{ background: T.bg }}>
            <ResponsiveContainer width={64} height={64}>
              <PieChart>
                <Pie data={sentimentSplit} dataKey="value" innerRadius={18} outerRadius={30} startAngle={90} endAngle={-270}>
                  {sentimentSplit.map((s, i) => <Cell key={i} fill={s.color} stroke="none" />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <p className="text-[10px] font-medium mt-1" style={{ color: T.muted }}>68% positive</p>
          </div>
        </div>

        <div className="mt-3 rounded-xl p-3 flex gap-2.5 items-start" style={{ background: "#F3F5FC", border: "1px solid #E3E7F5" }}>
          <Sparkles size={13} style={{ color: T.primary, marginTop: 2 }} className="shrink-0" />
          <p className="text-[11px] leading-relaxed" style={{ color: T.text }}>
            Engagement improved this week, with the biggest improvement coming from workload balance and team collaboration.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   HERO WITH 3D VIDEO
   ============================================================ */
function Hero({ onSignIn, onGetStarted }) {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="relative px-4 sm:px-8 pt-12 sm:pt-18 pb-12 overflow-hidden min-h-[580px]">
      {/* Background 3D Video Layer */}
      <Background3DHeroVideo />

      <div className="relative max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <Reveal>
          <div className="relative z-10">
            <Eyebrow>EMPLOYEE ENGAGEMENT · PEOPLE ANALYTICS</Eyebrow>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.12] mt-3 tracking-tight" style={{ color: T.text }}>
              Understand how your people are feeling.
              <span className="block mt-1" style={{ color: T.primary }}>
                Before it becomes a bigger problem.
              </span>
            </h1>
            <p className="text-base mt-5 leading-relaxed max-w-md" style={{ color: T.muted }}>
              PeoplePulse turns simple daily check-ins into meaningful engagement, sentiment, and
              team-health insights — without turning your workplace into a surveillance system.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-8">
              <PrimaryButton onClick={onGetStarted}>
                Get started free <ArrowRight size={15} />
              </PrimaryButton>
              <SecondaryButton onClick={() => scrollTo("how-it-works")}>
                See how it works
              </SecondaryButton>
            </div>
            <div className="flex items-center gap-3 mt-6 text-xs" style={{ color: T.muted }}>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 size={13} style={{ color: T.positive }} /> 60-second check-in
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Lock size={12} style={{ color: T.primary }} /> Privacy-first
              </span>
              <span>·</span>
              <span>No public registration</span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={180}>
          <div className="relative z-10 lg:pl-4">
            <DashboardPreview />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   TRUST STRIP
   ============================================================ */
function TrustStrip() {
  const items = [
    { icon: Lock, label: "Privacy-first design" },
    { icon: Sparkles, label: "AI-assisted insights" },
    { icon: Clock, label: "60-second check-ins" },
    { icon: BarChart3, label: "Actionable team trends" },
  ];
  return (
    <section className="px-4 sm:px-8 py-8">
      <Reveal>
        <div
          className="max-w-5xl mx-auto rounded-2xl px-6 sm:px-10 py-7 text-center transition-shadow"
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            boxShadow: "0 4px 20px -10px rgba(31,42,40,0.06)",
          }}
        >
          <p className="text-sm font-semibold mb-6 tracking-tight" style={{ color: T.text }}>
            Built around better conversations, not employee surveillance.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {items.map((it) => {
              const Icon = it.icon;
              return (
                <div key={it.label} className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#EEF1FA" }}>
                    <Icon size={16} style={{ color: T.primary }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: T.muted }}>{it.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ============================================================
   PROBLEM SECTION
   ============================================================ */
function ProblemSection() {
  const cards = [
    { icon: Flame, title: "Burnout signals", body: "Spot increasing stress patterns early before they escalate into resignations or team burnout." },
    { icon: TrendingDown, title: "Falling engagement", body: "Identify when team morale begins to drift downward, backed by objective longitudinal data." },
    { icon: MessageCircle, title: "Employee voice", body: "Give every team member a safe, regular, low-friction channel to share how they are truly feeling." },
  ];
  return (
    <section className="px-4 sm:px-8 py-16 sm:py-24">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <SectionHeading
            eyebrow="THE CHALLENGE"
            title="Most teams find out too late."
            sub="Burnout, declining engagement, and retention risks rarely appear overnight. PeoplePulse helps leaders recognize meaningful changes early enough to make a difference."
          />
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-5 mt-10">
          {cards.map((c, i) => {
            const Icon = c.icon;
            return (
              <Reveal key={c.title} delay={i * 120}>
                <div
                  className="rounded-2xl p-6 h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                  style={{ background: T.surface, border: `1px solid ${T.border}` }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: "#EEF1FA" }}>
                    <Icon size={18} style={{ color: T.primary }} />
                  </div>
                  <p className="text-base font-semibold tracking-tight" style={{ color: T.text }}>{c.title}</p>
                  <p className="text-sm mt-2 leading-relaxed" style={{ color: T.muted }}>{c.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   HOW IT WORKS
   ============================================================ */
function HowItWorks() {
  const steps = [
    { n: "01", title: "Check in", body: "Employees answer five quick 1–5 ratings and can optionally leave an anonymous comment in 60 seconds." },
    { n: "02", title: "PeoplePulse analyzes", body: "Engagement scores and sentiment are processed automatically into structured trends and risk signals." },
    { n: "03", title: "Managers see the signal", body: "Managers and leaders get aggregated insights and actionable guidance without violating privacy." },
  ];
  return (
    <section id="how-it-works" className="px-4 sm:px-8 py-16 sm:py-24" style={{ background: T.surface }}>
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <SectionHeading
            center
            eyebrow="WORKFLOW"
            title="One minute. Every day. Better visibility."
            sub="A lightweight daily rhythm that builds continuous organizational empathy."
          />
        </Reveal>
        <div className="relative grid sm:grid-cols-3 gap-8 mt-14">
          <div className="hidden sm:block absolute top-5 left-[16%] right-[16%] h-px" style={{ background: T.border }} />
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 150}>
              <div className="relative text-center sm:text-left">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold mx-auto sm:mx-0 relative z-10 shadow-sm"
                  style={{ background: T.primary, color: "white" }}
                >
                  {s.n}
                </div>
                <p className="text-base font-semibold mt-4 tracking-tight" style={{ color: T.text }}>{s.title}</p>
                <p className="text-sm mt-2 leading-relaxed max-w-xs mx-auto sm:mx-0" style={{ color: T.muted }}>{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   PRODUCT SHOWCASE
   ============================================================ */
function ProductShowcase() {
  return (
    <section id="product" className="px-4 sm:px-8 py-16 sm:py-24">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <SectionHeading
            center
            eyebrow="PRODUCT PREVIEW"
            title="From scattered feelings to clear signals."
            sub="See how team health, engagement trajectory, and sentiment come together in one clear view."
          />
        </Reveal>
        <Reveal delay={150}>
          <div className="relative mt-14">
            <div className="hidden md:block absolute -left-6 top-10 text-xs font-semibold px-3.5 py-2 rounded-full shadow-sm z-20" style={{ background: T.positiveBg, color: "#3F7A5C", border: "1px solid #D5E8DD" }}>
              Engagement ↑ 6%
            </div>
            <div className="hidden md:block absolute -right-4 top-20 text-xs font-semibold px-3.5 py-2 rounded-full shadow-sm z-20" style={{ background: T.amberBg, color: "#9A6B1E", border: "1px solid #F5E4C3" }}>
              Stress ↓ 0.3
            </div>
            <div className="hidden md:block absolute -left-4 bottom-16 text-xs font-semibold px-3.5 py-2 rounded-full shadow-sm z-20" style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }}>
              42 check-ins this week
            </div>
            <div className="hidden md:block absolute -right-6 bottom-8 text-xs font-semibold px-3.5 py-2 rounded-full shadow-sm z-20" style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }}>
              🔒 Anonymous feedback enabled
            </div>
            <div className="max-w-2xl mx-auto">
              <DashboardPreview />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   AI INSIGHTS SPLIT
   ============================================================ */
function AIInsightsSection() {
  return (
    <section id="insights" className="px-4 sm:px-8 py-16 sm:py-24" style={{ background: T.surface }}>
      <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <Reveal>
          <div
            className="relative rounded-2xl p-8 h-72 flex items-center justify-center overflow-hidden"
            style={{ background: T.bg, border: `1px solid ${T.border}` }}
          >
            <svg viewBox="0 0 240 160" className="w-full h-full">
              <defs>
                <radialGradient id="aiNode" cx="35%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#EAF0FF" /><stop offset="100%" stopColor={T.primary} />
                </radialGradient>
              </defs>
              {[[40,40,120,30],[120,30,190,60],[40,40,80,110],[80,110,150,120],[150,120,190,60],[120,30,150,120]].map(([x1,y1,x2,y2],i)=>(
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={T.primary} strokeOpacity="0.25" strokeWidth="1.5" />
              ))}
              {[[40,40,7],[120,30,10],[190,60,6],[80,110,8],[150,120,6]].map(([cx,cy,r],i)=>(
                <circle key={i} cx={cx} cy={cy} r={r} fill="url(#aiNode)" style={{ animation: `pp-pulse 4s ease-in-out ${i*0.3}s infinite` }} />
              ))}
            </svg>
            <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur rounded-xl p-3 border text-xs" style={{ borderColor: T.border }}>
              <span className="font-semibold text-[#4E6ABF]">AI Synthesis:</span> Sentiment across engineering improved +6% following sprint re-balancing.
            </div>
          </div>
        </Reveal>
        <Reveal delay={150}>
          <Eyebrow>AI-POWERED INSIGHTS</Eyebrow>
          <h2 className="text-3xl sm:text-4xl font-bold mt-2.5 leading-tight tracking-tight" style={{ color: T.text }}>
            Numbers tell you what changed. Context helps you understand why.
          </h2>
          <p className="text-base mt-4 leading-relaxed" style={{ color: T.muted }}>
            PeoplePulse uses sentiment analysis on optional employee comments to surface concise,
            human-readable insights alongside engagement metrics — without revealing personal identities.
          </p>
          <div className="mt-6 rounded-xl p-4 flex gap-3" style={{ background: "#F3F5FC", border: "1px solid #E3E7F5" }}>
            <Sparkles size={18} style={{ color: T.primary, marginTop: 2 }} className="shrink-0" />
            <div>
              <p className="text-sm font-semibold" style={{ color: T.text }}>Team sentiment improved this week</p>
              <p className="text-xs sm:text-sm mt-1 leading-relaxed" style={{ color: T.muted }}>
                The largest improvement came from workload equilibrium and cross-team collaboration notes.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   PRIVACY SECTION
   ============================================================ */
function PrivacySection() {
  return (
    <section id="privacy" className="px-4 sm:px-8 py-16 sm:py-24" style={{ background: "#EEF1F8" }}>
      <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <Reveal>
          <Eyebrow>PRIVACY BY DESIGN</Eyebrow>
          <h2 className="text-3xl sm:text-4xl font-bold mt-2.5 leading-tight tracking-tight" style={{ color: T.text }}>
            Honest feedback needs trust.
          </h2>
          <p className="text-base mt-4 leading-relaxed max-w-md" style={{ color: T.muted }}>
            When an employee chooses anonymous mode, PeoplePulse is designed so their submission
            cannot be attributed back to them through the application.
          </p>
          <div className="mt-6 space-y-3.5">
            {[
              { icon: EyeOff, t: "No identity attached to responses" },
              { icon: BarChart3, t: "Aggregated team-level insights only" },
              { icon: ShieldCheck, t: "Minimum team-size thresholds for privacy" },
            ].map((it) => {
              const Icon = it.icon;
              return (
                <div key={it.t} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#E0E5F5" }}>
                    <Icon size={14} style={{ color: T.primaryDark }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: T.text }}>{it.t}</span>
                </div>
              );
            })}
          </div>
        </Reveal>

        <Reveal delay={150}>
          <div className="rounded-2xl p-8 bg-white shadow-sm" style={{ border: `1px solid ${T.border}` }}>
            <div className="flex flex-col items-center">
              <div className="text-xs font-semibold px-4 py-1.5 rounded-full" style={{ background: T.bg, color: T.text }}>
                Employee Submits Check-in
              </div>
              <div className="w-px h-6" style={{ background: T.border }} />
              <div className="text-xs font-semibold px-4 py-1.5 rounded-full flex items-center gap-1.5" style={{ background: "#EEF1FA", color: T.primaryDark }}>
                <Lock size={12} /> Anonymous Privacy Barrier
              </div>
              <div className="w-px h-6" style={{ background: T.border }} />
              <div className="grid grid-cols-3 gap-2.5 w-full max-w-xs">
                {["Engagement Index", "Sentiment Trend", "Aggregated Insight"].map((l) => (
                  <div key={l} className="text-center rounded-xl py-3 px-1.5" style={{ background: T.bg }}>
                    <p className="text-[11px] font-medium leading-snug" style={{ color: T.muted }}>{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   MANAGER EXPERIENCE
   ============================================================ */
function ManagerExperience({ onSignIn }) {
  return (
    <section className="px-4 sm:px-8 py-16 sm:py-24">
      <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <Reveal>
          <Eyebrow>FOR MANAGERS</Eyebrow>
          <h2 className="text-3xl sm:text-4xl font-bold mt-2.5 leading-tight tracking-tight" style={{ color: T.text }}>
            See the team, not just the numbers.
          </h2>
          <div className="grid grid-cols-2 gap-4 mt-6 max-w-sm">
            {[
              { l: "Engagement trend", v: "78 / 100" },
              { l: "Team sentiment", v: "68% Positive" },
              { l: "Stress level", v: "2.4 / 5" },
              { l: "Attention needed", v: "3 members" },
            ].map((k) => (
              <div key={k.l} className="p-3 rounded-xl" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <p className="text-xs" style={{ color: T.muted }}>{k.l}</p>
                <p className="text-base sm:text-lg font-bold mt-0.5" style={{ color: T.text }}>{k.v}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl p-4 flex gap-3 max-w-sm" style={{ background: "#F3F5FC" }}>
            <Sparkles size={16} style={{ color: T.primary, marginTop: 2 }} className="shrink-0" />
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: T.text }}>
              Engagement improved after workload decreased in sprint 14.
            </p>
          </div>
          <button
            onClick={onSignIn}
            className="text-sm font-semibold mt-6 flex items-center gap-1.5 hover:underline"
            style={{ color: T.primary }}
          >
            Explore manager insights <ArrowRight size={14} />
          </button>
        </Reveal>

        <Reveal delay={150}>
          <DashboardPreview compact />
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   EMPLOYEE EXPERIENCE
   ============================================================ */
function EmployeeExperience() {
  const faces = ["😣", "🙁", "😐", "🙂", "😄"];
  return (
    <section className="px-4 sm:px-8 py-16 sm:py-24" style={{ background: T.surface }}>
      <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <Reveal className="order-2 lg:order-1">
          <div
            className="mx-auto max-w-[290px] rounded-[2.2rem] p-2.5 transition-transform hover:scale-[1.02] duration-300"
            style={{ background: T.text, boxShadow: "0 30px 60px -25px rgba(31,42,40,0.35)" }}
          >
            <div className="rounded-[1.8rem] p-5" style={{ background: T.surface }}>
              <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <p className="text-sm font-semibold text-center" style={{ color: T.text }}>How are you doing this week?</p>
              <p className="text-[11px] text-center mt-1" style={{ color: T.muted }}>It takes about 60 seconds.</p>
              <div className="flex justify-between mt-5 gap-1">
                {faces.map((f, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-transform"
                    style={{
                      background: i === 3 ? "#EEF1FA" : T.bg,
                      border: i === 3 ? `1.5px solid ${T.primary}` : "none",
                      transform: i === 3 ? "scale(1.1)" : "scale(1)",
                    }}
                  >
                    {f}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl p-2.5 text-[11px]" style={{ background: T.bg, color: T.muted }}>
                Tell us what's on your mind...
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-[11px] flex items-center gap-1 font-medium" style={{ color: T.muted }}>
                  <Lock size={10} /> Anonymous
                </span>
                <div className="w-8 h-4.5 rounded-full p-0.5 flex justify-end" style={{ background: T.primary }}>
                  <div className="w-3.5 h-3.5 bg-white rounded-full" />
                </div>
              </div>
              <div className="mt-4 rounded-xl text-center py-2.5 text-xs font-semibold text-white cursor-default" style={{ background: T.primary }}>
                Submit check-in →
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={150} className="order-1 lg:order-2">
          <Eyebrow>FOR EMPLOYEES</Eyebrow>
          <h2 className="text-3xl sm:text-4xl font-bold mt-2.5 leading-tight tracking-tight" style={{ color: T.text }}>
            For employees, it's just a minute.
          </h2>
          <p className="text-base mt-4 leading-relaxed max-w-sm" style={{ color: T.muted }}>
            Five quick ratings, an optional comment, and the choice to stay anonymous —
            simple enough to actually complete every single week.
          </p>
          <div className="mt-6 flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "#EEF1FA", color: T.primaryDark }}>
              No long tedious surveys
            </span>
            <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: T.positiveBg, color: "#3F7A5C" }}>
              86% check-in rate
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   FEATURE GRID
   ============================================================ */
function FeatureGrid() {
  const features = [
    { icon: ClipboardList, t: "Daily check-ins", d: "60-second frictionless employee experience that team members actually use." },
    { icon: Activity, t: "Engagement scoring", d: "Consistent 0–100 benchmark metric across individuals, squads, and departments." },
    { icon: Sparkles, t: "Sentiment analysis", d: "Natural language processing of optional comments to capture underlying themes." },
    { icon: TrendingUp, t: "Team trends", d: "Longitudinal view to understand whether morale is climbing or slipping over quarters." },
    { icon: AlertTriangle, t: "Risk signals", d: "Early detection of high-stress individuals and teams before attrition happens." },
    { icon: Lock, t: "Anonymous feedback", d: "Iron-clad privacy safeguards protecting employee identity to foster complete honesty." },
  ];
  return (
    <section className="px-4 sm:px-8 py-16 sm:py-24">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <SectionHeading
            center
            eyebrow="CAPABILITIES"
            title="Everything you need, nothing you don't."
            sub="Purpose-built for modern engineering and product teams wanting clear signal."
          />
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.t} delay={(i % 3) * 100}>
                <div
                  className="rounded-2xl p-6 h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                  style={{ background: T.surface, border: `1px solid ${T.border}` }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: "#EEF1FA" }}>
                    <Icon size={18} style={{ color: T.primary }} />
                  </div>
                  <p className="text-sm font-semibold tracking-tight" style={{ color: T.text }}>{f.t}</p>
                  <p className="text-xs mt-2 leading-relaxed" style={{ color: T.muted }}>{f.d}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   FINAL CTA
   ============================================================ */
function FinalCTA({ onSignIn, onGetStarted }) {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="px-4 sm:px-8 py-20">
      <Reveal>
        <div
          className="max-w-4xl mx-auto text-center rounded-3xl px-8 py-16 relative overflow-hidden shadow-2xl"
          style={{ background: `linear-gradient(160deg, ${T.primary}, ${T.primaryDark})` }}
        >
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight tracking-tight">
              Start listening to your organization.
            </h2>
            <p className="text-white/80 mt-4 max-w-md mx-auto leading-relaxed text-sm sm:text-base">
              Give employees a simple way to speak up and managers a clearer way to understand what is changing.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              <button
                onClick={onGetStarted}
                className="text-sm font-semibold px-6 py-3 rounded-xl bg-white flex items-center gap-1.5 transition-transform hover:-translate-y-0.5 hover:shadow-lg"
                style={{ color: T.primaryDark }}
              >
                Get started free <ArrowRight size={15} />
              </button>
              <button
                onClick={() => scrollTo("product")}
                className="text-sm font-semibold px-6 py-3 rounded-xl border border-white/40 text-white hover:bg-white/10 transition-colors"
              >
                Explore the product
              </button>
            </div>
            <p className="text-xs text-white/60 mt-5">60-second daily check-ins · Privacy-first · No credit card required</p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ============================================================
   FOOTER
   ============================================================ */
function Footer({ onSignIn }) {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <footer className="px-4 sm:px-8 py-12 border-t" style={{ borderColor: T.border }}>
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between gap-8">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ background: T.primary }}>
              P
            </div>
            <span className="font-semibold text-sm" style={{ color: T.text }}>PeoplePulse</span>
          </div>
          <p className="text-xs mt-2" style={{ color: T.muted }}>People first. Data second.</p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm font-medium" style={{ color: T.muted }}>
          <button onClick={() => scrollTo("product")} className="hover:text-[#1F2A28] transition-colors">
            Product
          </button>
          <button onClick={() => scrollTo("how-it-works")} className="hover:text-[#1F2A28] transition-colors">
            How it works
          </button>
          <button onClick={() => scrollTo("privacy")} className="hover:text-[#1F2A28] transition-colors">
            Privacy
          </button>
          <button onClick={() => scrollTo("insights")} className="hover:text-[#1F2A28] transition-colors">
            Insights
          </button>
          <button onClick={onSignIn} className="hover:text-[#4E6ABF] transition-colors">
            Sign in
          </button>
        </div>
      </div>
      <p className="text-xs mt-8 text-center sm:text-left max-w-5xl mx-auto" style={{ color: T.muted }}>
        © 2026 PeoplePulse. All rights reserved.
      </p>
    </footer>
  );
}

/* ============================================================
   ROOT HOMEPAGE COMPONENT
   ============================================================ */
export default function PeoplePulseHomepage({ onSignIn, onGetStarted }) {
  const handleSignIn = onSignIn || (() => console.log("Sign in clicked"));
  const handleGetStarted = onGetStarted || handleSignIn;

  return (
    <div style={{ background: T.bg, fontFamily: "Inter, system-ui, sans-serif", color: T.text }}>
      <Navbar onSignIn={handleSignIn} onGetStarted={handleGetStarted} />
      <Hero onSignIn={handleSignIn} onGetStarted={handleGetStarted} />
      <TrustStrip />
      <ProblemSection />
      <HowItWorks />
      <ProductShowcase />
      <AIInsightsSection />
      <PrivacySection />
      <ManagerExperience onSignIn={handleSignIn} />
      <EmployeeExperience />
      <FeatureGrid />
      <FinalCTA onSignIn={handleSignIn} onGetStarted={handleGetStarted} />
      <Footer onSignIn={handleSignIn} />
    </div>
  );
}
