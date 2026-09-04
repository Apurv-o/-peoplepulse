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


    // 6. Verify GEMINI_API_KEY presence
    if (!geminiApiKey) {
      console.warn("[analyze-sentiment] GEMINI_API_KEY secret is not set. Skipping AI processing gracefully.");
      return new Response(
        JSON.stringify({ status: "unavailable", message: "AI processing secret not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Call Gemini API with official structured response_schema
    let sentimentResult: SentimentOutput | null = null;
    try {
      const selectedModel = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
      const candidateModels = [selectedModel, "gemini-2.0-flash", "gemini-1.5-flash"].filter(
        (m, idx, arr) => arr.indexOf(m) === idx
      );

      const prompt = `You are a sentiment analysis engine for an employee pulse engagement tool.
Analyze ONLY the employee feedback comment provided below.
CRITICAL RULES:
- Do NOT infer or mention employee name, identity, email, manager, or attrition risk.
- Do NOT output any chain-of-thought, preamble, or reasoning text.
- Follow strictly the requested JSON schema.

Employee feedback:
"""
${trimmedText}
"""`;

      const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
          response_schema: {
            type: "OBJECT",
            properties: {
              sentiment_label: {
                type: "STRING",
                enum: ["positive", "neutral", "negative"],
              },
              sentiment_score: {
                type: "NUMBER",
                description: "Numeric sentiment score between -1.0 and 1.0",
              },
              ai_summary: {
                type: "STRING",
                description: "Short neutral factual summary in 1 sentence, max 150 characters",
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
          // If 404 (model not available in region/tier), try next fallback model
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
