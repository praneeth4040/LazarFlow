# API Integration Documentation

This document details all API endpoints used in the **LazarFlow** mobile application, mapping them to the specific files and functions where they are called, along with their request payloads and expected behaviors.

## **1. Authentication**

**Base URL:** `/api/auth`
**Service File:** `src/lib/authService.js`

| Endpoint | Method | Function / Call Site | Request Payload | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/register` | POST | `authService.register` <br> Called by: `src/screens/SignUpScreen.js` | `{ email: "string", password: "string", data: { marketing_opt_in: boolean } }` | Registers a new user. The `data` object is optional but used for preferences. |
| `/login` | POST | `authService.login` <br> Called by: `src/screens/LoginScreen.js` | `{ email: "string", password: "string" }` | Authenticates a user and returns a session token. |
| `/logout` | POST | `authService.logout` <br> Called by: `src/screens/DashboardScreen.js` (Logout button) | `{}` (Empty) | Invalidates the current user session on the server. |
| `/me` | GET | `authService.getMe` <br> Called by: `src/lib/dataService.js` (getCurrentUser) | `None` | Fetches the currently authenticated user's details using the stored token. |
| `/refresh` | POST | `authService.refreshSession` <br> Called internally by `authService` | `{ refresh_token: "string" }` | Refreshes the access token using the refresh token. |

---

## **2. User Profile & Settings**

**Service File:** `src/lib/dataService.js`

| Endpoint | Method | Function / Call Site | Request Payload | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/api/profile` | GET | `getUserProfile` <br> Called by: `src/screens/DashboardScreen.js`, `src/hooks/useSubscription.js` | `None` | Fetches the user's profile, including subscription tier and limits. |
| `/api/profile` | PUT | `updateUserProfile` <br> Called by: `src/hooks/usePushNotifications.js` (saving token) | `{ expo_push_token: "string", updated_at: "ISOString" }` <br> *Payload varies based on what is being updated.* | Updates user profile fields. Common use is saving push tokens. |

---

## **3. Lobbies Management**

**Base URL:** `/api/lobbies`
**Service File:** `src/lib/dataService.js`

| Endpoint | Method | Function / Call Site | Request Payload | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/` | GET | `getLobbies` <br> Called by: `src/screens/DashboardScreen.js` | `None` | Lists all lobbies created by the authenticated user. |
| `/` | POST | `createLobby` <br> Called by: `src/screens/CreateLobbyScreen.js` | `{ name: "string", game: "string", points_system?: Array, kill_points?: number }` | Creates a new lobby. |
| `/:lobby_id` | GET | `getLobby` <br> Called by: `src/screens/LiveLobbyScreen.js`, `src/screens/EditLobbyScreen.js`, `src/screens/CalculateResultsScreen.js` | `None` | Fetches full configuration and metadata for a specific lobby. |
| `/:lobby_id` | PUT | `updateLobby` <br> Called by: `src/screens/EditLobbyScreen.js` | `{ name?: "string", metadata?: object }` | Updates lobby name or merges metadata. |
| `/:lobby_id/end` | PUT | `endLobby` <br> Called by: `src/screens/DashboardScreen.js` (Flag Button) | `None` | End a lobby, calculating final standings and marking it as completed. |
| `/:lobby_id` | DELETE | `deleteLobby` <br> Called by: `src/screens/DashboardScreen.js`, `src/screens/EditLobbyScreen.js` | `None` | Deletes a lobby and its associated data. |
| `/public/:shareId` | GET | `getLobbyByShareId` <br> *Internal use* | `None` | Fetches a lobby via a public share link/ID. |

---

## **4. Teams Management**

**Base URL:** `/api/lobbies` (for bulk) and `/api/teams` (for updates)
**Service File:** `src/lib/dataService.js`

| Endpoint | Method | Function / Call Site | Request Payload | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/:lobby_id/teams` | GET | `getLobbyTeams` <br> Called by: `src/screens/ManageTeamsScreen.js`, `src/screens/LiveLobbyScreen.js`, `src/screens/CalculateResultsScreen.js` | `None` | Fetch all teams and their statistics for a specific lobby. |
| `/:lobby_id/teams` | POST | `addLobbyTeams` <br> Called by: `src/screens/ManageTeamsScreen.js` | `{ teams: [{ team_name: "string", members: Array }] }` | Bulk add multiple teams to a lobby. |
| `/:lobby_id/teams/members/batch` | PUT | `batchUpdateTeamMembers` <br> Called by: `src/screens/CalculateResultsScreen.js` | `[{ id: "team_uuid", members: ["Player1", "Player2"] }]` | Batch update team members for a lobby. |
| `/api/teams/:id` | PUT | `updateTeam` <br> Called by: `src/screens/CalculateResultsScreen.js` | `{ team_name?: string, members?: Array, total_points?: object }` | Update details for a specific team. |
| `/api/teams/:id` | DELETE | `deleteTeam` <br> Called by: `src/screens/ManageTeamsScreen.js` (during full sync/replace) | `None` | Removes a specific team from a lobby. |

