import nodemailer from "nodemailer";

/**
 * Email Service - Pluggable email utility
 * Currently uses Nodemailer, can be upgraded to SES/SendGrid easily
 */

// Create reusable transporter
const createTransporter = () => {
  try {
    // For development, use Ethereal or SMTP
    // For production, configure with real SMTP or AWS SES
    if (process.env.NODE_ENV === "production") {
      // Production: Use SMTP or SES
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("⚠️ SMTP configuration missing in production. Emails will not be sent.");
        return createMockTransporter();
      }
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Development: Use SMTP if configured, otherwise mock
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
      }
      // Fallback: Log emails in development (no actual sending)
      return createMockTransporter();
    }
  } catch (error) {
    console.error("Failed to create email transporter:", error);
    return createMockTransporter();
  }
};

// Mock transporter for development/testing
const createMockTransporter = () => {
  return {
    sendMail: async (options) => {
      console.log("📧 [DEV MODE] Email would be sent:", {
        to: options.to,
        subject: options.subject,
        preview: options.html?.substring(0, 150) + "...",
      });
      console.log("📧 [DEV MODE] To enable email sending, configure SMTP_USER and SMTP_PASS in .env");
      return { messageId: "dev-mode-mock", accepted: [options.to] };
    },
  };
};

const transporter = createTransporter();

/**
 * Get frontend URL for email links
 */
const getFrontendUrl = () => {
  return process.env.FRONTEND_URL || "http://localhost:5173";
};

/**
 * Email Templates
 */
const templates = {
  /**
   * Email Verification Template
   */
  verificationEmail: (name, verificationUrl) => ({
    subject: "Verify Your Email - TimetablePro",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to TimetablePro!</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Hi ${name},</p>
            <p>Thank you for signing up! Please verify your email address to activate your account.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Verify Email Address</a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #667eea; font-size: 12px; word-break: break-all;">${verificationUrl}</p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">This link will expire in 24 hours.</p>
            <p style="color: #666; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} TimetablePro. All rights reserved.</p>
          </div>
        </body>
      </html>
    `,
  }),

  /**
   * Password Reset Template
   */
  passwordResetEmail: (name, resetUrl) => ({
    subject: "Reset Your Password - TimetablePro",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Password Reset Request</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Hi ${name},</p>
            <p>We received a request to reset your password. Click the button below to create a new password.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #667eea; font-size: 12px; word-break: break-all;">${resetUrl}</p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">This link will expire in 1 hour.</p>
            <p style="color: #d32f2f; font-size: 14px; font-weight: bold;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} TimetablePro. All rights reserved.</p>
          </div>
        </body>
      </html>
    `,
  }),
};

/**
 * Send Email Verification
 */
export const sendVerificationEmail = async (email, name, token) => {
  if (!email || !name || !token) {
    console.error("Missing required parameters for verification email");
    return { success: false, error: "Missing required parameters" };
  }

  const verificationUrl = `${getFrontendUrl()}/auth/verify-email?token=${token}`;
  const template = templates.verificationEmail(name, verificationUrl);

  try {
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"TimetablePro" <${process.env.SMTP_USER || "noreply@timetablepro.com"}>`,
      to: email,
      subject: template.subject,
      html: template.html,
    });
    
    // In dev mode, result.messageId will be "dev-mode-mock"
    if (result.messageId === "dev-mode-mock") {
      console.log(`📧 [DEV] Verification email for ${email} logged above`);
    }
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Error sending verification email:", error);
    // Don't throw - let the calling code handle gracefully
    return { success: false, error: error.message || "Failed to send email" };
  }
};

/**
 * Send Password Reset Email
 */
export const sendPasswordResetEmail = async (email, name, token) => {
  if (!email || !name || !token) {
    console.error("Missing required parameters for password reset email");
    return { success: false, error: "Missing required parameters" };
  }

  const resetUrl = `${getFrontendUrl()}/auth/reset-password?token=${token}`;
  const template = templates.passwordResetEmail(name, resetUrl);

  try {
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"TimetablePro" <${process.env.SMTP_USER || "noreply@timetablepro.com"}>`,
      to: email,
      subject: template.subject,
      html: template.html,
    });
    
    // In dev mode, result.messageId will be "dev-mode-mock"
    if (result.messageId === "dev-mode-mock") {
      console.log(`📧 [DEV] Password reset email for ${email} logged above`);
    }
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    // Don't throw - let the calling code handle gracefully
    return { success: false, error: error.message || "Failed to send email" };
  }
};

export default {
  sendVerificationEmail,
  sendPasswordResetEmail,
};

