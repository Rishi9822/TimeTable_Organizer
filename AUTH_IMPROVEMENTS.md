# Authentication System Improvements

## Overview
This document outlines the email verification and password reset features added to the TimetablePro authentication system.

## Backend Changes

### 1. User Model Extensions (`server/src/models/User.js`)
Added new fields to User schema:
- `emailVerified` (Boolean, default: false)
- `emailVerificationToken` (String)
- `emailVerificationExpires` (Date)
- `passwordResetToken` (String)
- `passwordResetExpires` (Date)

**Note:** Existing users will have `emailVerified: false` by default. They can verify their email or continue using the system (backward compatible).

### 2. Email Service (`server/src/utils/emailService.js`)
- Pluggable email service using Nodemailer
- Supports SMTP configuration via environment variables
- Development mode: Logs emails to console if SMTP not configured
- Production mode: Requires SMTP configuration
- Email templates for:
  - Email verification
  - Password reset

### 3. Token Utilities (`server/src/utils/tokenUtils.js`)
- Cryptographically secure token generation using `crypto.randomBytes`
- SHA256 token hashing for secure storage
- Timing-safe token comparison

### 4. New Auth Endpoints (`server/src/routes/authRoutes.js`)

#### GET `/api/auth/verify-email?token=...`
- Verifies email using token from query parameter
- Marks email as verified
- Redirects to frontend success page

#### POST `/api/auth/resend-verification`
- Resends verification email
- Rate limited (3 requests per 15 minutes)
- Prevents user enumeration

#### POST `/api/auth/forgot-password`
- Generates password reset token
- Sends password reset email
- Rate limited (3 requests per 15 minutes)
- Prevents user enumeration

#### POST `/api/auth/reset-password`
- Validates reset token
- Updates user password
- Rate limited (3 requests per 15 minutes)
- Enforces password rules (min 6 characters)

### 5. Updated Endpoints

#### POST `/api/auth/register`
- Generates email verification token on registration
- Sends verification email (non-blocking)
- Returns `emailVerified: false` in user object
- Rate limited (5 requests per 15 minutes)

#### POST `/api/auth/login`
- Returns `emailVerified` status in user object
- Users can login even if email not verified
- Rate limited (5 requests per 15 minutes)

#### GET `/api/auth/me`
- Returns `emailVerified` status in user object

### 6. Rate Limiting
- Auth routes protected with `express-rate-limit`
- Login/Register: 5 requests per 15 minutes
- Verification/Password Reset: 3 requests per 15 minutes

## Frontend Changes

### 1. AuthContext Updates (`client/src/contexts/AuthContext.jsx`)
- Added `emailVerified` state
- Updated all auth methods to include `emailVerified`
- `refreshUserData()` now updates `emailVerified` status

### 2. Auth Page Updates (`client/src/pages/Auth.jsx`)
- Shows verification message after signup
- Displays warning banner for unverified emails on login
- Resend verification email functionality
- Link to forgot password page
- Handles URL error parameters for verification failures

### 3. New Pages

#### ForgotPassword (`client/src/pages/ForgotPassword.jsx`)
- Email input form
- Success message (prevents user enumeration)
- Link back to login

#### ResetPassword (`client/src/pages/ResetPassword.jsx`)
- Token-based password reset form
- Password strength validation
- Success redirect to login
- Error handling for invalid/expired tokens

#### EmailVerificationSuccess (`client/src/pages/EmailVerificationSuccess.jsx`)
- Success page after email verification
- Refreshes user data
- Links to login and homepage

### 4. Routes (`client/src/App.jsx`)
Added new public routes:
- `/auth/forgot-password`
- `/auth/reset-password`
- `/auth/verify-email-success`

## Environment Variables

Add these to your `.env` file:

```env
# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173

# SMTP Configuration (for production)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="TimetablePro" <noreply@timetablepro.com>
```

**Development:** If SMTP is not configured, emails will be logged to console.

**Production:** SMTP configuration is required for email delivery.

## Security Features

1. **Cryptographically Secure Tokens**
   - Uses `crypto.randomBytes` for token generation
   - SHA256 hashing for token storage

2. **Token Expiration**
   - Email verification: 24 hours
   - Password reset: 1 hour

3. **Rate Limiting**
   - Prevents brute force attacks
   - Different limits for different endpoints

4. **User Enumeration Prevention**
   - Forgot password and resend verification always return success
   - No indication if email exists or not

5. **Password Validation**
   - Minimum 6 characters enforced
   - Validated on both frontend and backend

## Backward Compatibility

✅ **All existing functionality preserved:**
- Existing users can continue using the system
- Existing login/register flows unchanged
- Role logic unchanged
- Institution setup logic unchanged
- JWT structure unchanged
- `/auth/me` endpoint enhanced but backward compatible

## Testing Checklist

- [ ] New user registration sends verification email
- [ ] Email verification link works
- [ ] Resend verification email works
- [ ] Forgot password sends reset email
- [ ] Password reset works with valid token
- [ ] Invalid/expired tokens are rejected
- [ ] Existing users can still login
- [ ] Unverified users see warning but can use system
- [ ] Rate limiting works correctly
- [ ] All existing flows still work

## Notes

- Email sending is non-blocking - registration/login won't fail if email fails
- Existing users have `emailVerified: false` by default
- Users can login even if email not verified (warning shown)
- Email verification is recommended but not enforced for existing functionality

