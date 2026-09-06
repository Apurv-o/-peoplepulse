/**
 * PeoplePulse — PulseAgent Autonomous HR Copilot Component
 * 
 * Features:
 * - Interactive Copilot Drawer with live streaming execution trace
 * - Safe Agent Execution Events (Goal, Decision, Action, Observation, Evaluation, Adaptation, Final)
 * - Autonomous Activity Log Viewer
 * - Verified Tool Registry Inspector
 * - Zero chain-of-thought exposure
 */

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../lib/auth";
import { useOrganization } from "../lib/organization";
import { AgentEngine } from "../lib/agent/agentEngine";
import { toolRegistry } from "../lib/agent/toolRegistry";
import { agentAudit } from "../lib/agent/agentAudit";
import { AGENT_EVENT_TYPES } from "../lib/agent/agentTypes";
import {
  Sparkles,
  X,
  Send,
  Terminal,
  Activity,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";

const QUICK_PROMPTS = [
  "Investigate Customer Success team burnout and deploy an adaptive question",
  "Audit organization health and draft high-priority interventions",
  "Simulate communication failure and demonstrate autonomous adaptation",
];

export default function AgenticCopilot({ isOpen, onToggle }) {
  const { user, role } = useAuth();
  const { activeOrganization, activeRole } = useOrganization();
  const [activeTab, setActiveTab] = useState("copilot"); // "copilot" | "activity" | "tools"
  const [prompt, setPrompt] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [registeredTools, setRegisteredTools] = useState([]);
  const traceEndRef = useRef(null);

  const effectiveRole = activeRole || role || "employee";
  const orgId = activeOrganization?.id;

  // Load audit activities
  const loadActivities = () => {
    if (orgId) {
      setActivities(agentAudit.getRecent(orgId, 30));
    }
  };

  useEffect(() => {
    loadActivities();
    setRegisteredTools(toolRegistry.getAllTools());

    const handleActivityUpdate = () => {
      loadActivities();
    };
    window.addEventListener("peoplepulse_agent_activity_update", handleActivityUpdate);
    return () => window.removeEventListener("peoplepulse_agent_activity_update", handleActivityUpdate);
  }, [orgId]);

  // Auto scroll trace to bottom
  useEffect(() => {
    if (events.length > 0) {
      traceEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [events]);

  const handleRunGoal = async (goalToRun) => {
    const targetGoal = (goalToRun || prompt).trim();
    if (!targetGoal || isRunning || !orgId) return;

    setIsRunning(true);
    setEvents([]);
    setActiveTab("copilot");

    const engine = new AgentEngine({
      user,
      activeOrganization,
      role: effectiveRole,
    });

    engine.onEvent((event) => {
      setEvents((prev) => [...prev, event]);
      if (event.type === AGENT_EVENT_TYPES.FINAL || event.type === AGENT_EVENT_TYPES.ERROR) {
        setIsRunning(false);
        loadActivities();
      }
    });

    try {
      await engine.run(targetGoal);
    } catch (err) {
      setEvents((prev) => [
        ...prev,
        {
          type: AGENT_EVENT_TYPES.ERROR,
          payload: { message: err.message },
          timestamp: new Date().toISOString(),
        },
      ]);
      setIsRunning(false);
    }
    setPrompt("");
  };

  useEffect(() => {
    window.peoplepulse_run_agent = (g) => handleRunGoal(g);
    return () => {
      delete window.peoplepulse_run_agent;
    };
  });

  return (
    <>
      {/* Floating Trigger Button in Bottom-Right */}
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#4E6ABF] to-[#344A91] text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer group border border-white/20"
        title="Open PulseAgent Autonomous Copilot"
        aria-label="Open PulseAgent Autonomous Copilot"
      >
        <div className="relative">
          <Sparkles size={18} className="animate-pulse" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </div>
        <span className="font-semibold text-sm tracking-tight">PulseAgent</span>
        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/20 text-white/90">
          Copilot
        </span>
      </button>

      {/* Drawer Backdrop on Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-50 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Slide-out Agent Drawer */}
      <aside
        className={`fixed top-0 right-0 h-screen w-full sm:w-[500px] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out border-l border-gray-200 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#4E6ABF] to-[#6A8BE8] flex items-center justify-center text-white shadow-xs">
              <Zap size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#1F2A28]">PulseAgent</h3>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 uppercase">
                  Autonomous HR Copilot
                </span>
              </div>
              <p className="text-[11px] text-gray-500">People intelligence, turned into action.</p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Close PulseAgent"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 text-xs font-semibold bg-white">
          <button
            onClick={() => setActiveTab("copilot")}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === "copilot"
                ? "border-[#4E6ABF] text-[#4E6ABF] bg-blue-50/30"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Terminal size={14} /> Copilot
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === "activity"
                ? "border-[#4E6ABF] text-[#4E6ABF] bg-blue-50/30"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Activity size={14} /> Activity ({activities.length})
          </button>
          <button
            onClick={() => setActiveTab("tools")}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === "tools"
                ? "border-[#4E6ABF] text-[#4E6ABF] bg-blue-50/30"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Wrench size={14} /> Tools ({registeredTools.length})
          </button>
        </div>

        {/* Tab 1: Copilot Execution View */}
        {activeTab === "copilot" && (
          <div className="flex-1 flex flex-col min-h-0 bg-[#FAFAFA]">
            {/* Execution Trace Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {events.length === 0 && !isRunning && (
                <div className="py-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#4E6ABF] flex items-center justify-center mx-auto mb-3">
                    <Sparkles size={24} />
                  </div>
                  <h4 className="font-bold text-sm text-gray-800 mb-1">How can PulseAgent assist today?</h4>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto mb-4">
                    Autonomous reasoning engine capable of diagnosing team health, deploying targeted check-in pulses, and adapting to failures.
                  </p>

                  {/* Quick Prompts */}
                  <div className="space-y-2 text-left">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1">
                      Recommended Goal Presets
                    </p>
                    {QUICK_PROMPTS.map((qp, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleRunGoal(qp)}
                        className="w-full p-2.5 text-left rounded-xl border border-gray-200 bg-white hover:border-[#4E6ABF] hover:bg-blue-50/30 transition-all text-xs font-medium text-gray-700 shadow-xs flex items-center justify-between group"
                      >
                        <span className="line-clamp-2">{qp}</span>
                        <ArrowRight size={13} className="text-gray-300 group-hover:text-[#4E6ABF] shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Render Safe Agent Events */}
              {events.map((ev, idx) => (
                <div key={idx} className="animate-fade-in-up">
                  {/* Event: Goal */}
                  {ev.type === AGENT_EVENT_TYPES.GOAL && (
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-1">
                        <span>🎯</span>
                        <span className="uppercase tracking-wider text-[10px]">Objective Goal</span>
                      </div>
                      <p className="font-semibold text-blue-950">{ev.payload.goal}</p>
                    </div>
                  )}

                  {/* Event: Decision */}
                  {ev.type === AGENT_EVENT_TYPES.DECISION && (
                    <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-200/80 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-purple-900 mb-0.5">
                        <span>🧠</span>
                        <span className="uppercase tracking-wider text-[10px]">Agent Decision</span>
                        <span className="ml-auto font-mono text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">
                          {ev.payload.tool}
                        </span>
                      </div>
                      <p className="text-purple-950">{ev.payload.decision}</p>
                    </div>
                  )}

                  {/* Event: Tool Result */}
                  {ev.type === AGENT_EVENT_TYPES.TOOL_RESULT && (
                    <div className="p-2.5 rounded-xl bg-white border border-gray-200 shadow-2xs text-xs font-mono">
                      <div className="flex items-center gap-1.5 text-gray-500 font-sans mb-1 text-[10px] font-bold uppercase">
                        <span>🔧</span>
                        <span>Action Executed:</span>
                        <span className="text-gray-900 font-bold font-mono">{ev.payload.tool}</span>
                        <span className="ml-auto text-emerald-600 font-sans flex items-center gap-1">
                          <CheckCircle2 size={11} /> Completed
                        </span>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-lg text-[11px] text-gray-700 max-h-36 overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-mono">
                          {JSON.stringify(ev.payload.result, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Event: Observation */}
                  {ev.type === AGENT_EVENT_TYPES.OBSERVATION && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-900 mb-0.5">
                        <span>👁</span>
                        <span className="uppercase tracking-wider text-[10px]">Observation</span>
                      </div>
                      <p className="text-emerald-950 font-medium">{ev.payload.summary}</p>
                      {ev.payload.signals && ev.payload.signals.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {ev.payload.signals.map((sig, sIdx) => (
                            <div key={sIdx} className="text-[11px] text-emerald-800 flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-emerald-500" />
                              <span>{sig}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Event: Evaluation */}
                  {ev.type === AGENT_EVENT_TYPES.EVALUATION && (
                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-0.5">
                        <span>📊</span>
                        <span className="uppercase tracking-wider text-[10px]">Evaluation</span>
                      </div>
                      <p className="text-amber-950">{ev.payload.evaluation}</p>
                    </div>
                  )}

                  {/* Event: Adaptation (Crucial for Hackathon!) */}
                  {ev.type === AGENT_EVENT_TYPES.ADAPTATION && (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 text-xs shadow-xs">
                      <div className="flex items-center gap-1.5 font-bold text-orange-900 mb-1">
                        <span>🔄</span>
                        <span className="uppercase tracking-wider text-[10px]">Autonomous Adaptation Event</span>
                        <span className="ml-auto text-[9px] bg-orange-200 text-orange-900 px-1.5 py-0.5 rounded-full font-bold">
                          Failover Active
                        </span>
                      </div>
                      <p className="text-orange-950 font-medium">{ev.payload.adaptive_strategy}</p>
                      <p className="text-[10px] text-orange-800 mt-1">Trigger: {ev.payload.trigger}</p>
                    </div>
                  )}

                  {/* Event: Final Result */}
                  {ev.type === AGENT_EVENT_TYPES.FINAL && (
                    <div className="p-3.5 rounded-2xl bg-white border-2 border-emerald-500 shadow-md text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800 mb-1.5">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        <span className="uppercase tracking-wider text-[11px]">{ev.payload.title}</span>
                      </div>
                      <div className="space-y-2 mt-2">
                        {ev.payload.findings && (
                          <div>
                            <p className="text-[10px] font-bold uppercase text-gray-500">Key Measured Findings:</p>
                            <ul className="list-disc list-inside text-gray-800 text-[11px] mt-0.5">
                              {ev.payload.findings.map((f, fIdx) => (
                                <li key={fIdx}>{f}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {ev.payload.actions_taken && (
                          <div>
                            <p className="text-[10px] font-bold uppercase text-gray-500">Actions Executed:</p>
                            <ul className="list-disc list-inside text-gray-800 text-[11px] mt-0.5">
                              {ev.payload.actions_taken.map((a, aIdx) => (
                                <li key={aIdx}>{a}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {ev.payload.next_steps && (
                          <div className="pt-1.5 border-t border-gray-100 text-[11px] text-gray-600">
                            <strong>Recommended Next Step:</strong> {ev.payload.next_steps}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Event: Error */}
                  {ev.type === AGENT_EVENT_TYPES.ERROR && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-red-600 shrink-0" />
                      <span>{ev.payload.message}</span>
                    </div>
                  )}
                </div>
              ))}

              {isRunning && (
                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 text-xs text-[#4E6ABF] flex items-center gap-2.5 animate-pulse">
                  <RefreshCw size={14} className="animate-spin" />
                  <span className="font-medium">PulseAgent is evaluating next autonomous action...</span>
                </div>
              )}
              <div ref={traceEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-white border-t border-gray-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRunGoal(prompt);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask PulseAgent to investigate, diagnose, or act..."
                  disabled={isRunning}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#4E6ABF] disabled:bg-gray-50"
                />
                <button
                  type="submit"
                  disabled={isRunning || !prompt.trim()}
                  className="p-2 rounded-xl bg-[#4E6ABF] text-white hover:bg-[#344A91] disabled:opacity-40 transition-colors cursor-pointer"
                  title="Run Goal"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 2: Activity Audit Log View */}
        {activeTab === "activity" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-gray-50">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Autonomous Action Trail
              </p>
              <button
                onClick={() => agentAudit.clear(orgId) || loadActivities()}
                className="text-[10px] text-gray-400 hover:text-red-600"
              >
                Clear History
              </button>
            </div>
            {activities.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                No agent operations recorded yet in this organization session.
              </div>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="p-3 rounded-xl bg-white border border-gray-200 shadow-2xs text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-800 font-mono text-[11px]">{act.tool}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        act.status === "completed"
                          ? "bg-emerald-50 text-emerald-700"
                          : act.status === "failed"
                          ? "bg-red-50 text-red-700"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {act.status}
                    </span>
                  </div>
                  <p className="text-gray-600 text-[11px] mb-1.5">{act.goal}</p>
                  <div className="text-[10px] text-gray-400 flex items-center justify-between pt-1 border-t border-gray-100">
                    <span>{new Date(act.timestamp).toLocaleTimeString()}</span>
                    <span>User: {act.userEmail?.split("@")[0]}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Tool Registry View */}
        {activeTab === "tools" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 mb-3 flex items-center gap-2">
              <ShieldCheck size={16} className="text-blue-600 shrink-0" />
              <span>All agent operations are restricted to allowlisted registered tools with strict tenant scoping.</span>
            </div>
            {registeredTools.map((t) => (
              <div key={t.name} className="p-3 rounded-xl bg-white border border-gray-200 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-gray-900">{t.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-gray-100 text-gray-700 uppercase">
                      {t.risk}
                    </span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 uppercase">
                      {t.permission}+
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-2">{t.description}</p>
                <div className="bg-gray-50 p-2 rounded-lg text-[10px] font-mono text-gray-500">
                  Required: {t.inputSchema?.required?.join(", ") || "none"}
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>
    </>
  );
}
