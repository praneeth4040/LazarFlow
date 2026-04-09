# Global Context (`src/context/`)

This directory contains React Context Providers that require the highest level of component hierarchy access to inject their state natively across all domains.

## Contents
- **`UserContext.js`**: The absolute source of truth for the authenticated user session, managing caching, active Supabase user tokens, and user profile state.
- **`userReducer.js`**: Pure action dispatcher to manage complex transitions within the User Context payload securely.
