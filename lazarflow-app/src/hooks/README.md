# Global Hooks (`src/hooks/`)

This directory holds standalone React hooks (`useState`, `useEffect` wrappers) that provide modular, composable logic for systems interacting across the entire lifecycle of the user session. 

Domain-specific hooks (like `useLiveLobby`) belong solely in their local modules (e.g. `src/lobby/hooks/`).

## Contents
- **`usePushNotifications.js`**: Manages Native Push Registration logic (`expo-notifications`), device token extraction, and notification reception bindings dynamically.
- **`useSubscription.js`**: Injects universal knowledge of the user's tier status, active limits (Max AI queries/max layouts), and handles the core caching for user subscription privileges.