---

## **5. Themes & Assets**

**Service File:** `src/lib/dataService.js`

| Endpoint | Method | Function / Call Site | Request Payload | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/api/themes` | GET | `getUserThemes`, `getCommunityDesigns` <br> Called by: `src/screens/DashboardScreen.js`, `src/screens/LiveLobbyScreen.js` | `None` | Fetches available themes. Frontend filters by `user_id` to separate User vs System themes. |
| `/api/themes` | POST | `createTheme` <br> Called by: `src/screens/DashboardScreen.js` (Upload Design) | `{ name: "string", url: "string", status: "pending" }` | Creates a new user-custom theme entry. |
| `/api/storage/upload` | POST | `uploadLogo` <br> Called by: `src/screens/DashboardScreen.js` | `FormData` containing file: `{ uri, name, type }` | Uploads an image (logo/theme) and returns the public URL. |

---

## **6. AI & Image Processing**

**Service Files:** `src/lib/aiResultExtraction.js`, `src/lib/aiExtraction.js`, `src/lib/dataService.js`

| Endpoint | Method | Function / Call Site | Request Payload | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/api/ai/process-lobby` | POST | `processLobbyScreenshots` <br> Called by: `src/screens/CalculateResultsScreen.js` | `FormData` with multiple `images` and `lobby_id`. | Extracts team/player names from lobby screenshots. |
| `/api/ai/extract-results` | POST | `extractResultsFromScreenshot` <br> Called by: `src/screens/CalculateResultsScreen.js` | `FormData` with `images` and options: `{ split, split_ratio, crop_top, crop_bottom }` | Extracts match results/standings from scoreboard screenshots. |
| `/api/ai/extract-teams` | POST | `extractTeamsFromText` <br> Called by: `src/screens/ManageTeamsScreen.js` (Paste Text) | `{ text: "raw text string" }` | Parses unstructured text (e.g., WhatsApp list) into structured team objects. |
| `/render/:lobbyId/:themeId` | POST | `renderLobbyDesign` <br> Called by: `src/screens/LiveLobbyScreen.js` | `{ ...overrides }` (Optional JSON body) | Generates a PNG image of the lobby standings. Returns binary image data. |
| `/api/render/render-results` | POST | `renderResults` <br> Called by: `src/screens/LiveLobbyScreen.js` | `{ lobbyId: "string", themesId: "string" }` | Generates a PNG image of the detailed results table. Returns binary image data. |

---

## **7. Payments (Monetization)**

**Service File:** `src/screens/SubscriptionPlansScreen.js`

| Endpoint | Method | Function / Call Site | Request Payload | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/api/payments/config` | GET | Not currently used (Frontend logic checks SDKs) | `None` | Checks available payment gateways. |
| `/api/payments/create-order` | POST | `handleClaim` | `{ tier: "string", amount: number, gateway: "razorpay"\|"cashfree" }` | Creates a payment order. |
| `/api/payments/verify-payment` | POST | `handleClaim` (Razorpay) / `onVerify` (Cashfree) | Razorpay: `{ tier, gateway: "razorpay", razorpay_order_id, razorpay_payment_id, razorpay_signature }` <br> Cashfree: `{ tier, gateway: "cashfree", order_id }` | Verifies the payment transaction on the backend. |

---

## **8. External/Third-Party Calls**

**Service File:** `src/lib/dataService.js` (Helper function `getDesignImageSource`)

| Endpoint | Method | Call Site | Description |
| :--- | :--- | :--- | :--- |
| `https://api.lazarflow.app/storage/themes/:path` | GET | `Image` components in React Native | Used to load theme preview images directly from the backend storage. |
