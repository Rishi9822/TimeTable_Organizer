import SibApiV3Sdk from "sib-api-v3-sdk";

/**
 * Email Service - Using Brevo REST API (NO SMTP)
 * Production-grade, reliable, SaaS-safe
 */

// --------------------
// Brevo Client Setup
// --------------------
const client = SibApiV3Sdk.ApiClient.instance;
const apiKeyAuth = client.authentications["api-key"];

let transactionalApi = null;

// Support both BREVO_API_KEY (preferred) and legacy BREVO_SMTP_KEY for backward compatibility
const brevoKey = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY;

if (!brevoKey) {
  console.warn(
    "⚠️ [EMAIL] BREVO_API_KEY / BREVO_SMTP_KEY is missing. Email sending is disabled; requests will fail gracefully."
  );
} else {
  apiKeyAuth.apiKey = brevoKey;
  transactionalApi = new SibApiV3Sdk.TransactionalEmailsApi();
}

// --------------------
// Helpers
// --------------------
const getFrontendUrl = () =>
  process.env.FRONTEND_URL || "http://localhost:5173";

const getSender = () => ({
  email: process.env.BREVO_FROM_EMAIL,
  name: process.env.BREVO_FROM_NAME || "TimetablePro",
});

// --------------------
// Email Templates
// --------------------
const templates = {
  verificationEmail: (name, verificationUrl) => ({
    subject: "Verify Your Email - TimetablePro",
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>Welcome to TimetablePro</h2>
          <p>Hi ${name},</p>
          <p>Please verify your email address:</p>
          <p>
            <a href="${verificationUrl}"
               style="padding:10px 20px;background:#667eea;color:#fff;text-decoration:none;border-radius:4px;">
              Verify Email
            </a>
          </p>
          <p>This link expires in 24 hours.</p>
        </body>
      </html>
    `,
  }),

  passwordResetEmail: (name, resetUrl) => ({
    subject: "Reset Your Password - TimetablePro",
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>Password Reset</h2>
          <p>Hi ${name},</p>
          <p>Click below to reset your password:</p>
          <p>
            <a href="${resetUrl}"
               style="padding:10px 20px;background:#667eea;color:#fff;text-decoration:none;border-radius:4px;">
              Reset Password
            </a>
          </p>
          <p>This link expires in 1 hour.</p>
        </body>
      </html>
    `,
  }),
};

// --------------------
// Core Sender
// --------------------
const sendEmail = async ({ to, subject, html }) => {
  const sender = getSender();

  if (!transactionalApi) {
    console.error(
      "❌ [EMAIL] Attempted to send email but Brevo is not configured (missing API key)."
    );
    return { success: false, error: "Email service not configured" };
  }

  if (!sender.email) {
    console.error(
      "❌ [EMAIL] BREVO_FROM_EMAIL is missing. Cannot send email."
    );
    return { success: false, error: "Sender email not configured" };
  }

  try {
    const response = await transactionalApi.sendTransacEmail({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html,
    });

    console.log(
      `✅ [EMAIL] Sent to ${to} | messageId: ${response.messageId}`
    );

    return { success: true, messageId: response.messageId };
  } catch (error) {
    console.error(
      "❌ [EMAIL] Brevo API error:",
      error?.response?.text || error.message
    );
    return { success: false, error: error.message };
  }
};

// --------------------
// Public APIs (UNCHANGED)
// --------------------
export const sendVerificationEmail = async (email, name, token) => {
  if (!email || !name || !token) {
    return { success: false, error: "Missing parameters" };
  }

  const verificationUrl = `${getFrontendUrl()}/auth/verify-email?token=${token}`;
  const tpl = templates.verificationEmail(name, verificationUrl);

  return sendEmail({
    to: email,
    subject: tpl.subject,
    html: tpl.html,
  });
};

export const sendPasswordResetEmail = async (email, name, token) => {
  if (!email || !name || !token) {
    return { success: false, error: "Missing parameters" };
  }

  const resetUrl = `${getFrontendUrl()}/auth/reset-password?token=${token}`;
  const tpl = templates.passwordResetEmail(name, resetUrl);

  return sendEmail({
    to: email,
    subject: tpl.subject,
    html: tpl.html,
  });
};

export default {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
