# Ignite Client - Google OAuth Setup Guide

This client application now uses Google OAuth for authentication with approval through a public Google Sheet.

## Features

- **Google OAuth Authentication**: Users sign in with their Google accounts
- **Approval System**: Only users listed in an approved Google Sheet can access the platform
- **No Registration Required**: Users cannot create new accounts - they must be pre-approved
- **Profile Information**: User details (name, email, year, department) come from the approved users sheet

## Setup Instructions

### 1. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API or Google Identity API
4. Go to "Credentials" and create a new "OAuth 2.0 Client ID"
5. Configure the authorized JavaScript origins:
   - For development: `http://localhost:3000`
   - For production: your domain (e.g., `https://yourdomain.com`)
6. Copy the Client ID

### 2. Environment Configuration

1. Open `client/.env`
2. Replace `your-google-oauth-client-id-here` with your actual Google OAuth Client ID:
   ```
   VITE_GOOGLE_CLIENT_ID=your-actual-client-id-here
   ```

### 3. Google Sheets Setup

Create a public Google Sheet with the following structure:

| email | name | year | department |
|-------|------|------|------------|
| student1@example.com | John Doe | 3 | CSE |
| student2@example.com | Jane Smith | 2 | ECE |

**Important Notes:**
- The sheet must be publicly accessible (anyone with the link can view)
- Column headers must be exactly: `email`, `name`, `year`, `department`
- Email addresses should be lowercase
- Department values can be: AIML, CSE, ECE, EEE, IT
- Year values should be numbers: 1, 2, 3, 4

### 4. Making the Sheet Public

1. Open your Google Sheet
2. Click "Share" button
3. Change access to "Anyone with the link can view"
4. Copy the sheet URL (it should look like: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0`)

### 5. Installation and Running

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## How It Works

1. **User visits the application**: They see the login page with Google Sign-in
2. **Google Sheet URL**: Admin provides the public Google Sheet URL containing approved users
3. **Google Authentication**: User signs in with their Google account
4. **Approval Check**: The system checks if the user's email exists in the approved users sheet
5. **Access Granted**: If approved, the user gains access with their profile information from the sheet
6. **Access Denied**: If not approved, the user sees an error message and cannot proceed

## Security Considerations

- The Google Sheet should only contain approved users
- Email verification is handled by Google OAuth
- Users cannot modify their own information (it comes from the sheet)
- The application does not store user credentials locally

## Troubleshooting

### Common Issues

1. **"Google sign-in failed"**
   - Check that your Google Client ID is correct
   - Verify that your domain is in the authorized JavaScript origins

2. **"Unable to verify user approval status"**
   - Ensure the Google Sheet is publicly accessible
   - Check that the sheet has the correct column headers
   - Verify the sheet URL is correct

3. **"Email not in approved users list"**
   - Check that the user's email exists in the Google Sheet
   - Ensure the email in the sheet matches exactly (case-sensitive)

## Development Notes

- The application uses React with Vite
- Google OAuth is handled by `@react-oauth/google`
- The approved users list is cached for 5 minutes to reduce API calls
- User session persists in localStorage until logout

## File Structure

```
src/
├── components/
│   ├── GoogleLoginComponent.jsx  # Main Google OAuth component
│   └── LoginPage.jsx            # Updated login page
├── contexts/
│   └── AuthContext.jsx          # Auth context with Google OAuth support
└── services/
    ├── googleAuthService.js     # Google OAuth utilities
    └── googleSheetsService.js   # Google Sheets integration
```
