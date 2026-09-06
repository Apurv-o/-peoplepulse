import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetEmailPayload {
  email: string;
  redirectTo?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const resendApiKey = Deno.env.get("RESEND_INVITE_API_KEY");

    const body: ResetEmailPayload = await req.json().catch(() => ({}));
    const { email, redirectTo } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Missing required field: email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Generate recovery link using admin client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // In Supabase GoTrue Auth, the redirect URL must NOT contain a hash fragment (#...),
    // otherwise GoTrue appends #access_token=..., creating an invalid double-hash (#...#access_token=...)
    // which prevents the client from parsing session tokens and leads to "Auth session missing!".
    let redirectTarget = "https://peoplepulse-app.vercel.app/?type=recovery";
    if (redirectTo) {
      const cleanRedirect = redirectTo.split("#")[0].replace("peoplepulse-n-8650.vercel.app", "peoplepulse-app.vercel.app");
      const sep = cleanRedirect.includes("?") ? "&" : "?";
      redirectTarget = cleanRedirect.includes("type=recovery") ? cleanRedirect : `${cleanRedirect}${sep}type=recovery`;
    }

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: cleanEmail,
      options: {
        redirectTo: redirectTarget,
      },
    });

    // If user does not exist or link creation failed, return generic success to avoid email enumeration
    if (linkError || !linkData?.properties?.action_link) {
      console.warn("[send-reset-password] User not found or generateLink error:", linkError?.message);
      return new Response(
        JSON.stringify({
          status: "sent",
          message: "If an account exists for this email, a password reset link has been dispatched.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resetLink = linkData.properties.action_link;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your PeoplePulse Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 36px 16px; color: #1f2937; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden;">
    <tr>
      <td style="background: linear-gradient(135deg, #4e6abf 0%, #3b5299 100%); height: 6px; padding: 0;"></td>
    </tr>
    <tr>
      <td style="padding: 36px 32px 28px 32px;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
          <tr>
            <td align="center">
              <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background: #eef2ff; border-radius: 12px; text-align: center; margin-bottom: 12px; border: 1px solid #dbeafe;">
                <span style="font-size: 22px; color: #4e6abf; font-weight: 800;">🔐</span>
              </div>
              <h2 style="margin: 0; color: #4e6abf; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">PeoplePulse</h2>
              <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 13px; font-weight: 500;">Team Wellbeing &amp; Engagement Platform</p>
            </td>
          </tr>
        </table>

        <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 20px; font-weight: 700; text-align: center;">Reset Your Password</h3>
        <p style="margin: 0 0 20px 0; line-height: 1.6; color: #4b5563; font-size: 15px; text-align: center;">
          We received a request to reset the password for your PeoplePulse account:
        </p>

        <div style="text-align: center; margin-bottom: 24px;">
          <span style="display: inline-block; background-color: #f3f4f6; border: 1px solid #e5e7eb; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; color: #1f2937; font-family: monospace;">
            ${cleanEmail}
          </span>
        </div>

        <p style="margin: 0 0 24px 0; line-height: 1.6; color: #4b5563; font-size: 14px; text-align: center;">
          Click the button below to choose a new, secure password and regain instant access to your team dashboard.
        </p>

        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
          <tr>
            <td align="center">
              <a href="${resetLink}" target="_blank" style="background: linear-gradient(135deg, #4e6abf 0%, #3b5299 100%); color: #ffffff; padding: 14px 32px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 10px; display: inline-block; box-shadow: 0 4px 10px rgba(78, 106, 191, 0.35); text-align: center;">
                Reset Password &rarr;
              </a>
            </td>
          </tr>
        </table>

        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px 16px; margin: 24px 0; font-size: 12px; color: #1e40af; line-height: 1.5;">
          <strong style="color: #1e3a8a; display: block; margin-bottom: 4px;">🛡️ Security Notice:</strong>
          • This link is single-use and will automatically expire in <strong>1 hour</strong>.<br>
          • If you didn't request a password reset, you can safely disregard this email. Your current password remains secure.
        </div>

        <p style="margin: 20px 0 0 0; font-size: 12px; color: #9ca3af; text-align: center; word-break: break-all; line-height: 1.5;">
          Button not working? Copy and paste this URL into your browser:<br>
          <a href="${resetLink}" style="color: #4e6abf; text-decoration: underline;">${resetLink}</a>
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0 18px 0;">
        <p style="margin: 0 0 6px 0; font-size: 11px; color: #9ca3af; text-align: center;">
          PeoplePulse &bull; Psychological Safety &amp; Confidential Employee Wellbeing Insights
        </p>
        <p style="margin: 0; font-size: 10px; color: #9ca3af; text-align: center;">
          Sent securely from PeoplePulse Auth System. Do not share or forward this link.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // 2. Dispatch via Brevo REST API (100% deliverability)
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
            to: [{ email: cleanEmail }],
            subject: "Reset Your PeoplePulse Password",
            htmlContent: htmlContent,
          }),
        });

        const brevoData = await brevoRes.json();
        if (brevoRes.ok) {
          console.log("[send-reset-password] Delivered successfully via Brevo API:", brevoData);
          return new Response(
            JSON.stringify({
              status: "sent",
              message: "Reset password email delivered directly via Brevo.",
              provider: "brevo",
              id: brevoData.messageId,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          console.warn("[send-reset-password] Brevo error:", brevoData);
        }
      } catch (brevoErr) {
        console.warn("[send-reset-password] Brevo exception:", (brevoErr as Error).message);
      }
    }

    // Fallback: Resend API
    if (resendApiKey) {
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
            to: [cleanEmail],
            subject: "Reset Your PeoplePulse Password",
            html: htmlContent,
          }),
        });

        const resendData = await resendRes.json();
        if (resendRes.ok) {
          return new Response(
            JSON.stringify({
              status: "sent",
              message: "Reset password email delivered successfully via Resend.",
              provider: "resend",
              id: resendData.id,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (resendErr) {
        console.warn("[send-reset-password] Resend exception:", (resendErr as Error).message);
      }
    }

    return new Response(
      JSON.stringify({
        status: "error",
        message: "Failed to dispatch email via configured providers.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-reset-password] Uncaught error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
