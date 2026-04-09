# Auth Module (`src/auth/`)

This directory encapsulates all features related to user identity, authentication, and session management.

## Key Responsibilities
- **Registration**: Pages and logic for users to sign up and establish accounts.
- **Login**: Credential verification and token issuance logic.
- **Password Recovery**: Workflows for forgotten passwords (`ForgotPasswordPage`, `ResetPasswordPage`).

## Components & Pages
- `pages/LoginPage.tsx`: Primary entry port for returning users.
- `pages/SignUpPage.tsx`: Account creation portal.
- `pages/ForgotPasswordPage.tsx`: Initiation of email password recovery.
- `pages/ResetPasswordPage.tsx`: Screen for inputting the new password after clicking the reset link.

All network boundaries related to Authentication communicate strictly with the external `src/lib/authService.js` and standard `Supabase` clients.
