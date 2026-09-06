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
        // Check if there are other members in this org
        const { data: otherMembers } = await adminClient
          .from("organization_members")
          .select("id, user_id, role")
          .eq("organization_id", orgId)
          .neq("user_id", userId);

        if (!otherMembers || otherMembers.length === 0) {
          // Sole member/owner: delete the organization and all its data
          await adminClient.from("organizations").delete().eq("id", orgId);
        } else {
          // Other members exist: ensure there is another owner
          const existingOwner = otherMembers.find((om) => om.role === "owner");
          if (!existingOwner) {
            // Promote an admin, or the first other member
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

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account and associated personal data deleted permanently.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[delete-account] Error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to delete account" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
