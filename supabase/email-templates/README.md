# PeoplePulse Email Templates

Modern, responsive HTML email templates styled with the PeoplePulse brand design system.

---

## 1. Password Reset Email (`reset-password.html`)

Used when a user clicks **"Forgot password?"** on the sign-in modal.

### How to apply in Supabase:
1. Go to your **[Supabase Dashboard](https://supabase.com/dashboard)**.
2. Select your project: `dlsddrperzjvpccufzrd`.
3. In the left navigation, click **Authentication** &rarr; **Email Templates**.
4. Select the **Reset Password** tab.
5. Set the **Subject** to:
   ```
   Reset Your PeoplePulse Password
   ```
6. Replace the existing body with the entire contents of [`reset-password.html`](./reset-password.html).
7. Click **Save Changes**.

---

## 2. Invite User Email (`invite-user.html`)

For direct Supabase Auth user invitations if using Supabase Auth invite.

### How to apply in Supabase:
1. In the left navigation, click **Authentication** &rarr; **Email Templates**.
2. Select the **Invite User** tab.
3. Set the **Subject** to:
   ```
   You're invited to join PeoplePulse
   ```
4. Replace the existing body with the entire contents of [`invite-user.html`](./invite-user.html).
5. Click **Save Changes**.
