# Password Reset Implementation Guide

## Overview

This guide explains how the password reset functionality works in the Task Manager application.

## Features Implemented

✅ **Forgot Password Page** (`/forgot-password`)
- User enters their email
- System sends password reset link via email
- Success confirmation screen

✅ **Reset Password Page** (`/reset-password`)
- Validates the reset token from email link
- User enters new password with confirmation
- Password validation (minimum 6 characters)
- Success confirmation and auto-redirect

✅ **Login Form Enhancement**
- "Forgot password?" link added to login page
- Links to forgot password flow

## How It Works

### 1. User Requests Password Reset

1. User navigates to login page
2. Clicks "Forgot password?" link
3. Enters their email address
4. Receives email with reset link

### 2. Email Link Structure

The password reset email contains a link like:
```
https://your-app.com/reset-password?token=xxx&type=recovery
```

### 3. User Resets Password

1. User clicks the link in their email
2. App validates the token and creates a temporary session
3. User enters new password (twice for confirmation)
4. Password is updated in Supabase
5. User is redirected to the main app

## Important Configuration

### Supabase Dashboard Settings

You need to configure the redirect URLs in your Supabase project:

1. Go to: https://supabase.com/dashboard/project/ihheipfihcgtzhujcmdn/auth/url-configuration
2. Add these redirect URLs:
   - Development: `http://localhost:5173/reset-password`
   - Production: `https://your-domain.com/reset-password`

### Local Development Configuration

The local Supabase config (`supabase/config.toml`) is already configured:
```toml
[auth]
site_url = "http://localhost:5173"
additional_redirect_urls = ["http://localhost:3000"]
```

For password reset to work locally, you may need to add:
```toml
additional_redirect_urls = [
  "http://localhost:3000",
  "http://localhost:5173/reset-password"
]
```

## Routes Added

| Route | Description | Access |
|-------|-------------|--------|
| `/login` | Login and signup page | Public |
| `/forgot-password` | Request password reset | Public |
| `/reset-password` | Set new password (requires valid token) | Public |
| `/` | Main app (tasks dashboard) | Protected |

## File Changes

### New Files Created
- `web/src/components/auth/ResetPasswordPage.tsx` - Password reset form
- `web/src/components/auth/ForgotPasswordPage.tsx` - Request reset email form

### Modified Files
- `web/src/App.tsx` - Added React Router and routes
- `web/src/components/auth/LoginForm.tsx` - Added "Forgot password?" link
- `web/src/components/auth/ProtectedRoute.tsx` - Updated to use React Router navigation
- `web/package.json` - Added `react-router-dom` dependency

## Usage Instructions

### For Users

**Forgot Password:**
1. Go to login page
2. Click "Forgot password?"
3. Enter your email
4. Check your email inbox
5. Click the reset link
6. Enter your new password
7. You'll be redirected to the app

### For Developers

**Testing Locally:**

1. Start the development server:
   ```bash
   cd web
   npm run dev
   ```

2. Navigate to `http://localhost:5173/login`

3. Click "Forgot password?" and test the flow

**Note:** In local development, Supabase uses Inbucket for email testing:
- Access at: `http://localhost:54324`
- All emails are captured here instead of being sent

**Testing in Production:**

1. Ensure redirect URLs are configured in Supabase Dashboard
2. Test with a real email address
3. Check spam folder if email doesn't arrive
4. Verify the reset link works correctly

## Security Features

- ✅ Password reset tokens expire after 1 hour
- ✅ Tokens are single-use only
- ✅ Password must be at least 6 characters
- ✅ Password confirmation required
- ✅ Secure token validation via Supabase Auth

## Troubleshooting

### Reset Link Doesn't Work

**Problem:** Clicking the email link shows an error

**Solutions:**
1. Check that redirect URLs are configured in Supabase Dashboard
2. Verify the URL format matches your app's domain
3. Ensure the token hasn't expired (1 hour limit)
4. Check browser console for errors

### Email Not Received

**Solutions:**
1. Check spam/junk folder
2. Verify email address is correct
3. Check Supabase email settings (may need SMTP configured)
4. In development, check Inbucket at `http://localhost:54324`

### "Invalid or expired reset link" Error

**Solutions:**
1. Request a new password reset email
2. Make sure you're using the latest link
3. Don't refresh the page after clicking the link
4. Complete the reset within 1 hour

### Can't Navigate to Pages

**Problem:** Routes not working

**Solution:**
Ensure React Router is properly initialized. The app should have `<BrowserRouter>` wrapping everything in `App.tsx`.

## Manual Password Reset (Admin)

If a user is completely locked out, admins can manually reset passwords:

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/ihheipfihcgtzhujcmdn
2. Navigate to **Authentication → Users**
3. Find the user
4. Click on the user
5. Use "Send password recovery email" or manually set a new password

## Future Enhancements

Possible improvements:
- [ ] Add password strength indicator
- [ ] Add reCAPTCHA to prevent abuse
- [ ] Add rate limiting for reset requests
- [ ] Email verification for new signups
- [ ] Two-factor authentication
- [ ] Password history (prevent reusing old passwords)

## Support

If you encounter issues with password reset:
1. Check this guide's troubleshooting section
2. Verify Supabase configuration
3. Check browser console for errors
4. Review Supabase Auth logs in dashboard
