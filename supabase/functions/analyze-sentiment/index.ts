import { createClient } from "@supabase/supabase-js";

// CORS headers for secure browser invocation
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestPayload {
  checkin_id?: string;
  processing_token?: string;
}

interface SentimentOutput {
  sentiment_label: "positive" | "neutral" | "negative";
  sentiment_score: number;
  ai_summary: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    // 1. Verify caller authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticated user client to verify caller identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: callerError } = await userClient.auth.getUser();
    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Parse checkin_id and processing_token from payload
    const body: RequestPayload = await req.json().catch(() => ({}));
    const { checkin_id, processing_token } = body;

    if (!checkin_id) {
      return new Response(
        JSON.stringify({ error: "Missing checkin_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Read checkin record directly from database as single source of truth
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: checkin, error: checkinError } = await adminClient
      .from("checkins")
      .select("id, user_id, team_id, organization_id, is_anonymous, free_text, processing_token")
      .eq("id", checkin_id)
      .single();

    if (checkinError || !checkin) {
      return new Response(
        JSON.stringify({ error: "Check-in not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Hardened Authorization Checks:
    // - Named check-in: caller MUST be the owner (checkin.user_id === caller.id)
    // - Anonymous check-in:
    //     A. Caller must belong to checkin.team_id
    //     B. Caller MUST provide the matching one-time processing_token generated at submission
    //     C. Token is immediately consumed (set to NULL) to prevent enumeration and replay
    if (!checkin.is_anonymous) {
      if (checkin.user_id !== caller.id) {
        return new Response(
          JSON.stringify({ error: "Forbidden: Not authorized for this check-in" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Verify team membership
      const { data: member } = await adminClient
        .from("team_members")
        .select("team_id")
        .eq("team_id", checkin.team_id)
        .eq("user_id", caller.id)
        .maybeSingle();

      if (!member) {
        return new Response(
          JSON.stringify({ error: "Forbidden: Caller does not belong to the check-in team" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!processing_token) {
        return new Response(
          JSON.stringify({ error: "Forbidden: Missing processing token" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Atomically validate and consume the token in a single database transaction
      // This eliminates race conditions between simultaneous requests.
      const { data: consumed, error: consumeError } = await adminClient.rpc(
        "consume_anonymous_processing_token",
        {
          p_checkin_id: checkin.id,
          p_processing_token: processing_token,
        }
      );

      if (consumeError || !consumed) {
        return new Response(
          JSON.stringify({
            error: "Forbidden: Invalid, missing, or already consumed processing token",
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 5. Source of truth check on database free_text (never trust browser text)
    const trimmedText = checkin.free_text ? checkin.free_text.trim() : "";
    if (!trimmedText) {
      return new Response(
        JSON.stringify({ status: "skipped", message: "free_text is empty" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5b. Verify organization plan & AI quota
    if (checkin.organization_id) {
      const { data: quotaResult, error: quotaError } = await adminClient.rpc(
        "consume_org_ai_quota",
        { p_organization_id: checkin.organization_id }
      );

      if (quotaError || (quotaResult && !quotaResult.allowed)) {
        console.warn(`[analyze-sentiment] AI quota skipped for org ${checkin.organization_id}:`, quotaResult?.reason || quotaError?.message);
        return new Response(
          JSON.stringify({
            status: "quota_exceeded",
            message: quotaResult?.message || "Monthly AI sentiment quota reached for this organization plan.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }


    // 6. Fast-path zero-token dictionary for common feedback phrases
    const normalized = trimmedText.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    const commonPhrases: Record<string, SentimentOutput> = {
      "good": { sentiment_label: "positive", sentiment_score: 0.7, ai_summary: "Employee reports positive feedback." },
      "all good": { sentiment_label: "positive", sentiment_score: 0.8, ai_summary: "All is going well." },
      "great": { sentiment_label: "positive", sentiment_score: 0.9, ai_summary: "Employee reports a great day." },
      "awesome": { sentiment_label: "positive", sentiment_score: 0.9, ai_summary: "Employee reports an awesome experience." },
      "going well": { sentiment_label: "positive", sentiment_score: 0.8, ai_summary: "Work is progressing smoothly." },
      "happy": { sentiment_label: "positive", sentiment_score: 0.85, ai_summary: "Employee expresses satisfaction." },
      "smooth": { sentiment_label: "positive", sentiment_score: 0.75, ai_summary: "Work is running smoothly." },
      "fine": { sentiment_label: "neutral", sentiment_score: 0.1, ai_summary: "Work is proceeding normally." },
      "ok": { sentiment_label: "neutral", sentiment_score: 0.0, ai_summary: "Neutral status." },
      "okay": { sentiment_label: "neutral", sentiment_score: 0.0, ai_summary: "Neutral status." },
      "busy": { sentiment_label: "neutral", sentiment_score: -0.1, ai_summary: "Workload is currently heavy." },
      "average": { sentiment_label: "neutral", sentiment_score: 0.0, ai_summary: "Average workday reported." },
      "tired": { sentiment_label: "negative", sentiment_score: -0.6, ai_summary: "Employee reports fatigue." },
      "exhausted": { sentiment_label: "negative", sentiment_score: -0.85, ai_summary: "Employee reports high exhaustion." },
      "stressed": { sentiment_label: "negative", sentiment_score: -0.75, ai_summary: "Employee reports feeling stressed." },
      "bad": { sentiment_label: "negative", sentiment_score: -0.8, ai_summary: "Employee reports a bad experience." },
      "terrible": { sentiment_label: "negative", sentiment_score: -0.9, ai_summary: "Employee reports a difficult day." },
      "overwhelmed": { sentiment_label: "negative", sentiment_score: -0.85, ai_summary: "Employee feels overwhelmed." },
    };

    let sentimentResult: SentimentOutput | null = commonPhrases[normalized] || null;

    // 7. If not in fast dictionary, call Gemini with strict token-budget limits
    if (!sentimentResult) {
      if (!geminiApiKey) {
        console.warn("[analyze-sentiment] GEMINI_API_KEY secret is not set. Skipping AI processing gracefully.");
        return new Response(
          JSON.stringify({ status: "unavailable", message: "AI processing secret not configured" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        // Priority to lowest token cost and highest throughput models
        const selectedModel = Deno.env.get("GEMINI_MODEL") || "gemini-2.0-flash-lite";
        const candidateModels = [
          selectedModel,
          "gemini-2.0-flash-lite",
          "gemini-1.5-flash",
          "gemini-2.0-flash",
          "gemini-2.5-flash",
        ].filter((m, idx, arr) => arr.indexOf(m) === idx);

        // Cap input text to max 250 chars to prevent accidental large token consumption
        const compactText = trimmedText.slice(0, 250);
        const prompt = `Classify sentiment for pulse feedback: "${compactText}". Output JSON only matching schema.`;

        const requestBody = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: "application/json",
            maxOutputTokens: 80,
            thinkingConfig: {
              thinkingBudget: 0,
            },
            response_schema: {
              type: "OBJECT",
              properties: {
                sentiment_label: {
                  type: "STRING",
                  enum: ["positive", "neutral", "negative"],
                },
                sentiment_score: {
                  type: "NUMBER",
                  description: "Numeric score between -1.0 and 1.0",
                },
                ai_summary: {
                  type: "STRING",
                  description: "Brief factual summary under 15 words",
                },
              },
              required: ["sentiment_label", "sentiment_score", "ai_summary"],
            },
            temperature: 0.1,
          },
        };

        let geminiResponse: Response | null = null;
        let lastErrText = "";

        for (const modelName of candidateModels) {
          const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;
          const res = await fetch(geminiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          });

          if (res.ok) {
            geminiResponse = res;
            break;
          } else {
            lastErrText = await res.text().catch(() => "");
            console.warn(`[Gemini API Warning] Model ${modelName} returned HTTP ${res.status}: ${lastErrText.slice(0, 200)}`);
            if (res.status !== 404) {
              break;
            }
          }
        }

        if (!geminiResponse || !geminiResponse.ok) {
          console.error(`[Gemini API Error] Final failure: ${lastErrText.slice(0, 300)}`);
          return new Response(
            JSON.stringify({ status: "unavailable", message: "Gemini API request failed" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

      const geminiData = await geminiResponse.json();
      const rawJsonString = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawJsonString) {
        throw new Error("Empty content in Gemini response");
      }

      const parsed = JSON.parse(rawJsonString);

      // Validate output fields
      const label = String(parsed.sentiment_label).toLowerCase();
      if (!["positive", "neutral", "negative"].includes(label)) {
        throw new Error(`Invalid sentiment_label: ${label}`);
      }

      let score = Number(parsed.sentiment_score);
      if (isNaN(score)) {
        throw new Error(`Invalid sentiment_score: ${parsed.sentiment_score}`);
      }
      // Clamp to [-1.0, 1.0]
      score = Math.max(-1.0, Math.min(1.0, Math.round(score * 100) / 100));

      const summary = typeof parsed.ai_summary === "string" ? parsed.ai_summary.slice(0, 200) : "";

      sentimentResult = {
        sentiment_label: label as "positive" | "neutral" | "negative",
        sentiment_score: score,
        ai_summary: summary,
      };
    } catch (aiErr) {
      console.error("[Gemini Parsing/Execution Error]", (aiErr as Error).message);
      // Graceful AI failure: does NOT fail the check-in
        return new Response(
          JSON.stringify({ status: "unavailable", message: "AI analysis parsing failed gracefully" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 8. Update sentiment_results via service_role client (only service_role has update permission)
    if (sentimentResult) {
      const { error: updateError } = await adminClient
        .from("sentiment_results")
        .update({
          sentiment_label: sentimentResult.sentiment_label,
          sentiment_score: sentimentResult.sentiment_score,
          ai_summary: sentimentResult.ai_summary,
        })
        .eq("checkin_id", checkin.id);

      if (updateError) {
        console.error("[DB Sentiment Update Error]", updateError.message);
        return new Response(
          JSON.stringify({ status: "error", message: "Failed saving sentiment to database" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        status: "completed",
        checkin_id: checkin.id,
        sentiment: sentimentResult,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[analyze-sentiment Unexpected Error]", (err as Error).message);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
