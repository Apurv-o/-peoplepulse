/**
 * PeoplePulse Presentation Data Store
 * Contains word-for-word pitch script, stage bounds, ODAEA card schemas,
 * dashboard metrics, audit logs, and technical defense references.
 */

(function(root) {
  'use strict';

  const PRESENTATION_DATA = {
    meta: {
      title: "PeoplePulse — 5-Minute Pitch & Live Demo",
      event: "Tech Zephyr 4.0 | IIT Bhubaneswar — Agentic AI Hackathon",
      duration: 300.0,
      wordCount: 680,
      speakingPace: 136
    },

    // 6 Official Hackathon Stages with strict boundaries
    stages: [
      {
        id: 1,
        key: "goal",
        name: "Goal Context",
        start: 0.0,
        end: 45.0,
        color: "#3B82F6",
        badgeClass: "s-goal",
        description: "Employee burnout crisis & autonomous goal formulation",
        icon: "🎯"
      },
      {
        id: 2,
        key: "decision",
        name: "Decision Framework",
        start: 45.0,
        end: 90.0,
        color: "#8B5CF6",
        badgeClass: "s-dec",
        description: "ReAct reasoning loop via Gemini 2.0 Flash function calling",
        icon: "💡"
      },
      {
        id: 3,
        key: "action",
        name: "Action Execution",
        start: 90.0,
        end: 134.0,
        color: "#64748B",
        badgeClass: "s-act",
        description: "Live Postgres query with server-injected tenant ID",
        icon: "⚙️"
      },
      {
        id: 4,
        key: "evaluation",
        name: "Dynamic Evaluation",
        start: 134.0,
        end: 160.0,
        color: "#F59E0B",
        badgeClass: "s-eval",
        description: "Mathematical evaluation isolating 42% Support burnout",
        icon: "📋"
      },
      {
        id: 5,
        key: "adaptation",
        name: "Failure Adaptation",
        start: 160.0,
        end: 225.0,
        color: "#F97316",
        badgeClass: "s-adapt",
        description: "HTTP 503 failure interception & emergency queue reroute",
        icon: "🛡️"
      },
      {
        id: 6,
        key: "outcome",
        name: "Outcome & Governance",
        start: 225.0,
        end: 300.0,
        color: "#10B981",
        badgeClass: "s-out",
        description: "Resolution synthesis, HITL approval, audit trail & n ≥ 3 privacy",
        icon: "✅"
      }
    ],

    // 27 Official Word-for-Word Subtitle Cues with Token Timing
    cues: [
    {
        "id": "s1_1",
        "stageId": 1,
        "stageName": "Goal Context",
        "stageClass": "s-goal",
        "start": 0.0,
        "end": 8.0,
        "spokenDuration": 7.68,
        "text": "Respected judges, 76% of employees experience burnout before leadership even realizes there is a problem.",
        "tokens": [
            {
                "text": "Respected",
                "start": 0.0,
                "end": 0.51,
                "highlight": false
            },
            {
                "text": "judges,",
                "start": 0.51,
                "end": 1.02,
                "highlight": false
            },
            {
                "text": "76%",
                "start": 1.02,
                "end": 1.54,
                "highlight": true
            },
            {
                "text": "of",
                "start": 1.54,
                "end": 2.05,
                "highlight": false
            },
            {
                "text": "employees",
                "start": 2.05,
                "end": 2.56,
                "highlight": false
            },
            {
                "text": "experience",
                "start": 2.56,
                "end": 3.07,
                "highlight": false
            },
            {
                "text": "burnout",
                "start": 3.07,
                "end": 3.58,
                "highlight": true
            },
            {
                "text": "before",
                "start": 3.58,
                "end": 4.1,
                "highlight": false
            },
            {
                "text": "leadership",
                "start": 4.1,
                "end": 4.61,
                "highlight": true
            },
            {
                "text": "even",
                "start": 4.61,
                "end": 5.12,
                "highlight": false
            },
            {
                "text": "realizes",
                "start": 5.12,
                "end": 5.63,
                "highlight": false
            },
            {
                "text": "there",
                "start": 5.63,
                "end": 6.14,
                "highlight": false
            },
            {
                "text": "is",
                "start": 6.14,
                "end": 6.66,
                "highlight": false
            },
            {
                "text": "a",
                "start": 6.66,
                "end": 7.17,
                "highlight": false
            },
            {
                "text": "problem.",
                "start": 7.17,
                "end": 7.68,
                "highlight": false
            }
        ]
    },
    {
        "id": "s1_2",
        "stageId": 1,
        "stageName": "Goal Context",
        "stageClass": "s-goal",
        "start": 8.0,
        "end": 22.0,
        "spokenDuration": 8.74,
        "text": "Traditional enterprise survey tools—like annual 50-question reviews—fail because of survey fatigue and devastating time lag.",
        "tokens": [
            {
                "text": "Traditional",
                "start": 8.0,
                "end": 8.58,
                "highlight": false
            },
            {
                "text": "enterprise",
                "start": 8.58,
                "end": 9.16,
                "highlight": false
            },
            {
                "text": "survey",
                "start": 9.16,
                "end": 9.75,
                "highlight": false
            },
            {
                "text": "tools—like",
                "start": 9.75,
                "end": 10.33,
                "highlight": false
            },
            {
                "text": "annual",
                "start": 10.33,
                "end": 10.91,
                "highlight": false
            },
            {
                "text": "50-question",
                "start": 10.91,
                "end": 11.49,
                "highlight": true
            },
            {
                "text": "reviews—fail",
                "start": 11.49,
                "end": 12.08,
                "highlight": false
            },
            {
                "text": "because",
                "start": 12.08,
                "end": 12.66,
                "highlight": false
            },
            {
                "text": "of",
                "start": 12.66,
                "end": 13.24,
                "highlight": false
            },
            {
                "text": "survey",
                "start": 13.24,
                "end": 13.82,
                "highlight": false
            },
            {
                "text": "fatigue",
                "start": 13.82,
                "end": 14.41,
                "highlight": false
            },
            {
                "text": "and",
                "start": 14.41,
                "end": 14.99,
                "highlight": false
            },
            {
                "text": "devastating",
                "start": 14.99,
                "end": 15.57,
                "highlight": false
            },
            {
                "text": "time",
                "start": 15.57,
                "end": 16.15,
                "highlight": false
            },
            {
                "text": "lag.",
                "start": 16.15,
                "end": 16.74,
                "highlight": false
            }
        ]
    },
    {
        "id": "s1_3",
        "stageId": 1,
        "stageName": "Goal Context",
        "stageClass": "s-goal",
        "start": 22.0,
        "end": 30.0,
        "spokenDuration": 5.74,
        "text": "By the time HR compiles quarterly reports, top talent has already resigned.",
        "tokens": [
            {
                "text": "By",
                "start": 22.0,
                "end": 22.48,
                "highlight": false
            },
            {
                "text": "the",
                "start": 22.48,
                "end": 22.96,
                "highlight": false
            },
            {
                "text": "time",
                "start": 22.96,
                "end": 23.43,
                "highlight": false
            },
            {
                "text": "HR",
                "start": 23.43,
                "end": 23.91,
                "highlight": true
            },
            {
                "text": "compiles",
                "start": 23.91,
                "end": 24.39,
                "highlight": false
            },
            {
                "text": "quarterly",
                "start": 24.39,
                "end": 24.87,
                "highlight": false
            },
            {
                "text": "reports,",
                "start": 24.87,
                "end": 25.35,
                "highlight": false
            },
            {
                "text": "top",
                "start": 25.35,
                "end": 25.82,
                "highlight": false
            },
            {
                "text": "talent",
                "start": 25.82,
                "end": 26.3,
                "highlight": false
            },
            {
                "text": "has",
                "start": 26.3,
                "end": 26.78,
                "highlight": false
            },
            {
                "text": "already",
                "start": 26.78,
                "end": 27.26,
                "highlight": false
            },
            {
                "text": "resigned.",
                "start": 27.26,
                "end": 27.74,
                "highlight": true
            }
        ]
    },
    {
        "id": "s1_4",
        "stageId": 1,
        "stageName": "Goal Context",
        "stageClass": "s-goal",
        "start": 30.0,
        "end": 45.0,
        "spokenDuration": 15.0,
        "text": "Enter PeoplePulse—the autonomous enterprise HR intelligence platform engineered for Tech Zephyr 4.0. We replace static surveys with 60-second daily micro-pulses, backed by PulseAgent: an autonomous AI agent that doesn’t just graph sentiment, but continuously reasons, diagnoses bottlenecks, and executes organizational interventions.",
        "tokens": [
            {
                "text": "Enter",
                "start": 30.0,
                "end": 30.37,
                "highlight": false
            },
            {
                "text": "PeoplePulse—the",
                "start": 30.37,
                "end": 30.73,
                "highlight": true
            },
            {
                "text": "autonomous",
                "start": 30.73,
                "end": 31.1,
                "highlight": false
            },
            {
                "text": "enterprise",
                "start": 31.1,
                "end": 31.46,
                "highlight": false
            },
            {
                "text": "HR",
                "start": 31.46,
                "end": 31.83,
                "highlight": false
            },
            {
                "text": "intelligence",
                "start": 31.83,
                "end": 32.2,
                "highlight": false
            },
            {
                "text": "platform",
                "start": 32.2,
                "end": 32.56,
                "highlight": false
            },
            {
                "text": "engineered",
                "start": 32.56,
                "end": 32.93,
                "highlight": false
            },
            {
                "text": "for",
                "start": 32.93,
                "end": 33.29,
                "highlight": false
            },
            {
                "text": "Tech",
                "start": 33.29,
                "end": 33.66,
                "highlight": false
            },
            {
                "text": "Zephyr",
                "start": 33.66,
                "end": 34.02,
                "highlight": false
            },
            {
                "text": "4.0.",
                "start": 34.02,
                "end": 34.39,
                "highlight": false
            },
            {
                "text": "We",
                "start": 34.39,
                "end": 34.76,
                "highlight": false
            },
            {
                "text": "replace",
                "start": 34.76,
                "end": 35.12,
                "highlight": false
            },
            {
                "text": "static",
                "start": 35.12,
                "end": 35.49,
                "highlight": false
            },
            {
                "text": "surveys",
                "start": 35.49,
                "end": 35.85,
                "highlight": false
            },
            {
                "text": "with",
                "start": 35.85,
                "end": 36.22,
                "highlight": false
            },
            {
                "text": "60-second",
                "start": 36.22,
                "end": 36.59,
                "highlight": true
            },
            {
                "text": "daily",
                "start": 36.59,
                "end": 36.95,
                "highlight": false
            },
            {
                "text": "micro-pulses,",
                "start": 36.95,
                "end": 37.32,
                "highlight": true
            },
            {
                "text": "backed",
                "start": 37.32,
                "end": 37.68,
                "highlight": false
            },
            {
                "text": "by",
                "start": 37.68,
                "end": 38.05,
                "highlight": false
            },
            {
                "text": "PulseAgent:",
                "start": 38.05,
                "end": 38.41,
                "highlight": true
            },
            {
                "text": "an",
                "start": 38.41,
                "end": 38.78,
                "highlight": false
            },
            {
                "text": "autonomous",
                "start": 38.78,
                "end": 39.15,
                "highlight": false
            },
            {
                "text": "AI",
                "start": 39.15,
                "end": 39.51,
                "highlight": false
            },
            {
                "text": "agent",
                "start": 39.51,
                "end": 39.88,
                "highlight": false
            },
            {
                "text": "that",
                "start": 39.88,
                "end": 40.24,
                "highlight": false
            },
            {
                "text": "doesn’t",
                "start": 40.24,
                "end": 40.61,
                "highlight": false
            },
            {
                "text": "just",
                "start": 40.61,
                "end": 40.98,
                "highlight": false
            },
            {
                "text": "graph",
                "start": 40.98,
                "end": 41.34,
                "highlight": false
            },
            {
                "text": "sentiment,",
                "start": 41.34,
                "end": 41.71,
                "highlight": false
            },
            {
                "text": "but",
                "start": 41.71,
                "end": 42.07,
                "highlight": false
            },
            {
                "text": "continuously",
                "start": 42.07,
                "end": 42.44,
                "highlight": false
            },
            {
                "text": "reasons,",
                "start": 42.44,
                "end": 42.8,
                "highlight": false
            },
            {
                "text": "diagnoses",
                "start": 42.8,
                "end": 43.17,
                "highlight": false
            },
            {
                "text": "bottlenecks,",
                "start": 43.17,
                "end": 43.54,
                "highlight": false
            },
            {
                "text": "and",
                "start": 43.54,
                "end": 43.9,
                "highlight": false
            },
            {
                "text": "executes",
                "start": 43.9,
                "end": 44.27,
                "highlight": false
            },
            {
                "text": "organizational",
                "start": 44.27,
                "end": 44.63,
                "highlight": false
            },
            {
                "text": "interventions.",
                "start": 44.63,
                "end": 45.0,
                "highlight": true
            }
        ]
    },
    {
        "id": "s2_1",
        "stageId": 2,
        "stageName": "Decision Framework",
        "stageClass": "s-dec",
        "start": 45.0,
        "end": 54.0,
        "spokenDuration": 5.18,
        "text": "Now, why is this an Agentic AI problem rather than a simple chatbot?",
        "tokens": [
            {
                "text": "Now,",
                "start": 45.0,
                "end": 45.4,
                "highlight": false
            },
            {
                "text": "why",
                "start": 45.4,
                "end": 45.8,
                "highlight": false
            },
            {
                "text": "is",
                "start": 45.8,
                "end": 46.2,
                "highlight": false
            },
            {
                "text": "this",
                "start": 46.2,
                "end": 46.6,
                "highlight": false
            },
            {
                "text": "an",
                "start": 46.6,
                "end": 46.99,
                "highlight": false
            },
            {
                "text": "Agentic",
                "start": 46.99,
                "end": 47.39,
                "highlight": false
            },
            {
                "text": "AI",
                "start": 47.39,
                "end": 47.79,
                "highlight": false
            },
            {
                "text": "problem",
                "start": 47.79,
                "end": 48.19,
                "highlight": false
            },
            {
                "text": "rather",
                "start": 48.19,
                "end": 48.59,
                "highlight": false
            },
            {
                "text": "than",
                "start": 48.59,
                "end": 48.99,
                "highlight": false
            },
            {
                "text": "a",
                "start": 48.99,
                "end": 49.39,
                "highlight": false
            },
            {
                "text": "simple",
                "start": 49.39,
                "end": 49.79,
                "highlight": false
            },
            {
                "text": "chatbot?",
                "start": 49.79,
                "end": 50.18,
                "highlight": true
            }
        ]
    },
    {
        "id": "s2_2",
        "stageId": 2,
        "stageName": "Decision Framework",
        "stageClass": "s-dec",
        "start": 54.0,
        "end": 67.0,
        "spokenDuration": 10.39,
        "text": "A chatbot merely summarizes text. It has no organizational memory, no schema-validated tools, and cannot take closed-loop actions.",
        "tokens": [
            {
                "text": "A",
                "start": 54.0,
                "end": 54.58,
                "highlight": false
            },
            {
                "text": "chatbot",
                "start": 54.58,
                "end": 55.15,
                "highlight": false
            },
            {
                "text": "merely",
                "start": 55.15,
                "end": 55.73,
                "highlight": false
            },
            {
                "text": "summarizes",
                "start": 55.73,
                "end": 56.31,
                "highlight": true
            },
            {
                "text": "text.",
                "start": 56.31,
                "end": 56.89,
                "highlight": false
            },
            {
                "text": "It",
                "start": 56.89,
                "end": 57.46,
                "highlight": false
            },
            {
                "text": "has",
                "start": 57.46,
                "end": 58.04,
                "highlight": false
            },
            {
                "text": "no",
                "start": 58.04,
                "end": 58.62,
                "highlight": false
            },
            {
                "text": "organizational",
                "start": 58.62,
                "end": 59.2,
                "highlight": false
            },
            {
                "text": "memory,",
                "start": 59.2,
                "end": 59.77,
                "highlight": false
            },
            {
                "text": "no",
                "start": 59.77,
                "end": 60.35,
                "highlight": false
            },
            {
                "text": "schema-validated",
                "start": 60.35,
                "end": 60.93,
                "highlight": false
            },
            {
                "text": "tools,",
                "start": 60.93,
                "end": 61.51,
                "highlight": false
            },
            {
                "text": "and",
                "start": 61.51,
                "end": 62.08,
                "highlight": false
            },
            {
                "text": "cannot",
                "start": 62.08,
                "end": 62.66,
                "highlight": false
            },
            {
                "text": "take",
                "start": 62.66,
                "end": 63.24,
                "highlight": false
            },
            {
                "text": "closed-loop",
                "start": 63.24,
                "end": 63.81,
                "highlight": false
            },
            {
                "text": "actions.",
                "start": 63.81,
                "end": 64.39,
                "highlight": false
            }
        ]
    },
    {
        "id": "s2_3",
        "stageId": 2,
        "stageName": "Decision Framework",
        "stageClass": "s-dec",
        "start": 67.0,
        "end": 79.0,
        "spokenDuration": 11.45,
        "text": "PulseAgent operates on a genuine ReAct (Reason + Act) loop powered by Google Gemini 2.0 Flash Function Calling, backed by our Supabase PostgreSQL architecture.",
        "tokens": [
            {
                "text": "PulseAgent",
                "start": 67.0,
                "end": 67.48,
                "highlight": true
            },
            {
                "text": "operates",
                "start": 67.48,
                "end": 67.95,
                "highlight": false
            },
            {
                "text": "on",
                "start": 67.95,
                "end": 68.43,
                "highlight": false
            },
            {
                "text": "a",
                "start": 68.43,
                "end": 68.91,
                "highlight": false
            },
            {
                "text": "genuine",
                "start": 68.91,
                "end": 69.39,
                "highlight": false
            },
            {
                "text": "ReAct",
                "start": 69.39,
                "end": 69.86,
                "highlight": true
            },
            {
                "text": "(Reason",
                "start": 69.86,
                "end": 70.34,
                "highlight": false
            },
            {
                "text": "+",
                "start": 70.34,
                "end": 70.82,
                "highlight": false
            },
            {
                "text": "Act)",
                "start": 70.82,
                "end": 71.29,
                "highlight": false
            },
            {
                "text": "loop",
                "start": 71.29,
                "end": 71.77,
                "highlight": false
            },
            {
                "text": "powered",
                "start": 71.77,
                "end": 72.25,
                "highlight": false
            },
            {
                "text": "by",
                "start": 72.25,
                "end": 72.72,
                "highlight": false
            },
            {
                "text": "Google",
                "start": 72.72,
                "end": 73.2,
                "highlight": false
            },
            {
                "text": "Gemini",
                "start": 73.2,
                "end": 73.68,
                "highlight": false
            },
            {
                "text": "2.0",
                "start": 73.68,
                "end": 74.16,
                "highlight": false
            },
            {
                "text": "Flash",
                "start": 74.16,
                "end": 74.63,
                "highlight": false
            },
            {
                "text": "Function",
                "start": 74.63,
                "end": 75.11,
                "highlight": false
            },
            {
                "text": "Calling,",
                "start": 75.11,
                "end": 75.59,
                "highlight": false
            },
            {
                "text": "backed",
                "start": 75.59,
                "end": 76.06,
                "highlight": false
            },
            {
                "text": "by",
                "start": 76.06,
                "end": 76.54,
                "highlight": false
            },
            {
                "text": "our",
                "start": 76.54,
                "end": 77.02,
                "highlight": false
            },
            {
                "text": "Supabase",
                "start": 77.02,
                "end": 77.49,
                "highlight": false
            },
            {
                "text": "PostgreSQL",
                "start": 77.49,
                "end": 77.97,
                "highlight": true
            },
            {
                "text": "architecture.",
                "start": 77.97,
                "end": 78.45,
                "highlight": false
            }
        ]
    },
    {
        "id": "s2_4",
        "stageId": 2,
        "stageName": "Decision Framework",
        "stageClass": "s-dec",
        "start": 79.0,
        "end": 85.0,
        "spokenDuration": 6.0,
        "text": "As you can see on the top breadcrumb bar, our agent enforces the strict 6-stage rubric lifecycle: Goal, Decision, Action, Evaluation, Adaptation, and Outcome.",
        "tokens": [
            {
                "text": "As",
                "start": 79.0,
                "end": 79.25,
                "highlight": false
            },
            {
                "text": "you",
                "start": 79.25,
                "end": 79.5,
                "highlight": false
            },
            {
                "text": "can",
                "start": 79.5,
                "end": 79.75,
                "highlight": false
            },
            {
                "text": "see",
                "start": 79.75,
                "end": 80.0,
                "highlight": false
            },
            {
                "text": "on",
                "start": 80.0,
                "end": 80.25,
                "highlight": false
            },
            {
                "text": "the",
                "start": 80.25,
                "end": 80.5,
                "highlight": false
            },
            {
                "text": "top",
                "start": 80.5,
                "end": 80.75,
                "highlight": false
            },
            {
                "text": "breadcrumb",
                "start": 80.75,
                "end": 81.0,
                "highlight": false
            },
            {
                "text": "bar,",
                "start": 81.0,
                "end": 81.25,
                "highlight": false
            },
            {
                "text": "our",
                "start": 81.25,
                "end": 81.5,
                "highlight": false
            },
            {
                "text": "agent",
                "start": 81.5,
                "end": 81.75,
                "highlight": false
            },
            {
                "text": "enforces",
                "start": 81.75,
                "end": 82.0,
                "highlight": false
            },
            {
                "text": "the",
                "start": 82.0,
                "end": 82.25,
                "highlight": false
            },
            {
                "text": "strict",
                "start": 82.25,
                "end": 82.5,
                "highlight": false
            },
            {
                "text": "6-stage",
                "start": 82.5,
                "end": 82.75,
                "highlight": false
            },
            {
                "text": "rubric",
                "start": 82.75,
                "end": 83.0,
                "highlight": false
            },
            {
                "text": "lifecycle:",
                "start": 83.0,
                "end": 83.25,
                "highlight": false
            },
            {
                "text": "Goal,",
                "start": 83.25,
                "end": 83.5,
                "highlight": true
            },
            {
                "text": "Decision,",
                "start": 83.5,
                "end": 83.75,
                "highlight": true
            },
            {
                "text": "Action,",
                "start": 83.75,
                "end": 84.0,
                "highlight": true
            },
            {
                "text": "Evaluation,",
                "start": 84.0,
                "end": 84.25,
                "highlight": true
            },
            {
                "text": "Adaptation,",
                "start": 84.25,
                "end": 84.5,
                "highlight": true
            },
            {
                "text": "and",
                "start": 84.5,
                "end": 84.75,
                "highlight": false
            },
            {
                "text": "Outcome.",
                "start": 84.75,
                "end": 85.0,
                "highlight": true
            }
        ]
    },
    {
        "id": "s2_5",
        "stageId": 2,
        "stageName": "Decision Framework",
        "stageClass": "s-dec",
        "start": 85.0,
        "end": 90.0,
        "spokenDuration": 5.0,
        "text": "Every tool call is governed through an active RBAC policy engine with strict multi-tenant isolation.",
        "tokens": [
            {
                "text": "Every",
                "start": 85.0,
                "end": 85.33,
                "highlight": false
            },
            {
                "text": "tool",
                "start": 85.33,
                "end": 85.67,
                "highlight": false
            },
            {
                "text": "call",
                "start": 85.67,
                "end": 86.0,
                "highlight": false
            },
            {
                "text": "is",
                "start": 86.0,
                "end": 86.33,
                "highlight": false
            },
            {
                "text": "governed",
                "start": 86.33,
                "end": 86.67,
                "highlight": false
            },
            {
                "text": "through",
                "start": 86.67,
                "end": 87.0,
                "highlight": false
            },
            {
                "text": "an",
                "start": 87.0,
                "end": 87.33,
                "highlight": false
            },
            {
                "text": "active",
                "start": 87.33,
                "end": 87.67,
                "highlight": false
            },
            {
                "text": "RBAC",
                "start": 87.67,
                "end": 88.0,
                "highlight": true
            },
            {
                "text": "policy",
                "start": 88.0,
                "end": 88.33,
                "highlight": false
            },
            {
                "text": "engine",
                "start": 88.33,
                "end": 88.67,
                "highlight": false
            },
            {
                "text": "with",
                "start": 88.67,
                "end": 89.0,
                "highlight": false
            },
            {
                "text": "strict",
                "start": 89.0,
                "end": 89.33,
                "highlight": false
            },
            {
                "text": "multi-tenant",
                "start": 89.33,
                "end": 89.67,
                "highlight": false
            },
            {
                "text": "isolation.",
                "start": 89.67,
                "end": 90.0,
                "highlight": false
            }
        ]
    },
    {
        "id": "s3_1",
        "stageId": 3,
        "stageName": "Action Execution",
        "stageClass": "s-act",
        "start": 90.0,
        "end": 95.0,
        "spokenDuration": 3.24,
        "text": "Let’s watch PulseAgent execute live.",
        "tokens": [
            {
                "text": "Let’s",
                "start": 90.0,
                "end": 90.65,
                "highlight": false
            },
            {
                "text": "watch",
                "start": 90.65,
                "end": 91.3,
                "highlight": false
            },
            {
                "text": "PulseAgent",
                "start": 91.3,
                "end": 91.94,
                "highlight": true
            },
            {
                "text": "execute",
                "start": 91.94,
                "end": 92.59,
                "highlight": false
            },
            {
                "text": "live.",
                "start": 92.59,
                "end": 93.24,
                "highlight": false
            }
        ]
    },
    {
        "id": "s3_2",
        "stageId": 3,
        "stageName": "Action Execution",
        "stageClass": "s-act",
        "start": 95.0,
        "end": 107.0,
        "spokenDuration": 9.05,
        "text": "Stage 1: Goal Established. The objective is formulated: diagnose company-wide friction and deploy interventions.",
        "tokens": [
            {
                "text": "Stage",
                "start": 95.0,
                "end": 95.65,
                "highlight": false
            },
            {
                "text": "1:",
                "start": 95.65,
                "end": 96.29,
                "highlight": false
            },
            {
                "text": "Goal",
                "start": 96.29,
                "end": 96.94,
                "highlight": false
            },
            {
                "text": "Established.",
                "start": 96.94,
                "end": 97.59,
                "highlight": false
            },
            {
                "text": "The",
                "start": 97.59,
                "end": 98.23,
                "highlight": false
            },
            {
                "text": "objective",
                "start": 98.23,
                "end": 98.88,
                "highlight": false
            },
            {
                "text": "is",
                "start": 98.88,
                "end": 99.52,
                "highlight": false
            },
            {
                "text": "formulated:",
                "start": 99.52,
                "end": 100.17,
                "highlight": false
            },
            {
                "text": "diagnose",
                "start": 100.17,
                "end": 100.82,
                "highlight": false
            },
            {
                "text": "company-wide",
                "start": 100.82,
                "end": 101.46,
                "highlight": false
            },
            {
                "text": "friction",
                "start": 101.46,
                "end": 102.11,
                "highlight": true
            },
            {
                "text": "and",
                "start": 102.11,
                "end": 102.76,
                "highlight": false
            },
            {
                "text": "deploy",
                "start": 102.76,
                "end": 103.4,
                "highlight": false
            },
            {
                "text": "interventions.",
                "start": 103.4,
                "end": 104.05,
                "highlight": true
            }
        ]
    },
    {
        "id": "s3_3",
        "stageId": 3,
        "stageName": "Action Execution",
        "stageClass": "s-act",
        "start": 107.0,
        "end": 121.0,
        "spokenDuration": 10.82,
        "text": "Stage 2: Decision. Rather than guessing, the agent reasons over its tool registry and autonomously selects get_organization_metrics.",
        "tokens": [
            {
                "text": "Stage",
                "start": 107.0,
                "end": 107.64,
                "highlight": false
            },
            {
                "text": "2:",
                "start": 107.64,
                "end": 108.27,
                "highlight": false
            },
            {
                "text": "Decision.",
                "start": 108.27,
                "end": 108.91,
                "highlight": false
            },
            {
                "text": "Rather",
                "start": 108.91,
                "end": 109.55,
                "highlight": false
            },
            {
                "text": "than",
                "start": 109.55,
                "end": 110.18,
                "highlight": false
            },
            {
                "text": "guessing,",
                "start": 110.18,
                "end": 110.82,
                "highlight": false
            },
            {
                "text": "the",
                "start": 110.82,
                "end": 111.46,
                "highlight": false
            },
            {
                "text": "agent",
                "start": 111.46,
                "end": 112.09,
                "highlight": false
            },
            {
                "text": "reasons",
                "start": 112.09,
                "end": 112.73,
                "highlight": false
            },
            {
                "text": "over",
                "start": 112.73,
                "end": 113.37,
                "highlight": false
            },
            {
                "text": "its",
                "start": 113.37,
                "end": 114.0,
                "highlight": false
            },
            {
                "text": "tool",
                "start": 114.0,
                "end": 114.64,
                "highlight": false
            },
            {
                "text": "registry",
                "start": 114.64,
                "end": 115.28,
                "highlight": false
            },
            {
                "text": "and",
                "start": 115.28,
                "end": 115.91,
                "highlight": false
            },
            {
                "text": "autonomously",
                "start": 115.91,
                "end": 116.55,
                "highlight": false
            },
            {
                "text": "selects",
                "start": 116.55,
                "end": 117.19,
                "highlight": false
            },
            {
                "text": "get_organization_metrics.",
                "start": 117.19,
                "end": 117.82,
                "highlight": true
            }
        ]
    },
    {
        "id": "s3_4",
        "stageId": 3,
        "stageName": "Action Execution",
        "stageClass": "s-act",
        "start": 121.0,
        "end": 134.0,
        "spokenDuration": 13.0,
        "text": "Stage 3: Action. It queries our live Supabase database. Notice in the parameter payload that organization_id was automatically injected from the authenticated session—the LLM is never allowed to fabricate tenant boundaries.",
        "tokens": [
            {
                "text": "Stage",
                "start": 121.0,
                "end": 121.42,
                "highlight": false
            },
            {
                "text": "3:",
                "start": 121.42,
                "end": 121.84,
                "highlight": false
            },
            {
                "text": "Action.",
                "start": 121.84,
                "end": 122.26,
                "highlight": false
            },
            {
                "text": "It",
                "start": 122.26,
                "end": 122.68,
                "highlight": false
            },
            {
                "text": "queries",
                "start": 122.68,
                "end": 123.1,
                "highlight": false
            },
            {
                "text": "our",
                "start": 123.1,
                "end": 123.52,
                "highlight": false
            },
            {
                "text": "live",
                "start": 123.52,
                "end": 123.94,
                "highlight": false
            },
            {
                "text": "Supabase",
                "start": 123.94,
                "end": 124.35,
                "highlight": true
            },
            {
                "text": "database.",
                "start": 124.35,
                "end": 124.77,
                "highlight": false
            },
            {
                "text": "Notice",
                "start": 124.77,
                "end": 125.19,
                "highlight": false
            },
            {
                "text": "in",
                "start": 125.19,
                "end": 125.61,
                "highlight": false
            },
            {
                "text": "the",
                "start": 125.61,
                "end": 126.03,
                "highlight": false
            },
            {
                "text": "parameter",
                "start": 126.03,
                "end": 126.45,
                "highlight": false
            },
            {
                "text": "payload",
                "start": 126.45,
                "end": 126.87,
                "highlight": false
            },
            {
                "text": "that",
                "start": 126.87,
                "end": 127.29,
                "highlight": false
            },
            {
                "text": "organization_id",
                "start": 127.29,
                "end": 127.71,
                "highlight": true
            },
            {
                "text": "was",
                "start": 127.71,
                "end": 128.13,
                "highlight": false
            },
            {
                "text": "automatically",
                "start": 128.13,
                "end": 128.55,
                "highlight": false
            },
            {
                "text": "injected",
                "start": 128.55,
                "end": 128.97,
                "highlight": false
            },
            {
                "text": "from",
                "start": 128.97,
                "end": 129.39,
                "highlight": false
            },
            {
                "text": "the",
                "start": 129.39,
                "end": 129.81,
                "highlight": false
            },
            {
                "text": "authenticated",
                "start": 129.81,
                "end": 130.23,
                "highlight": false
            },
            {
                "text": "session—the",
                "start": 130.23,
                "end": 130.65,
                "highlight": false
            },
            {
                "text": "LLM",
                "start": 130.65,
                "end": 131.06,
                "highlight": false
            },
            {
                "text": "is",
                "start": 131.06,
                "end": 131.48,
                "highlight": false
            },
            {
                "text": "never",
                "start": 131.48,
                "end": 131.9,
                "highlight": false
            },
            {
                "text": "allowed",
                "start": 131.9,
                "end": 132.32,
                "highlight": false
            },
            {
                "text": "to",
                "start": 132.32,
                "end": 132.74,
                "highlight": false
            },
            {
                "text": "fabricate",
                "start": 132.74,
                "end": 133.16,
                "highlight": false
            },
            {
                "text": "tenant",
                "start": 133.16,
                "end": 133.58,
                "highlight": false
            },
            {
                "text": "boundaries.",
                "start": 133.58,
                "end": 134.0,
                "highlight": false
            }
        ]
    },
    {
        "id": "s3_5",
        "stageId": 4,
        "stageName": "Dynamic Evaluation",
        "stageClass": "s-eval",
        "start": 134.0,
        "end": 148.0,
        "spokenDuration": 11.38,
        "text": "Observation: Live data returns: overall company engagement sits at 68%, but Customer Support shows a severe drop to 42% due to shift overload.",
        "tokens": [
            {
                "text": "Observation:",
                "start": 134.0,
                "end": 134.49,
                "highlight": true
            },
            {
                "text": "Live",
                "start": 134.49,
                "end": 134.99,
                "highlight": false
            },
            {
                "text": "data",
                "start": 134.99,
                "end": 135.48,
                "highlight": false
            },
            {
                "text": "returns:",
                "start": 135.48,
                "end": 135.98,
                "highlight": false
            },
            {
                "text": "overall",
                "start": 135.98,
                "end": 136.47,
                "highlight": false
            },
            {
                "text": "company",
                "start": 136.47,
                "end": 136.97,
                "highlight": false
            },
            {
                "text": "engagement",
                "start": 136.97,
                "end": 137.46,
                "highlight": false
            },
            {
                "text": "sits",
                "start": 137.46,
                "end": 137.96,
                "highlight": false
            },
            {
                "text": "at",
                "start": 137.96,
                "end": 138.45,
                "highlight": false
            },
            {
                "text": "68%,",
                "start": 138.45,
                "end": 138.95,
                "highlight": true
            },
            {
                "text": "but",
                "start": 138.95,
                "end": 139.44,
                "highlight": false
            },
            {
                "text": "Customer",
                "start": 139.44,
                "end": 139.94,
                "highlight": false
            },
            {
                "text": "Support",
                "start": 139.94,
                "end": 140.43,
                "highlight": false
            },
            {
                "text": "shows",
                "start": 140.43,
                "end": 140.92,
                "highlight": false
            },
            {
                "text": "a",
                "start": 140.92,
                "end": 141.42,
                "highlight": false
            },
            {
                "text": "severe",
                "start": 141.42,
                "end": 141.91,
                "highlight": false
            },
            {
                "text": "drop",
                "start": 141.91,
                "end": 142.41,
                "highlight": false
            },
            {
                "text": "to",
                "start": 142.41,
                "end": 142.9,
                "highlight": false
            },
            {
                "text": "42%",
                "start": 142.9,
                "end": 143.4,
                "highlight": true
            },
            {
                "text": "due",
                "start": 143.4,
                "end": 143.89,
                "highlight": false
            },
            {
                "text": "to",
                "start": 143.89,
                "end": 144.39,
                "highlight": false
            },
            {
                "text": "shift",
                "start": 144.39,
                "end": 144.88,
                "highlight": false
            },
            {
                "text": "overload.",
                "start": 144.88,
                "end": 145.38,
                "highlight": false
            }
        ]
    },
    {
        "id": "s3_6",
        "stageId": 4,
        "stageName": "Dynamic Evaluation",
        "stageClass": "s-eval",
        "start": 148.0,
        "end": 160.0,
        "spokenDuration": 12.0,
        "text": "Stage 4: Evaluation. The agent parses the numerical observation. It calculates that Customer Support requires an immediate targeted pulse survey and a manager 1:1 action brief.",
        "tokens": [
            {
                "text": "Stage",
                "start": 148.0,
                "end": 148.46,
                "highlight": false
            },
            {
                "text": "4:",
                "start": 148.46,
                "end": 148.92,
                "highlight": false
            },
            {
                "text": "Evaluation.",
                "start": 148.92,
                "end": 149.38,
                "highlight": false
            },
            {
                "text": "The",
                "start": 149.38,
                "end": 149.85,
                "highlight": false
            },
            {
                "text": "agent",
                "start": 149.85,
                "end": 150.31,
                "highlight": false
            },
            {
                "text": "parses",
                "start": 150.31,
                "end": 150.77,
                "highlight": false
            },
            {
                "text": "the",
                "start": 150.77,
                "end": 151.23,
                "highlight": false
            },
            {
                "text": "numerical",
                "start": 151.23,
                "end": 151.69,
                "highlight": false
            },
            {
                "text": "observation.",
                "start": 151.69,
                "end": 152.15,
                "highlight": false
            },
            {
                "text": "It",
                "start": 152.15,
                "end": 152.62,
                "highlight": false
            },
            {
                "text": "calculates",
                "start": 152.62,
                "end": 153.08,
                "highlight": false
            },
            {
                "text": "that",
                "start": 153.08,
                "end": 153.54,
                "highlight": false
            },
            {
                "text": "Customer",
                "start": 153.54,
                "end": 154.0,
                "highlight": false
            },
            {
                "text": "Support",
                "start": 154.0,
                "end": 154.46,
                "highlight": false
            },
            {
                "text": "requires",
                "start": 154.46,
                "end": 154.92,
                "highlight": false
            },
            {
                "text": "an",
                "start": 154.92,
                "end": 155.38,
                "highlight": false
            },
            {
                "text": "immediate",
                "start": 155.38,
                "end": 155.85,
                "highlight": false
            },
            {
                "text": "targeted",
                "start": 155.85,
                "end": 156.31,
                "highlight": false
            },
            {
                "text": "pulse",
                "start": 156.31,
                "end": 156.77,
                "highlight": false
            },
            {
                "text": "survey",
                "start": 156.77,
                "end": 157.23,
                "highlight": false
            },
            {
                "text": "and",
                "start": 157.23,
                "end": 157.69,
                "highlight": false
            },
            {
                "text": "a",
                "start": 157.69,
                "end": 158.15,
                "highlight": false
            },
            {
                "text": "manager",
                "start": 158.15,
                "end": 158.62,
                "highlight": false
            },
            {
                "text": "1:1",
                "start": 158.62,
                "end": 159.08,
                "highlight": false
            },
            {
                "text": "action",
                "start": 159.08,
                "end": 159.54,
                "highlight": false
            },
            {
                "text": "brief.",
                "start": 159.54,
                "end": 160.0,
                "highlight": false
            }
        ]
    },
    {
        "id": "s4_1",
        "stageId": 5,
        "stageName": "Failure Adaptation",
        "stageClass": "s-adapt",
        "start": 160.0,
        "end": 170.0,
        "spokenDuration": 6.86,
        "text": "Now, pay close attention to Stage 5: Adaptation—our primary hackathon differentiator.",
        "tokens": [
            {
                "text": "Now,",
                "start": 160.0,
                "end": 160.62,
                "highlight": false
            },
            {
                "text": "pay",
                "start": 160.62,
                "end": 161.25,
                "highlight": false
            },
            {
                "text": "close",
                "start": 161.25,
                "end": 161.87,
                "highlight": false
            },
            {
                "text": "attention",
                "start": 161.87,
                "end": 162.5,
                "highlight": false
            },
            {
                "text": "to",
                "start": 162.5,
                "end": 163.12,
                "highlight": false
            },
            {
                "text": "Stage",
                "start": 163.12,
                "end": 163.74,
                "highlight": false
            },
            {
                "text": "5:",
                "start": 163.74,
                "end": 164.37,
                "highlight": false
            },
            {
                "text": "Adaptation—our",
                "start": 164.37,
                "end": 164.99,
                "highlight": false
            },
            {
                "text": "primary",
                "start": 164.99,
                "end": 165.62,
                "highlight": false
            },
            {
                "text": "hackathon",
                "start": 165.62,
                "end": 166.24,
                "highlight": false
            },
            {
                "text": "differentiator.",
                "start": 166.24,
                "end": 166.86,
                "highlight": true
            }
        ]
    },
    {
        "id": "s4_2",
        "stageId": 5,
        "stageName": "Failure Adaptation",
        "stageClass": "s-adapt",
        "start": 170.0,
        "end": 188.0,
        "spokenDuration": 14.33,
        "text": "In real-world enterprise environments, external services fail. When PulseAgent attempts to broadcast an escalation alert to an external team webhook, it intercepts a real HTTP 503 service timeout.",
        "tokens": [
            {
                "text": "In",
                "start": 170.0,
                "end": 170.51,
                "highlight": false
            },
            {
                "text": "real-world",
                "start": 170.51,
                "end": 171.02,
                "highlight": false
            },
            {
                "text": "enterprise",
                "start": 171.02,
                "end": 171.54,
                "highlight": false
            },
            {
                "text": "environments,",
                "start": 171.54,
                "end": 172.05,
                "highlight": false
            },
            {
                "text": "external",
                "start": 172.05,
                "end": 172.56,
                "highlight": false
            },
            {
                "text": "services",
                "start": 172.56,
                "end": 173.07,
                "highlight": false
            },
            {
                "text": "fail.",
                "start": 173.07,
                "end": 173.58,
                "highlight": false
            },
            {
                "text": "When",
                "start": 173.58,
                "end": 174.09,
                "highlight": false
            },
            {
                "text": "PulseAgent",
                "start": 174.09,
                "end": 174.61,
                "highlight": false
            },
            {
                "text": "attempts",
                "start": 174.61,
                "end": 175.12,
                "highlight": false
            },
            {
                "text": "to",
                "start": 175.12,
                "end": 175.63,
                "highlight": false
            },
            {
                "text": "broadcast",
                "start": 175.63,
                "end": 176.14,
                "highlight": false
            },
            {
                "text": "an",
                "start": 176.14,
                "end": 176.65,
                "highlight": false
            },
            {
                "text": "escalation",
                "start": 176.65,
                "end": 177.16,
                "highlight": false
            },
            {
                "text": "alert",
                "start": 177.16,
                "end": 177.68,
                "highlight": false
            },
            {
                "text": "to",
                "start": 177.68,
                "end": 178.19,
                "highlight": false
            },
            {
                "text": "an",
                "start": 178.19,
                "end": 178.7,
                "highlight": false
            },
            {
                "text": "external",
                "start": 178.7,
                "end": 179.21,
                "highlight": false
            },
            {
                "text": "team",
                "start": 179.21,
                "end": 179.72,
                "highlight": false
            },
            {
                "text": "webhook,",
                "start": 179.72,
                "end": 180.23,
                "highlight": false
            },
            {
                "text": "it",
                "start": 180.23,
                "end": 180.75,
                "highlight": false
            },
            {
                "text": "intercepts",
                "start": 180.75,
                "end": 181.26,
                "highlight": false
            },
            {
                "text": "a",
                "start": 181.26,
                "end": 181.77,
                "highlight": false
            },
            {
                "text": "real",
                "start": 181.77,
                "end": 182.28,
                "highlight": false
            },
            {
                "text": "HTTP",
                "start": 182.28,
                "end": 182.79,
                "highlight": false
            },
            {
                "text": "503",
                "start": 182.79,
                "end": 183.3,
                "highlight": false
            },
            {
                "text": "service",
                "start": 183.3,
                "end": 183.82,
                "highlight": false
            },
            {
                "text": "timeout.",
                "start": 183.82,
                "end": 184.33,
                "highlight": false
            }
        ]
    },
    {
        "id": "s4_3",
        "stageId": 5,
        "stageName": "Failure Adaptation",
        "stageClass": "s-adapt",
        "start": 188.0,
        "end": 212.0,
        "spokenDuration": 17.33,
        "text": "A standard script would crash or silently drop the notification. PulseAgent catches the network exception, evaluates the failure context, triggers a strategy adaptation event, and autonomously reroutes the escalation to our internal Supabase emergency dispatch queue.",
        "tokens": [
            {
                "text": "A",
                "start": 188.0,
                "end": 188.48,
                "highlight": false
            },
            {
                "text": "standard",
                "start": 188.48,
                "end": 188.96,
                "highlight": false
            },
            {
                "text": "script",
                "start": 188.96,
                "end": 189.44,
                "highlight": false
            },
            {
                "text": "would",
                "start": 189.44,
                "end": 189.93,
                "highlight": false
            },
            {
                "text": "crash",
                "start": 189.93,
                "end": 190.41,
                "highlight": true
            },
            {
                "text": "or",
                "start": 190.41,
                "end": 190.89,
                "highlight": false
            },
            {
                "text": "silently",
                "start": 190.89,
                "end": 191.37,
                "highlight": false
            },
            {
                "text": "drop",
                "start": 191.37,
                "end": 191.85,
                "highlight": false
            },
            {
                "text": "the",
                "start": 191.85,
                "end": 192.33,
                "highlight": false
            },
            {
                "text": "notification.",
                "start": 192.33,
                "end": 192.81,
                "highlight": false
            },
            {
                "text": "PulseAgent",
                "start": 192.81,
                "end": 193.29,
                "highlight": false
            },
            {
                "text": "catches",
                "start": 193.29,
                "end": 193.78,
                "highlight": true
            },
            {
                "text": "the",
                "start": 193.78,
                "end": 194.26,
                "highlight": false
            },
            {
                "text": "network",
                "start": 194.26,
                "end": 194.74,
                "highlight": false
            },
            {
                "text": "exception,",
                "start": 194.74,
                "end": 195.22,
                "highlight": false
            },
            {
                "text": "evaluates",
                "start": 195.22,
                "end": 195.7,
                "highlight": false
            },
            {
                "text": "the",
                "start": 195.7,
                "end": 196.18,
                "highlight": false
            },
            {
                "text": "failure",
                "start": 196.18,
                "end": 196.66,
                "highlight": false
            },
            {
                "text": "context,",
                "start": 196.66,
                "end": 197.15,
                "highlight": false
            },
            {
                "text": "triggers",
                "start": 197.15,
                "end": 197.63,
                "highlight": false
            },
            {
                "text": "a",
                "start": 197.63,
                "end": 198.11,
                "highlight": false
            },
            {
                "text": "strategy",
                "start": 198.11,
                "end": 198.59,
                "highlight": false
            },
            {
                "text": "adaptation",
                "start": 198.59,
                "end": 199.07,
                "highlight": false
            },
            {
                "text": "event,",
                "start": 199.07,
                "end": 199.55,
                "highlight": false
            },
            {
                "text": "and",
                "start": 199.55,
                "end": 200.03,
                "highlight": false
            },
            {
                "text": "autonomously",
                "start": 200.03,
                "end": 200.51,
                "highlight": false
            },
            {
                "text": "reroutes",
                "start": 200.51,
                "end": 201.0,
                "highlight": false
            },
            {
                "text": "the",
                "start": 201.0,
                "end": 201.48,
                "highlight": false
            },
            {
                "text": "escalation",
                "start": 201.48,
                "end": 201.96,
                "highlight": false
            },
            {
                "text": "to",
                "start": 201.96,
                "end": 202.44,
                "highlight": false
            },
            {
                "text": "our",
                "start": 202.44,
                "end": 202.92,
                "highlight": false
            },
            {
                "text": "internal",
                "start": 202.92,
                "end": 203.4,
                "highlight": false
            },
            {
                "text": "Supabase",
                "start": 203.4,
                "end": 203.88,
                "highlight": false
            },
            {
                "text": "emergency",
                "start": 203.88,
                "end": 204.37,
                "highlight": false
            },
            {
                "text": "dispatch",
                "start": 204.37,
                "end": 204.85,
                "highlight": false
            },
            {
                "text": "queue.",
                "start": 204.85,
                "end": 205.33,
                "highlight": false
            }
        ]
    },
    {
        "id": "s4_4",
        "stageId": 5,
        "stageName": "Failure Adaptation",
        "stageClass": "s-adapt",
        "start": 212.0,
        "end": 225.0,
        "spokenDuration": 6.48,
        "text": "Zero message loss, zero human intervention, 100% self-healing resilience.",
        "tokens": [
            {
                "text": "Zero",
                "start": 212.0,
                "end": 212.72,
                "highlight": false
            },
            {
                "text": "message",
                "start": 212.72,
                "end": 213.44,
                "highlight": false
            },
            {
                "text": "loss,",
                "start": 213.44,
                "end": 214.16,
                "highlight": false
            },
            {
                "text": "zero",
                "start": 214.16,
                "end": 214.88,
                "highlight": false
            },
            {
                "text": "human",
                "start": 214.88,
                "end": 215.6,
                "highlight": false
            },
            {
                "text": "intervention,",
                "start": 215.6,
                "end": 216.32,
                "highlight": false
            },
            {
                "text": "100%",
                "start": 216.32,
                "end": 217.04,
                "highlight": false
            },
            {
                "text": "self-healing",
                "start": 217.04,
                "end": 217.76,
                "highlight": false
            },
            {
                "text": "resilience.",
                "start": 217.76,
                "end": 218.48,
                "highlight": false
            }
        ]
    },
    {
        "id": "s5_1",
        "stageId": 6,
        "stageName": "Outcome & Governance",
        "stageClass": "s-out",
        "start": 225.0,
        "end": 238.0,
        "spokenDuration": 11.42,
        "text": "This brings us to Stage 6: Outcome. The agent synthesizes its discoveries, schedules the targeted questions into upcoming check-ins, and confirms execution.",
        "tokens": [
            {
                "text": "This",
                "start": 225.0,
                "end": 225.52,
                "highlight": false
            },
            {
                "text": "brings",
                "start": 225.52,
                "end": 226.04,
                "highlight": false
            },
            {
                "text": "us",
                "start": 226.04,
                "end": 226.56,
                "highlight": false
            },
            {
                "text": "to",
                "start": 226.56,
                "end": 227.08,
                "highlight": false
            },
            {
                "text": "Stage",
                "start": 227.08,
                "end": 227.6,
                "highlight": false
            },
            {
                "text": "6:",
                "start": 227.6,
                "end": 228.12,
                "highlight": false
            },
            {
                "text": "Outcome.",
                "start": 228.12,
                "end": 228.63,
                "highlight": false
            },
            {
                "text": "The",
                "start": 228.63,
                "end": 229.15,
                "highlight": false
            },
            {
                "text": "agent",
                "start": 229.15,
                "end": 229.67,
                "highlight": false
            },
            {
                "text": "synthesizes",
                "start": 229.67,
                "end": 230.19,
                "highlight": true
            },
            {
                "text": "its",
                "start": 230.19,
                "end": 230.71,
                "highlight": false
            },
            {
                "text": "discoveries,",
                "start": 230.71,
                "end": 231.23,
                "highlight": false
            },
            {
                "text": "schedules",
                "start": 231.23,
                "end": 231.75,
                "highlight": false
            },
            {
                "text": "the",
                "start": 231.75,
                "end": 232.27,
                "highlight": false
            },
            {
                "text": "targeted",
                "start": 232.27,
                "end": 232.79,
                "highlight": false
            },
            {
                "text": "questions",
                "start": 232.79,
                "end": 233.31,
                "highlight": false
            },
            {
                "text": "into",
                "start": 233.31,
                "end": 233.83,
                "highlight": false
            },
            {
                "text": "upcoming",
                "start": 233.83,
                "end": 234.35,
                "highlight": false
            },
            {
                "text": "check-ins,",
                "start": 234.35,
                "end": 234.87,
                "highlight": false
            },
            {
                "text": "and",
                "start": 234.87,
                "end": 235.39,
                "highlight": false
            },
            {
                "text": "confirms",
                "start": 235.39,
                "end": 235.9,
                "highlight": false
            },
            {
                "text": "execution.",
                "start": 235.9,
                "end": 236.42,
                "highlight": true
            }
        ]
    },
    {
        "id": "s5_2",
        "stageId": 6,
        "stageName": "Outcome & Governance",
        "stageClass": "s-out",
        "start": 238.0,
        "end": 251.0,
        "spokenDuration": 9.31,
        "text": "For high-risk actions—like department-wide broadcast alerts—our Human-in-the-Loop engine presents an interactive confirmation modal before execution.",
        "tokens": [
            {
                "text": "For",
                "start": 238.0,
                "end": 238.62,
                "highlight": false
            },
            {
                "text": "high-risk",
                "start": 238.62,
                "end": 239.24,
                "highlight": false
            },
            {
                "text": "actions—like",
                "start": 239.24,
                "end": 239.86,
                "highlight": false
            },
            {
                "text": "department-wide",
                "start": 239.86,
                "end": 240.48,
                "highlight": false
            },
            {
                "text": "broadcast",
                "start": 240.48,
                "end": 241.1,
                "highlight": false
            },
            {
                "text": "alerts—our",
                "start": 241.1,
                "end": 241.72,
                "highlight": false
            },
            {
                "text": "Human-in-the-Loop",
                "start": 241.72,
                "end": 242.35,
                "highlight": true
            },
            {
                "text": "engine",
                "start": 242.35,
                "end": 242.97,
                "highlight": false
            },
            {
                "text": "presents",
                "start": 242.97,
                "end": 243.59,
                "highlight": false
            },
            {
                "text": "an",
                "start": 243.59,
                "end": 244.21,
                "highlight": false
            },
            {
                "text": "interactive",
                "start": 244.21,
                "end": 244.83,
                "highlight": false
            },
            {
                "text": "confirmation",
                "start": 244.83,
                "end": 245.45,
                "highlight": false
            },
            {
                "text": "modal",
                "start": 245.45,
                "end": 246.07,
                "highlight": false
            },
            {
                "text": "before",
                "start": 246.07,
                "end": 246.69,
                "highlight": false
            },
            {
                "text": "execution.",
                "start": 246.69,
                "end": 247.31,
                "highlight": false
            }
        ]
    },
    {
        "id": "s5_3",
        "stageId": 6,
        "stageName": "Outcome & Governance",
        "stageClass": "s-out",
        "start": 251.0,
        "end": 265.0,
        "spokenDuration": 13.25,
        "text": "Furthermore, every decision, tool invocation, and adaptation is sanitized by our credential redactor and permanently written to the immutable agent_activity_logs audit table for enterprise compliance.",
        "tokens": [
            {
                "text": "Furthermore,",
                "start": 251.0,
                "end": 251.53,
                "highlight": false
            },
            {
                "text": "every",
                "start": 251.53,
                "end": 252.06,
                "highlight": false
            },
            {
                "text": "decision,",
                "start": 252.06,
                "end": 252.59,
                "highlight": false
            },
            {
                "text": "tool",
                "start": 252.59,
                "end": 253.12,
                "highlight": false
            },
            {
                "text": "invocation,",
                "start": 253.12,
                "end": 253.65,
                "highlight": false
            },
            {
                "text": "and",
                "start": 253.65,
                "end": 254.18,
                "highlight": false
            },
            {
                "text": "adaptation",
                "start": 254.18,
                "end": 254.71,
                "highlight": false
            },
            {
                "text": "is",
                "start": 254.71,
                "end": 255.24,
                "highlight": false
            },
            {
                "text": "sanitized",
                "start": 255.24,
                "end": 255.77,
                "highlight": true
            },
            {
                "text": "by",
                "start": 255.77,
                "end": 256.3,
                "highlight": false
            },
            {
                "text": "our",
                "start": 256.3,
                "end": 256.83,
                "highlight": false
            },
            {
                "text": "credential",
                "start": 256.83,
                "end": 257.36,
                "highlight": false
            },
            {
                "text": "redactor",
                "start": 257.36,
                "end": 257.89,
                "highlight": false
            },
            {
                "text": "and",
                "start": 257.89,
                "end": 258.42,
                "highlight": false
            },
            {
                "text": "permanently",
                "start": 258.42,
                "end": 258.95,
                "highlight": false
            },
            {
                "text": "written",
                "start": 258.95,
                "end": 259.48,
                "highlight": false
            },
            {
                "text": "to",
                "start": 259.48,
                "end": 260.01,
                "highlight": false
            },
            {
                "text": "the",
                "start": 260.01,
                "end": 260.54,
                "highlight": false
            },
            {
                "text": "immutable",
                "start": 260.54,
                "end": 261.07,
                "highlight": false
            },
            {
                "text": "agent_activity_logs",
                "start": 261.07,
                "end": 261.6,
                "highlight": true
            },
            {
                "text": "audit",
                "start": 261.6,
                "end": 262.13,
                "highlight": false
            },
            {
                "text": "table",
                "start": 262.13,
                "end": 262.66,
                "highlight": false
            },
            {
                "text": "for",
                "start": 262.66,
                "end": 263.19,
                "highlight": false
            },
            {
                "text": "enterprise",
                "start": 263.19,
                "end": 263.72,
                "highlight": false
            },
            {
                "text": "compliance.",
                "start": 263.72,
                "end": 264.25,
                "highlight": true
            }
        ]
    },
    {
        "id": "s6_1",
        "stageId": 6,
        "stageName": "Outcome & Governance",
        "stageClass": "s-out",
        "start": 265.0,
        "end": 268.0,
        "spokenDuration": 1.78,
        "text": "Under the hood:",
        "tokens": [
            {
                "text": "Under",
                "start": 265.0,
                "end": 265.59,
                "highlight": false
            },
            {
                "text": "the",
                "start": 265.59,
                "end": 266.18,
                "highlight": false
            },
            {
                "text": "hood:",
                "start": 266.18,
                "end": 266.78,
                "highlight": false
            }
        ]
    },
    {
        "id": "s6_2",
        "stageId": 6,
        "stageName": "Outcome & Governance",
        "stageClass": "s-out",
        "start": 268.0,
        "end": 277.0,
        "spokenDuration": 9.0,
        "text": "1. Zero Data Leaks: We enforce n ≥ 3 differential privacy directly in PostgreSQL, mathematically preventing individual de-anonymization.",
        "tokens": [
            {
                "text": "1.",
                "start": 268.0,
                "end": 268.5,
                "highlight": false
            },
            {
                "text": "Zero",
                "start": 268.5,
                "end": 269.0,
                "highlight": false
            },
            {
                "text": "Data",
                "start": 269.0,
                "end": 269.5,
                "highlight": false
            },
            {
                "text": "Leaks:",
                "start": 269.5,
                "end": 270.0,
                "highlight": false
            },
            {
                "text": "We",
                "start": 270.0,
                "end": 270.5,
                "highlight": false
            },
            {
                "text": "enforce",
                "start": 270.5,
                "end": 271.0,
                "highlight": false
            },
            {
                "text": "n",
                "start": 271.0,
                "end": 271.5,
                "highlight": false
            },
            {
                "text": "≥",
                "start": 271.5,
                "end": 272.0,
                "highlight": false
            },
            {
                "text": "3",
                "start": 272.0,
                "end": 272.5,
                "highlight": false
            },
            {
                "text": "differential",
                "start": 272.5,
                "end": 273.0,
                "highlight": false
            },
            {
                "text": "privacy",
                "start": 273.0,
                "end": 273.5,
                "highlight": false
            },
            {
                "text": "directly",
                "start": 273.5,
                "end": 274.0,
                "highlight": false
            },
            {
                "text": "in",
                "start": 274.0,
                "end": 274.5,
                "highlight": false
            },
            {
                "text": "PostgreSQL,",
                "start": 274.5,
                "end": 275.0,
                "highlight": true
            },
            {
                "text": "mathematically",
                "start": 275.0,
                "end": 275.5,
                "highlight": false
            },
            {
                "text": "preventing",
                "start": 275.5,
                "end": 276.0,
                "highlight": false
            },
            {
                "text": "individual",
                "start": 276.0,
                "end": 276.5,
                "highlight": false
            },
            {
                "text": "de-anonymization.",
                "start": 276.5,
                "end": 277.0,
                "highlight": true
            }
        ]
    },
    {
        "id": "s6_3",
        "stageId": 6,
        "stageName": "Outcome & Governance",
        "stageClass": "s-out",
        "start": 277.0,
        "end": 284.0,
        "spokenDuration": 7.0,
        "text": "2. Bulletproof Security: Row Level Security isolates every tenant, and DB triggers lock down billing columns.",
        "tokens": [
            {
                "text": "2.",
                "start": 277.0,
                "end": 277.44,
                "highlight": false
            },
            {
                "text": "Bulletproof",
                "start": 277.44,
                "end": 277.88,
                "highlight": false
            },
            {
                "text": "Security:",
                "start": 277.88,
                "end": 278.31,
                "highlight": false
            },
            {
                "text": "Row",
                "start": 278.31,
                "end": 278.75,
                "highlight": false
            },
            {
                "text": "Level",
                "start": 278.75,
                "end": 279.19,
                "highlight": false
            },
            {
                "text": "Security",
                "start": 279.19,
                "end": 279.62,
                "highlight": false
            },
            {
                "text": "isolates",
                "start": 279.62,
                "end": 280.06,
                "highlight": false
            },
            {
                "text": "every",
                "start": 280.06,
                "end": 280.5,
                "highlight": false
            },
            {
                "text": "tenant,",
                "start": 280.5,
                "end": 280.94,
                "highlight": false
            },
            {
                "text": "and",
                "start": 280.94,
                "end": 281.38,
                "highlight": false
            },
            {
                "text": "DB",
                "start": 281.38,
                "end": 281.81,
                "highlight": false
            },
            {
                "text": "triggers",
                "start": 281.81,
                "end": 282.25,
                "highlight": false
            },
            {
                "text": "lock",
                "start": 282.25,
                "end": 282.69,
                "highlight": false
            },
            {
                "text": "down",
                "start": 282.69,
                "end": 283.12,
                "highlight": false
            },
            {
                "text": "billing",
                "start": 283.12,
                "end": 283.56,
                "highlight": false
            },
            {
                "text": "columns.",
                "start": 283.56,
                "end": 284.0,
                "highlight": false
            }
        ]
    },
    {
        "id": "s6_4",
        "stageId": 6,
        "stageName": "Outcome & Governance",
        "stageClass": "s-out",
        "start": 284.0,
        "end": 291.0,
        "spokenDuration": 7.0,
        "text": "3. Production Rigor: 23 passing unit tests and an offline fallback planner guarantee zero downtime during presentations.",
        "tokens": [
            {
                "text": "3.",
                "start": 284.0,
                "end": 284.41,
                "highlight": false
            },
            {
                "text": "Production",
                "start": 284.41,
                "end": 284.82,
                "highlight": false
            },
            {
                "text": "Rigor:",
                "start": 284.82,
                "end": 285.24,
                "highlight": false
            },
            {
                "text": "23",
                "start": 285.24,
                "end": 285.65,
                "highlight": false
            },
            {
                "text": "passing",
                "start": 285.65,
                "end": 286.06,
                "highlight": false
            },
            {
                "text": "unit",
                "start": 286.06,
                "end": 286.47,
                "highlight": false
            },
            {
                "text": "tests",
                "start": 286.47,
                "end": 286.88,
                "highlight": false
            },
            {
                "text": "and",
                "start": 286.88,
                "end": 287.29,
                "highlight": false
            },
            {
                "text": "an",
                "start": 287.29,
                "end": 287.71,
                "highlight": false
            },
            {
                "text": "offline",
                "start": 287.71,
                "end": 288.12,
                "highlight": false
            },
            {
                "text": "fallback",
                "start": 288.12,
                "end": 288.53,
                "highlight": false
            },
            {
                "text": "planner",
                "start": 288.53,
                "end": 288.94,
                "highlight": false
            },
            {
                "text": "guarantee",
                "start": 288.94,
                "end": 289.35,
                "highlight": false
            },
            {
                "text": "zero",
                "start": 289.35,
                "end": 289.76,
                "highlight": false
            },
            {
                "text": "downtime",
                "start": 289.76,
                "end": 290.18,
                "highlight": false
            },
            {
                "text": "during",
                "start": 290.18,
                "end": 290.59,
                "highlight": false
            },
            {
                "text": "presentations.",
                "start": 290.59,
                "end": 291.0,
                "highlight": false
            }
        ]
    },
    {
        "id": "s6_5",
        "stageId": 6,
        "stageName": "Outcome & Governance",
        "stageClass": "s-out",
        "start": 291.0,
        "end": 300.0,
        "spokenDuration": 9.0,
        "text": "PeoplePulse doesn’t just watch company burnout happen—it empowers autonomous intelligence to fix it in real-time. Thank you, and we look forward to your questions!",
        "tokens": [
            {
                "text": "PeoplePulse",
                "start": 291.0,
                "end": 291.38,
                "highlight": true
            },
            {
                "text": "doesn’t",
                "start": 291.38,
                "end": 291.75,
                "highlight": false
            },
            {
                "text": "just",
                "start": 291.75,
                "end": 292.12,
                "highlight": false
            },
            {
                "text": "watch",
                "start": 292.12,
                "end": 292.5,
                "highlight": false
            },
            {
                "text": "company",
                "start": 292.5,
                "end": 292.88,
                "highlight": false
            },
            {
                "text": "burnout",
                "start": 292.88,
                "end": 293.25,
                "highlight": true
            },
            {
                "text": "happen—it",
                "start": 293.25,
                "end": 293.62,
                "highlight": false
            },
            {
                "text": "empowers",
                "start": 293.62,
                "end": 294.0,
                "highlight": false
            },
            {
                "text": "autonomous",
                "start": 294.0,
                "end": 294.38,
                "highlight": false
            },
            {
                "text": "intelligence",
                "start": 294.38,
                "end": 294.75,
                "highlight": false
            },
            {
                "text": "to",
                "start": 294.75,
                "end": 295.12,
                "highlight": false
            },
            {
                "text": "fix",
                "start": 295.12,
                "end": 295.5,
                "highlight": false
            },
            {
                "text": "it",
                "start": 295.5,
                "end": 295.88,
                "highlight": false
            },
            {
                "text": "in",
                "start": 295.88,
                "end": 296.25,
                "highlight": false
            },
            {
                "text": "real-time.",
                "start": 296.25,
                "end": 296.62,
                "highlight": false
            },
            {
                "text": "Thank",
                "start": 296.62,
                "end": 297.0,
                "highlight": false
            },
            {
                "text": "you,",
                "start": 297.0,
                "end": 297.38,
                "highlight": false
            },
            {
                "text": "and",
                "start": 297.38,
                "end": 297.75,
                "highlight": false
            },
            {
                "text": "we",
                "start": 297.75,
                "end": 298.12,
                "highlight": false
            },
            {
                "text": "look",
                "start": 298.12,
                "end": 298.5,
                "highlight": false
            },
            {
                "text": "forward",
                "start": 298.5,
                "end": 298.88,
                "highlight": false
            },
            {
                "text": "to",
                "start": 298.88,
                "end": 299.25,
                "highlight": false
            },
            {
                "text": "your",
                "start": 299.25,
                "end": 299.62,
                "highlight": false
            },
            {
                "text": "questions!",
                "start": 299.62,
                "end": 300.0,
                "highlight": false
            }
        ]
    }
],


    // Dashboard Mock Data
    dashboard: {
      organizationName: "Acme Enterprise Corp",
      plan: "Enterprise Tier",
      user: {
        name: "Alex Morgan",
        role: "HR Director",
        avatar: "AM"
      },
      kpis: [
        {
          id: "total_employees",
          label: "Total Employees",
          value: "248",
          sub: "Across 5 Teams",
          trend: "+12 this quarter",
          trendPositive: true
        },
        {
          id: "avg_engagement",
          label: "Company Wellbeing",
          value: "68%",
          sub: "Target: 75%",
          trend: "-2.4% vs last cycle",
          trendPositive: false,
          warning: true
        },
        {
          id: "weekly_participation",
          label: "Weekly Participation",
          value: "84.2%",
          sub: "209 / 248 Active Pulses",
          trend: "+4.1% completion",
          trendPositive: true
        },
        {
          id: "burnout_alert",
          label: "Burnout Risk Alert",
          value: "High Risk",
          sub: "Customer Support (42%)",
          trend: "Shift Overload Flag",
          trendPositive: false,
          critical: true
        }
      ],
      teams: [
        { name: "Customer Support", score: 42, status: "Critical", count: 38, stress: 4.6 },
        { name: "Sales & Account Execs", score: 64, status: "Moderate", count: 52, stress: 3.4 },
        { name: "Engineering", score: 82, status: "Healthy", count: 86, stress: 2.1 },
        { name: "Product Design", score: 79, status: "Healthy", count: 34, stress: 2.4 },
        { name: "Marketing & Growth", score: 73, status: "Moderate", count: 38, stress: 2.9 }
      ],
      dimensions: [
        { label: "Workload Manageability", score: 2.4, max: 5.0, status: "negative" },
        { label: "Manager Coaching & Support", score: 3.8, max: 5.0, status: "amber" },
        { label: "Cross-Team Collaboration", score: 4.1, max: 5.0, status: "positive" },
        { label: "Daily Energy & Motivation", score: 3.2, max: 5.0, status: "amber" },
        { label: "Shift Stress Balance", score: 2.2, max: 5.0, status: "negative" }
      ]
    },

    // ODAEA Event Card Stream definitions with exact timestamps
    eventStream: [
      {
        id: "ev_goal",
        time: 95.0,
        stage: 1,
        type: "goal",
        title: "Stage 1: Goal Established",
        badge: "Autonomous Goal",
        badgeClass: "badge-blue",
        summary: "Diagnose company-wide friction and deploy organizational interventions.",
        details: {
          session_id: "sess_react_9921b",
          objective: "Autonomous investigation of employee sentiment anomaly",
          target_scope: "all_departments",
          governance_mode: "semi_autonomous_with_hitl"
        }
      },
      {
        id: "ev_dec_1",
        time: 107.0,
        stage: 2,
        type: "decision",
        title: "Stage 2: Decision (Step 1)",
        badge: "Checking Company Numbers",
        badgeClass: "badge-purple",
        summary: "Rather than guessing, PulseAgent reasons over its tool registry and autonomously selects get_organization_metrics.",
        details: {
          step: 1,
          model: "Google Gemini 2.0 Flash Function Calling",
          selected_tool: "get_organization_metrics",
          reasoning: "Query baseline organization health metrics to identify departments experiencing anomalous friction or workload spikes."
        }
      },
      {
        id: "ev_act_1",
        time: 121.0,
        stage: 3,
        type: "action",
        title: "Stage 3: Action Executed — Checking Company Numbers",
        badge: "✓ Done",
        badgeClass: "badge-emerald",
        summary: "Checked 142 recent survey responses across 5 teams in PostgreSQL database.",
        callout: "organization_id server-injected from authenticated session token — LLM cannot fabricate tenant boundaries.",
        details: {
          tool: "get_organization_metrics",
          injected_parameters: {
            organization_id: "org_acme_enterprise_9921",
            time_window_days: 30,
            differential_privacy_threshold: 3
          },
          returned_payload: {
            status: "success",
            active_members: 248,
            active_teams: 5,
            recent_checkins_analyzed: 142,
            average_engagement_score: 68,
            dimension_averages: {
              workload: 2.4,
              manager_support: 3.8,
              collaboration: 4.1,
              motivation: 3.2,
              stress_level: 2.2
            },
            health_summary: "Moderate engagement — localized acute friction detected"
          }
        }
      },
      {
        id: "ev_obs_1",
        time: 134.0,
        stage: 4,
        type: "observation",
        title: "Observation: Environment Feedback",
        badge: "Live Telemetry",
        badgeClass: "badge-emerald",
        summary: "Live data returns: overall company engagement sits at 68%, but Customer Support shows a severe drop to 42% due to shift overload.",
        signals: [
          "Organization Average Engagement: 68/100",
          "Customer Support Engagement: 42/100 (Critical Alert)",
          "Stress Level Index: 4.6 / 5.0 (Shift Overload Detected)",
          "Workload Manageability: 1.9 / 5.0 (Unsustainable Sprint Overflow)"
        ],
        details: {
          total_responses: 142,
          critical_department: "Customer Support",
          anomaly_confidence: 0.94
        }
      },
      {
        id: "ev_eval_1",
        time: 148.0,
        stage: 4,
        type: "evaluation",
        title: "Stage 4: Evaluation (Step 1)",
        badge: "Data Evaluation",
        badgeClass: "badge-amber",
        summary: "The agent parses the numerical observation. It calculates that Customer Support requires an immediate targeted pulse survey and a manager 1:1 action brief.",
        details: {
          step: 1,
          severity: "HIGH",
          recommended_actions: [
            "Dispatch adaptive 60-second pulse focusing on shift scheduling fatigue",
            "Generate 3 manager coaching talking points for Customer Support lead",
            "Broadcast emergency escalation alert to department leadership"
          ]
        }
      },
      {
        id: "ev_dec_2",
        time: 165.0,
        stage: 5,
        type: "decision",
        title: "Stage 2: Decision (Step 2 — Alert Dispatch)",
        badge: "simulate_and_handle_failure",
        badgeClass: "badge-purple",
        summary: "Deciding to broadcast escalation alert to external team webhook (slack_webhook_v2).",
        details: {
          step: 2,
          model: "Google Gemini 2.0 Flash Function Calling",
          target_channel: "slack_webhook_v2",
          endpoint: "https://httpstat.us/503?sleep=1000"
        }
      },
      {
        id: "ev_fail_1",
        time: 175.0,
        stage: 5,
        type: "failure_adaptation",
        title: "Stage 5: Adaptation (Failure Interception & Self-Correction)",
        badge: "SELF-CORRECTED",
        badgeClass: "badge-orange-glow",
        isAdaptationHero: true,
        summary: "Primary webhook connection timed out with HTTP 503. Autonomous failover triggered: switching alert delivery to Supabase internal emergency escalation queue.",
        trigger: "Trigger: HTTP 503 Service Unavailable from primary webhook endpoint (slack_webhook_v2, latency: 1218ms)",
        details: {
          scenario: "Controlled Resilience Test Harness (HTTP 503 Interception)",
          error_code: 503,
          duration_ms: 1218,
          adaptation_required: true,
          autonomous_failover: true,
          suggested_fallback: "send_emergency_notification",
          zero_message_loss: true
        }
      },
      {
        id: "ev_act_2",
        time: 205.0,
        stage: 5,
        type: "action",
        title: "Stage 3: Action Executed — Emergency Queue Reroute",
        badge: "✓ DELIVERED",
        badgeClass: "badge-emerald",
        summary: "Urgent alert safely logged and delivered to admin console via backup queue (channel: emergency_in_app_queue, priority: high).",
        details: {
          tool: "send_emergency_notification",
          delivery_channel: "emergency_in_app_queue",
          status: "DELIVERED",
          message_loss: "0%",
          human_intervention_required: 0,
          payload: {
            title: "Urgent: Customer Support Shift Fatigue Alert",
            priority: "CRITICAL",
            failover: true,
            original_channel: "slack_webhook_v2"
          }
        }
      },
      {
        id: "ev_out_1",
        time: 228.0,
        stage: 6,
        type: "outcome",
        title: "Stage 6: Outcome & Final Resolution",
        badge: "Gemini 2.0 Flash",
        badgeClass: "badge-emerald",
        summary: "Autonomous multi-step investigation completed for goal: 'Diagnose company-wide friction and deploy interventions'.",
        stats: [
          { label: "Company Engagement", value: "68 / 100" },
          { label: "Active Employees", value: "248 Members" },
          { label: "Interventions", value: "2 Deployed" },
          { label: "Failover Resilience", value: "100% (Zero Loss)" }
        ],
        discoveries: [
          "Customer Support engagement dropped to 42/100 due to shift scheduling fatigue",
          "Primary notification channel failed (HTTP 503) — autonomously recovered via internal queue",
          "Interventions scheduled without exposing anonymous individual responses (n ≥ 3)"
        ],
        actionsTaken: [
          "Scheduled adaptive survey question: 'How manageable has your shift scheduling been this week?'",
          "Generated 3 manager coaching talking points for Customer Support lead",
          "Emergency alert delivered to admin escalation queue"
        ]
      }
    ],

    // Human-in-the-Loop Dialog specification
    hitlModal: {
      time: 242.0,
      title: "Human-in-the-Loop Governance Required",
      actionName: "broadcast_department_alert",
      description: "PulseAgent requested permission to broadcast an urgent shift workload alert to all 38 members of the Customer Support department.",
      parameters: {
        department: "Customer Support",
        priority: "CRITICAL",
        reason: "42% engagement & 4.6/5 chronic shift fatigue"
      },
      actions: ["Approve Action", "Deny Action"]
    },

    // Audit Trail Table Data
    auditTrail: [
      {
        id: "act_1726078800101",
        timestamp: "2026-09-11 18:20:02",
        goal: "Diagnose friction",
        tool: "get_organization_metrics",
        status: "COMPLETED",
        sanitizedInput: "{\"org_id\": \"[INJECTED]\", \"session_token\": \"[MASKED]\", \"privacy_n\": 3}",
        outcome: "Queried 142 responses across 5 teams. 68% avg score."
      },
      {
        id: "act_1726078800102",
        timestamp: "2026-09-11 18:20:04",
        goal: "Customer Support deep dive",
        tool: "diagnose_team_health",
        status: "COMPLETED",
        sanitizedInput: "{\"team\": \"Customer Support\", \"api_key\": \"[REDACTED]\"}",
        outcome: "Burnout confirmed (42/100, 4.6 stress index)."
      },
      {
        id: "act_1726078800103",
        timestamp: "2026-09-11 18:20:07",
        goal: "Broadcast escalation",
        tool: "simulate_and_handle_failure",
        status: "ADAPTED",
        sanitizedInput: "{\"endpoint\": \"https://httpstat.us/503\", \"bearer\": \"[REDACTED]\"}",
        outcome: "Caught HTTP 503 timeout (1218ms). Autonomous failover triggered."
      },
      {
        id: "act_1726078800104",
        timestamp: "2026-09-11 18:20:09",
        goal: "Failover dispatch",
        tool: "send_emergency_notification",
        status: "COMPLETED",
        sanitizedInput: "{\"channel\": \"emergency_in_app_queue\", \"priority\": \"high\"}",
        outcome: "Delivered to admin emergency queue. Zero message loss."
      },
      {
        id: "act_1726078800105",
        timestamp: "2026-09-11 18:20:12",
        goal: "Intervention deployment",
        tool: "dispatch_adaptive_survey",
        status: "COMPLETED",
        sanitizedInput: "{\"target_team\": \"Customer Support\", \"question_id\": \"q_shift_sched_44\"}",
        outcome: "Scheduled 60-second micro-pulse question into next check-in cycle."
      }
    ],

    // 7 Schema-validated registered tools
    toolsRegistry: [
      {
        name: "get_organization_metrics",
        permission: "manager+",
        risk: "read",
        description: "Returns aggregated team health and engagement metrics for the active organization with n ≥ 3 differential privacy protection."
      },
      {
        name: "diagnose_team_health",
        permission: "manager+",
        risk: "read",
        description: "Performs granular dimension burnout diagnosis (workload, stress, energy) on an identified friction team."
      },
      {
        name: "dispatch_adaptive_survey",
        permission: "manager+",
        risk: "write",
        description: "Schedules a targeted 60-second micro-pulse survey question to the specific team."
      },
      {
        name: "trigger_manager_action_brief",
        permission: "manager+",
        risk: "read",
        description: "Generates private, actionable 1:1 coaching discussion points for department managers."
      },
      {
        name: "list_teams",
        permission: "employee+",
        risk: "read",
        description: "Lists active departments and teams under the authenticated tenant organization."
      },
      {
        name: "send_emergency_notification",
        permission: "manager+",
        risk: "write",
        description: "Autonomously routes urgent alerts to internal Supabase emergency dispatch queue."
      },
      {
        name: "simulate_and_handle_failure",
        permission: "manager+",
        risk: "read",
        description: "Controlled resilience harness testing external webhook failures (HTTP 503) and self-correction."
      }
    ],

    // Developer Terminal Unit Test Output
    testResults: {
      timestamp: "2026-09-11 18:24:11",
      command: "npm run test",
      suites: [
        "PASS src/lib/agent/__tests__/toolRegistry.test.js",
        "PASS src/lib/agent/__tests__/agentPolicy.test.js",
        "PASS src/lib/agent/__tests__/privacyThreshold.test.js",
        "PASS src/lib/agent/__tests__/reactLoop.test.js"
      ],
      summary: {
        testFiles: "4 passed (4)",
        tests: "23 passed (23)",
        time: "511 ms"
      }
    },

    // Technical Q&A Defense Sheet
    qaDefense: [
      {
        question: "How do you prove this is an Agent, not just a scripted if-else flow?",
        answer: "PulseAgent runs a true ReAct loop in agentEngine.js via Gemini 2.0 Flash Function Calling. The model inspects tool signatures, decides execution steps dynamically based on memory history, and dynamically forms parameters. We removed all hardcoded completion short-circuits—the model independently evaluates observations until its goal is satisfied."
      },
      {
        question: "How do you prevent cross-tenant data leaks between companies?",
        answer: "Three-layer enforcement: 1) Policy Layer (agentPolicy.js validates active session org against target org); 2) Context Stripping (client strips organization_id from LLM parameters and server-injects it); and 3) PostgreSQL Row Level Security (Migration 039 queries tenant membership for all reads/writes)."
      },
      {
        question: "What stops a manager from identifying who submitted negative ratings?",
        answer: "We enforce an n ≥ 3 differential privacy threshold in our PostgreSQL RPC (get_org_team_comparison). If a team has fewer than 3 responses in a cycle, sentiment and score aggregations are suppressed to null at the database engine level, making individual deanonymization mathematically impossible."
      },
      {
        question: "What happens if external APIs throttle you or internet drops during live judging?",
        answer: "We engineered a dual-key failover system and a deterministic local fallback planner (geminiClient.js). If API keys fail or network disconnects, the engine seamlessly switches to the local state-machine planner with zero crashes and identical ODAEA event streaming."
      },
      {
        question: "How does failure adaptation actually work under the hood?",
        answer: "In tools.js, simulate_and_handle_failure triggers a real HTTP request to a failing endpoint (503 status). The exception is caught, returning adaptation_required: true. The engine flags an ADAPTATION event, pushes failure telemetry into prompt context, and the planner autonomously selects the in-app emergency dispatch tool."
      }
    ]
  };

  root.PEOPLEPULSE_PRESENTATION_DATA = PRESENTATION_DATA;
})(typeof window !== 'undefined' ? window : globalThis);
