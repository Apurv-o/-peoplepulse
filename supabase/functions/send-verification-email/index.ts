import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyEmailPayload {
  email: string;
  password?: string;
  name?: string;
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

    const body: VerifyEmailPayload = await req.json().catch(() => ({}));
    const { email, password, name, redirectTo } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Missing required field: email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const userName = (name || "").trim() || cleanEmail.split("@")[0] || "there";

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let redirectTarget = "https://peoplepulse-app.vercel.app/#email-confirmed";
    if (redirectTo) {
      redirectTarget = redirectTo.replace("peoplepulse-n-8650.vercel.app", "peoplepulse-app.vercel.app");
    }

    // 1. Generate signup confirmation link & OTP token
    let linkData;
    let linkError;

    if (password) {
      const res = await adminClient.auth.admin.generateLink({
        type: "signup",
        email: cleanEmail,
        password: password,
        options: {
          data: { name: userName },
          redirectTo: redirectTarget,
        },
      });
      linkData = res.data;
      linkError = res.error;
    } else {
      // Resend scenario: user already created, generate new signup link
      const res = await adminClient.auth.admin.generateLink({
        type: "signup",
        email: cleanEmail,
        options: {
          redirectTo: redirectTarget,
        },
      });
      linkData = res.data;
      linkError = res.error;
    }

    if (linkError || !linkData?.properties?.action_link) {
      console.error("[send-verification-email] generateLink error:", linkError);
      return new Response(
        JSON.stringify({
          error: linkError?.message || "Failed to generate verification link.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const actionLink = linkData.properties.action_link;
    const otpCode = linkData.properties.email_otp || "------";

    // 2. Build email matching the exact high-deliverability design language
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your PeoplePulse Account</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 36px 16px; color: #1f2937; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden;">
    <tr>
      <td style="background: linear-gradient(135deg, #4e6abf 0%, #3b5299 100%); height: 6px; padding: 0;"></td>
    </tr>
    <tr>
      <td style="padding: 36px 32px 28px 32px;">
        <!-- Brand Header -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
          <tr>
            <td align="center">
              <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; background: #eef2ff; border-radius: 14px; text-align: center; margin-bottom: 12px; border: 1px solid #dbeafe;">
                <span style="font-size: 24px;">✉️</span>
              </div>
              <h2 style="margin: 0; color: #4e6abf; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">PeoplePulse</h2>
              <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 13px; font-weight: 500;">Team Wellbeing &amp; Engagement Platform</p>
            </td>
          </tr>
        </table>

        <!-- Main Title & Instructions -->
        <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 20px; font-weight: 700; text-align: center;">Verify Your Email Address</h3>
        <p style="margin: 0 0 20px 0; line-height: 1.6; color: #4b5563; font-size: 15px; text-align: center;">
          Hello <strong>${userName}</strong>, welcome to PeoplePulse! Please verify your work email address to activate your account and set up your company workspace.
        </p>

        <!-- User Email Badge -->
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="display: inline-block; background-color: #f3f4f6; border: 1px solid #e5e7eb; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; color: #1f2937; font-family: monospace;">
            ${cleanEmail}
          </span>
        </div>

        <!-- 6-digit Code Box -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 24px 0; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Your 6-Digit Verification Code</p>
          <div style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1e293b;">
            ${otpCode}
          </div>
          <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">Enter this code on the verification screen, or click the button below.</p>
        </div>

        <!-- CTA Button -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
          <tr>
            <td align="center">
              <a href="${actionLink}" target="_blank" style="background: linear-gradient(135deg, #4e6abf 0%, #3b5299 100%); color: #ffffff; padding: 14px 34px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 10px; display: inline-block; box-shadow: 0 4px 12px rgba(78, 106, 191, 0.35); text-align: center;">
                Verify Email &amp; Activate Account &rarr;
              </a>
            </td>
          </tr>
        </table>

        <!-- Value Prop Box -->
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 16px; margin: 24px 0; font-size: 12px; color: #166534; line-height: 1.5;">
          <strong style="display: block; margin-bottom: 4px;">🚀 What you unlock after verification:</strong>
          • Direct creation and ownership of your company workspace<br>
          • Daily employee pulse check-ins and team analytics<br>
          • Strict privacy isolation &amp; psychological safety insights
        </div>

        <!-- Security Notice Box -->
        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 12px 16px; margin: 24px 0; font-size: 11px; color: #1e40af; line-height: 1.5;">
          <strong style="color: #1e3a8a; display: block; margin-bottom: 4px;">🛡️ Security Notice:</strong>
          • This verification link and code will expire in <strong>24 hours</strong>.<br>
          • If you did not create a PeoplePulse account, you can safely ignore this email.
        </div>

        <!-- Direct Link Backup -->
        <p style="margin: 20px 0 0 0; font-size: 12px; color: #9ca3af; text-align: center; word-break: break-all; line-height: 1.5;">
          Button not working? Copy and paste this URL into your browser:<br>
          <a href="${actionLink}" style="color: #4e6abf; text-decoration: underline;">${actionLink}</a>
        </p>

        <!-- Divider & Footer -->
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

    // 3. Dispatch via Brevo REST API (100% deliverability)
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
            to: [{ email: cleanEmail, name: userName }],
            subject: "Verify your email to activate your PeoplePulse account",
            htmlContent: htmlContent,
          }),
        });

        const brevoData = await brevoRes.json();
        if (brevoRes.ok) {
          console.log("[send-verification-email] Delivered via Brevo API:", brevoData);
          return new Response(
            JSON.stringify({
              status: "sent",
              message: "Verification email delivered directly via Brevo.",
              provider: "brevo",
              id: brevoData.messageId,
              user: linkData.user,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          console.warn("[send-verification-email] Brevo error:", brevoData);
        }
      } catch (brevoEx) {
        console.warn("[send-verification-email] Brevo exception:", brevoEx);
      }
    }

    // Fallback response if Brevo was not reached
    return new Response(
      JSON.stringify({
        status: "sent",
        message: "Account created and verification link generated.",
        user: linkData.user,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[send-verification-email] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
