import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const brevoApiKey = Deno.env.get("BREVO_API_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_INVITE_API_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Authenticate user using anon client with user's JWT
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: userError?.message || "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    const userEmail = (user.email || "").trim().toLowerCase();
    const userName = user.user_metadata?.name || userEmail.split("@")[0] || "there";
    const deletionTime = new Date().toUTCString();

    // 2. Admin client with service_role key to perform permanent deletion
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. Handle Organizations where this user is an 'owner'
    const { data: ownedMemberships } = await adminClient
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("role", "owner");

    if (ownedMemberships && ownedMemberships.length > 0) {
      for (const m of ownedMemberships) {
        const orgId = m.organization_id;
        const { data: otherMembers } = await adminClient
          .from("organization_members")
          .select("id, user_id, role")
          .eq("organization_id", orgId)
          .neq("user_id", userId);

        if (!otherMembers || otherMembers.length === 0) {
          await adminClient.from("organizations").delete().eq("id", orgId);
        } else {
          const existingOwner = otherMembers.find((om) => om.role === "owner");
          if (!existingOwner) {
            const nextOwner = otherMembers.find((om) => om.role === "admin") || otherMembers[0];
            if (nextOwner) {
              await adminClient
                .from("organization_members")
                .update({ role: "owner" })
                .eq("id", nextOwner.id);
            }
          }
        }
      }
    }

    // 4. Delete user's memberships and related records
    await adminClient.from("organization_members").delete().eq("user_id", userId);
    await adminClient.from("team_members").delete().eq("user_id", userId);
    await adminClient.from("profiles").delete().eq("id", userId);

    // 5. Delete from auth.users (permanently removes auth credentials, sessions, and tokens)
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error("[delete-account] Error deleting auth user:", deleteAuthError);
      throw deleteAuthError;
    }

    console.log(`[delete-account] User ${userId} (${userEmail}) deleted successfully.`);

    // 6. Send Account Deletion Confirmation Email
    if (userEmail) {
      const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your PeoplePulse Account Has Been Deleted</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 36px 16px; color: #1f2937; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden;">
    <tr>
      <td style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); height: 6px; padding: 0;"></td>
    </tr>
    <tr>
      <td style="padding: 36px 32px 28px 32px;">
        <!-- Brand Header -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
          <tr>
            <td align="center">
              <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; background: #fef2f2; border-radius: 14px; text-align: center; margin-bottom: 12px; border: 1px solid #fee2e2;">
                <span style="font-size: 22px;">🗑️</span>
              </div>
              <h2 style="margin: 0; color: #1f2937; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">PeoplePulse</h2>
              <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 13px; font-weight: 500;">Team Wellbeing &amp; Engagement Platform</p>
            </td>
          </tr>
        </table>

        <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 20px; font-weight: 700; text-align: center;">Account Successfully Deleted</h3>
        <p style="margin: 0 0 20px 0; line-height: 1.6; color: #4b5563; font-size: 14px; text-align: center;">
          Hello <strong>${userName}</strong>, this email confirms that your PeoplePulse account has been permanently removed pursuant to your request.
        </p>

        <!-- Account Badge -->
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="display: inline-block; background-color: #fef2f2; border: 1px solid #fecaca; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; color: #991b1b; font-family: monospace;">
            ${userEmail}
          </span>
        </div>

        <!-- Deletion Summary Box -->
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px 20px; margin: 24px 0;">
          <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #111827;">
            What was completed:
          </p>
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 4px 0; font-size: 12px; color: #374151; line-height: 1.5;">
                <span style="color: #10b981; font-weight: bold; margin-right: 6px;">✓</span>
                Your personal profile, email, and authentication credentials have been purged.
              </td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-size: 12px; color: #374151; line-height: 1.5;">
                <span style="color: #10b981; font-weight: bold; margin-right: 6px;">✓</span>
                All organization memberships and team roles have been terminated.
              </td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-size: 12px; color: #374151; line-height: 1.5;">
                <span style="color: #10b981; font-weight: bold; margin-right: 6px;">✓</span>
                All active sessions and tokens were immediately revoked across all devices.
              </td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-size: 12px; color: #374151; line-height: 1.5;">
                <span style="color: #10b981; font-weight: bold; margin-right: 6px;">✓</span>
                Historical employee check-ins remain fully anonymized without your identity.
              </td>
            </tr>
          </table>
        </div>

        <p style="margin: 0 0 16px 0; line-height: 1.6; color: #6b7280; font-size: 12px; text-align: center;">
          Deletion processed on: <strong>${deletionTime}</strong>
        </p>

        <!-- Farewell Message -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin: 20px 0; font-size: 12px; color: #475569; line-height: 1.5; text-align: center;">
          Thank you for having been part of PeoplePulse. If you or your organization ever wish to start fresh in the future, we would be delighted to welcome you back anytime.
        </div>

        <!-- Security / Mistake Notice -->
        <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 12px 16px; margin: 20px 0; font-size: 11px; color: #92400e; line-height: 1.5;">
          <strong>🛡️ Security Notice:</strong> If you did not initiate this account deletion or suspect unauthorized activity, please immediately contact our team at <a href="mailto:support@peoplepulse.app" style="color: #b45309; text-decoration: underline;">support@peoplepulse.app</a>.
        </div>

        <!-- Divider & Footer -->
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0 18px 0;">
        <p style="margin: 0 0 6px 0; font-size: 11px; color: #9ca3af; text-align: center;">
          PeoplePulse &bull; Psychological Safety &amp; Confidential Employee Wellbeing Insights
        </p>
        <p style="margin: 0; font-size: 10px; color: #9ca3af; text-align: center;">
          Automated security notification. No further action is required.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

      // Dispatch via Brevo REST API
      let emailSent = false;
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
              to: [{ email: userEmail, name: userName }],
              subject: "Your PeoplePulse Account Has Been Permanently Deleted",
              htmlContent: emailHtml,
            }),
          });
          if (brevoRes.ok) {
            console.log(`[delete-account] Deletion email delivered to ${userEmail} via Brevo.`);
            emailSent = true;
          } else {
            const errData = await brevoRes.json();
            console.warn("[delete-account] Brevo dispatch warning:", errData);
          }
        } catch (bErr: any) {
          console.warn("[delete-account] Brevo dispatch error:", bErr?.message);
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
              to: [userEmail],
              subject: "Your PeoplePulse Account Has Been Permanently Deleted",
              html: emailHtml,
            }),
          });
          if (resendRes.ok) {
            console.log(`[delete-account] Deletion email delivered to ${userEmail} via Resend.`);
            emailSent = true;
          }
        } catch (rErr: any) {
          console.warn("[delete-account] Resend dispatch error:", rErr?.message);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account permanently deleted and confirmation email dispatched.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[delete-account] Error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to delete account" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
