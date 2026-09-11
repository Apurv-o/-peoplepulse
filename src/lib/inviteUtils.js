import { supabase } from "./supabase";

export function buildInviteLink({ token, email, orgName, role, teamName }) {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  if (email) params.set("email", email);
  if (orgName) params.set("org", orgName);
  if (role) params.set("role", role);
  if (teamName) params.set("team", teamName);
  params.set("temp", "PeoplePulse123!");
  return `${window.location.origin}/#invite?${params.toString()}`;
}

export function buildInviteEmailDetails({ email, link, role, orgName }) {
  const roleTitle = (role || "employee").charAt(0).toUpperCase() + (role || "employee").slice(1);
  const organizationName = orgName || "our organization";
  const subject = `You're invited to join ${organizationName} on PeoplePulse`;
  const body = `Hi there,\n\nYou have been invited to join ${organizationName} on PeoplePulse as a ${roleTitle}.\n\nClick the link below to accept your invitation and access your employee dashboard in one click:\n${link}\n\nYour account has a default password (PeoplePulse123!) pre-filled so you can join instantly without delays, and you can change it at any time.\n\nBest regards,\n${organizationName} Team\nPeoplePulse`;
  return { subject, body, roleTitle, organizationName };
}

export function triggerEmailApp({ email, link, role, orgName }) {
  const { subject, body } = buildInviteEmailDetails({ email, link, role, orgName });
  const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  if (typeof window !== "undefined") {
    window.location.href = mailtoUrl;
  }
}

export function triggerGmailWeb({ email, link, role, orgName }) {
  const { subject, body } = buildInviteEmailDetails({ email, link, role, orgName });
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  if (typeof window !== "undefined") {
    window.open(gmailUrl, "_blank", "noopener,noreferrer");
  }
}

export async function dispatchInviteEmailViaBackend({ email, link, role, orgName, teamName }) {
  if (!supabase) return { status: "unavailable" };
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return { status: "no_session" };

    const { data, error } = await supabase.functions.invoke("send-invite-email", {
      body: { email, link, role, orgName, teamName },
      headers: { Authorization: `Bearer ${token}` },
    });

    if (error) {
      console.warn("[dispatchInviteEmailViaBackend error]:", error.message);
      return { status: "error", message: error.message };
    }
    return data;
  } catch (err) {
    console.warn("[dispatchInviteEmailViaBackend exception]:", err.message);
    return { status: "error", message: err.message };
  }
}
