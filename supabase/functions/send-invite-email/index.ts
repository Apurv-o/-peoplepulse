import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailPayload {
  email: string;
  link: string;
  role?: string;
  orgName?: string;
  teamName?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const resendApiKey = Deno.env.get("RESEND_INVITE_API_KEY");

    // 1. Verify caller authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // 2. Parse request payload
    const body: InviteEmailPayload = await req.json().catch(() => ({}));
    const { email, link, role, orgName, teamName } = body;

    if (!email || !link) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email and link are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!brevoApiKey && !resendApiKey) {
      console.warn("[send-invite-email] Neither BREVO_API_KEY nor RESEND_INVITE_API_KEY is configured.");
      return new Response(
        JSON.stringify({
          status: "unconfigured",
          message: "Email provider secret not set. Invite link generated successfully for manual sharing.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const roleTitle = (role || "employee").charAt(0).toUpperCase() + (role || "employee").slice(1);
    const organizationName = orgName || "your team";
    const teamNotice = teamName ? `<p style="margin: 0 0 16px 0; color: #4b5563; font-size: 14px;"><strong>Assigned Team:</strong> ${teamName}</p>` : "";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>You're invited to join ${organizationName} on PeoplePulse</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 32px 16px; color: #1f2937;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; padding: 36px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="margin-bottom: 24px; text-align: center;">
      <h2 style="margin: 0; color: #4e6abf; font-size: 24px; font-weight: 800;">PeoplePulse</h2>
      <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 13px;">Team Wellbeing & Engagement Platform</p>
    </div>

    <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: 700;">You've been invited!</h3>
    <p style="margin: 0 0 16px 0; line-height: 1.6; color: #374151; font-size: 15px;">
      You have been invited to join <strong>${organizationName}</strong> on PeoplePulse as an <strong>${roleTitle}</strong>.
    </p>

    ${teamNotice}

    <div style="background-color: #f3f4f6; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; color: #4b5563;">
      <p style="margin: 0 0 6px 0; font-weight: 600; color: #1f2937;">⚡ Zero-friction 1-Click Joining:</p>
      <p style="margin: 0;">Your account will be automatically provisioned when you click the link. A default password (<code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">PeoplePulse123!</code>) is pre-filled so you can join instantly.</p>
    </div>

    <div style="text-align: center; margin: 32px 0 24px 0;">
      <a href="${link}" target="_blank" style="background-color: #4e6abf; color: #ffffff; padding: 14px 28px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 10px; display: inline-block; box-shadow: 0 2px 4px rgba(78, 106, 191, 0.3);">
        Accept Invitation &amp; Join &rarr;
      </a>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 12px; color: #9ca3af; text-align: center; word-break: break-all;">
      Or copy and paste this link in your browser:<br>
      <a href="${link}" style="color: #4e6abf; text-decoration: underline;">${link}</a>
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 20px 0;">
    <p style="margin: 0; font-size: 11px; color: #9ca3af; text-align: center;">
      PeoplePulse &bull; Psychological Safety &amp; Confidential Employee Wellbeing Insights
    </p>
  </div>
</body>
</html>
    `;

    // 3. Dispatch via Brevo API (primary, no domain restrictions) or fallback to Resend
    let emailSent = false;
    let lastError: any = null;

    if (brevoApiKey) {
      try {
        const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "cyberworld898@gmail.com";
        const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": brevoApiKey.trim(),
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            sender: { name: "PeoplePulse", email: senderEmail },
            to: [{ email: email }],
            subject: `You're invited to join ${organizationName} on PeoplePulse`,
            htmlContent: htmlContent,
          }),
        });

        const brevoData = await brevoRes.json();
        if (brevoRes.ok) {
          console.log("[send-invite-email] Delivered successfully via Brevo API:", brevoData);
          return new Response(
            JSON.stringify({
              status: "sent",
              message: "Invitation email delivered directly via Brevo.",
              provider: "brevo",
              id: brevoData.messageId,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          console.warn("[send-invite-email] Brevo error:", brevoData);
          lastError = brevoData;
        }
      } catch (brevoErr) {
        console.warn("[send-invite-email] Brevo exception:", (brevoErr as Error).message);
        lastError = (brevoErr as Error).message;
      }
    }

    // Fallback: Resend API
    if (!emailSent && resendApiKey) {
      try {
        const senderEmail = Deno.env.get("RESEND_INVITE_SENDER") || "onboarding@resend.dev";
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `PeoplePulse <${senderEmail}>`,
            to: [email],
            subject: `You're invited to join ${organizationName} on PeoplePulse`,
            html: htmlContent,
          }),
        });

        const resendData = await resendRes.json();
        if (resendRes.ok) {
          return new Response(
            JSON.stringify({
              status: "sent",
              message: "Invitation email delivered successfully via Resend.",
              provider: "resend",
              id: resendData.id,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          lastError = resendData;
        }
      } catch (resendErr) {
        lastError = (resendErr as Error).message;
      }
    }

    return new Response(
      JSON.stringify({
        status: "delivery_warning",
        message: "Failed to deliver email via automated providers.",
        details: lastError,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-invite-email Unexpected Error]", (err as Error).message);
    return new Response(
      JSON.stringify({ error: "Internal server error: " + (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
