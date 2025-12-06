# 📧 Setup Resend SMTP (Fix for Email Issues)

Follow these 3 simple steps to fix your email delivery permanently.

## Step 1: Get Resend API Key
1.  Go to **[Resend.com](https://resend.com)** and Sign Up (it's free).
2.  On the dashboard, click **"Add API Key"**.
3.  Name it `Supabase` and give it **Full Access**.
4.  **Copy the API Key** (starts with `re_...`).

## Step 2: Configure Supabase
1.  Go to your **Supabase Dashboard** > **Project Settings** > **Authentication** > **SMTP Settings**.
2.  **Enable Custom SMTP**: Toggle ON.
3.  Fill in these details:
    *   **Sender Email**: `onboarding@resend.dev` (This works instantly without domain verification!)
    *   **Sender Name**: `ECC Admin`
    *   **Host**: `smtp.resend.com`
    *   **Port**: `465`
    *   **User**: `resend`
    *   **Password**: *[Paste your API Key here]*
    *   **Encryption**: `SSL` (if asked)
4.  Click **Save**.

> [!IMPORTANT]
> **Testing Mode Restriction**:
> Until you verify a custom domain (e.g., `yourwebsite.com`) in Resend, you can **ONLY send emails to the email address you signed up with** (`elivatecapitalcollective@gmail.com`).
>
> **To Test Now**: Go to your app's Sign Up page and sign up with `elivatecapitalcollective@gmail.com`. It will work.
> **To Fix for Everyone**: Go to [Resend Domains](https://resend.com/domains) and verify your domain.

## Step 3: Verify
1.  Go to your app's **Sign Up** page.
2.  Create a new account with **your own email** (`elivatecapitalcollective@gmail.com`).
3.  Check your inbox! 🚀

> [!TIP]
> Once this works, you can verify your own domain (e.g., `info@yourdomain.com`) in Resend later to look more professional. For now, `onboarding@resend.dev` is perfect for testing.
