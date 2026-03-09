# LazarFlow Service Architecture: Backend vs. Supabase

This document outlines which communication layer (Custom Backend API via `apiClient` or Supabase Client via `supabase`) is used for each service and feature in the LazarFlow application.

---

## 1. Authentication Service (`src/lib/authService.js`)

The authentication flow is a **hybrid model**. It uses the custom backend for business logic and session initiation, while using the Supabase client for session persistence, direct user management, and recovery.

| Feature | Primary Service | Details |
| :--- | :--- | :--- |
| **User Registration** | **Backend** | Calls `POST /api/auth/register`. The session is then synced to Supabase via `setSession`. |
| **User Login** | **Backend** | Calls `POST /api/auth/login`. The session is then synced to Supabase via `setSession`. |
| **Token Refresh** | **Supabase** | Uses `supabase.auth.refreshSession()`. Falls back to manual backend refresh if needed. |
| **Logout** | **Hybrid** | Calls `supabase.auth.signOut()` AND `POST /api/auth/logout`. |
| **Get Current User** | **Hybrid** | Attempts `POST /api/auth/me` first; falls back to `supabase.auth.getUser()`. |
| **Password Reset (Request)**| **Supabase** | Uses `supabase.auth.resetPasswordForEmail()`. |
| **Password Update** | **Supabase** | Uses `supabase.auth.updateUser({ password })`. |

---

## 2. Tournament & Lobby Management (`src/lib/dataService.js`)

All core tournament features, data persistence for matches, and lobby settings are handled exclusively by the **Custom Backend**.

| Feature | Service | Endpoint Used |
| :--- | :--- | :--- |
| **Fetch Lobbies** | **Backend** | `GET /api/lobbies` |
| **Create/Edit/End Lobby** | **Backend** | `POST/PUT /api/lobbies/...` |
| **Public Lobby View** | **Backend** | `GET /api/lobbies/public/${shareId}` |
| **Team Management** | **Backend** | `POST/PUT/DELETE /api/teams/...` |
| **Batch Team Updates** | **Backend** | `PUT /api/lobbies/${id}/teams/batch` |

---

## 3. AI & Image Processing (`src/lib/aiExtraction.js`, `aiResultExtraction.js`, `dataService.js`)

High-compute tasks like AI text parsing and server-side image rendering are handled exclusively by the **Custom Backend**.

| Feature | Service | Endpoint Used |
| :--- | :--- | :--- |
| **Extract Teams from Text** | **Backend** | `POST /api/ai/extract-teams` |
| **Process Lobby Images** | **Backend** | `POST /api/ai/process-lobby` |
| **Extract Standings (AI)** | **Backend** | `POST /api/ai/extract-results` |
| **Render Standings Image** | **Backend** | `POST /render/${lobbyId}/${themeId}` |
| **Render Final Results** | **Backend** | `POST /api/render/render-results` |

---

## 4. Design & Theme Management (`src/lib/dataService.js`)

Theme assets and configurations are managed via the backend, although some legacy image resolutions still point to Supabase Storage.

| Feature | Service | Endpoint Used |
| :--- | :--- | :--- |
| **Fetch Community Themes** | **Backend** | `GET /api/themes` (filtered by system) |
| **Fetch User Themes** | **Backend** | `GET /api/themes` (filtered by user) |
| **Upload Theme Asset** | **Backend** | `POST /api/themes` (multipart/form-data) |
| **Update Theme Config** | **Backend** | `PUT /api/themes/${id}/config` |
| **Storage Resolution** | **Hybrid** | URLs generated for `api.lazarflow.app/storage` or Supabase public storage. |

---

## 5. System Services

Push notifications and profile updates use the backend to ensure cross-platform delivery and centralized database synchronization.

| Feature | Service | Details |
| :--- | :--- | :--- |
| **Push Token Register** | **Backend** | `POST /api/notifications/register-token` |
| **Push Token Unregister** | **Backend** | `POST /api/notifications/unregister-token` |
| **Profile Update** | **Backend** | `POST /api/profile/update` (via `updateUserProfile`) |

---

## Summary Table

| Category | Primary Provider |
| :--- | :--- |
| **Authentication Flow** | Custom Backend (Sync'd to Supabase) |
| **Auth Session/Recovery** | Supabase Client |
| **Tournament Data** | Custom Backend |
| **AI Features** | Custom Backend |
| **Image Generation** | Custom Backend |
| **User Assets** | Custom Backend (Stored in CDN/S3/Supabase) |
