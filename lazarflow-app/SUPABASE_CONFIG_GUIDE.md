# Supabase Configuration Guide for LazarFlow Mobile

To ensure the **Forgot Password** and **Deep Linking** features work correctly on mobile, you must update your Supabase project settings. Without these changes, users will be redirected to the website instead of the app.

## 1. URL Configuration
Navigate to **Authentication** -> **URL Configuration** in your [Supabase Dashboard](https://supabase.com/dashboard).

### Redirect URLs (Whitelist)
Add the following URLs to the **Redirect URLs** list. Supabase will only allow redirects to these specific addresses.

- `lazarflow://reset-password`
- `lazarflow://*`

### Site URL
This is the fallback URL. It is likely set to `https://lazarflow.app` or your localhost. You can leave it as is, but ensure the URLs above are added specifically for the mobile app.

---

## 2. Email Templates (Optional but Recommended)
Navigate to **Authentication** -> **Email Templates** -> **Reset Password**.

Ensure the message contains the `{{ .ConfirmationURL }}` variable. Our mobile app code handles the internal redirection by sending the `redirectTo` parameter, but Supabase must be configured (as shown in Step 1) to respect it.

---

## 3. How it Works
1. The App calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'lazarflow://reset-password' })`.
2. Supabase sends an email with a link.
3. When the user clicks the link, Supabase checks if `lazarflow://reset-password` is in your **Redirect URLs** whitelist.
4. If **YES**: The mobile app opens directly to the Reset Password screen.
5. If **NO**: The browser opens your **Site URL** (website) instead.

---

> [!IMPORTANT]
> **After updating these settings, you must request a NEW reset password email.** Old links sent before these changes will still use the old redirect logic.
