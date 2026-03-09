# LazarFlow Codebase Documentation

**Date:** March 09, 2026
**Version:** 1.0.0

## 1. Executive Summary

LazarFlow is a mobile application designed for competitive gaming tournament management. It enables users to create lobbies, manage teams, extract participant data from images/text using AI, and generate professional-grade visual standings and results.

The application is built with **React Native (Expo)** and communicates with a custom backend (`api.lazarflow.app`) and **Supabase** for authentication and data persistence.

---

## 2. Technical Architecture

### 2.1 Tech Stack
*   **Framework:** React Native with Expo SDK 54.
*   **Language:** JavaScript (ES6+).
*   **Navigation:** React Navigation (Stack).
*   **State Management:** React Context (`UserContext`) + Custom Hooks.
*   **Networking:** Axios with Interceptors.
*   **Authentication:** Supabase Auth (JWT) + Custom Session Management.
*   **Storage:** AsyncStorage (Caching & Persistence).
*   **UI Library:** Lucide React Native (Icons), Expo Linear Gradient.

### 2.2 Key Architectural Patterns

*   **Service-Oriented Architecture:** Business logic is strictly separated from UI components. All API interactions, auth logic, and heavy lifting reside in `src/lib/`.
*   **Interceptor Pattern:** `apiClient.js` uses Axios interceptors to automatically inject the Bearer token into requests and handle 401 errors by refreshing tokens transparently, ensuring a seamless user experience.
*   **Event-Driven Authentication:** An `EventEmitter` (`authEvents.js`) broadcasts `SIGNED_IN` and `SIGNED_OUT` events. This decouples the auth service from the UI, allowing any part of the app to trigger a global logout or react to session changes.
*   **Optimistic UI & Caching:** `dataService.js` implements manual caching for heavy resources like themes (`AsyncStorage`) to reduce network load and improve start-up time.

---

## 3. Core Modules & Data Flow

### 3.1 Authentication (`src/lib/authService.js`)
*   **Provider:** Supabase.
*   **Mechanism:** JWT (JSON Web Tokens).
*   **Flow:**
    1.  User logs in via `authService.login()`.
    2.  Session is stored in Supabase client and local storage.
    3.  `authEvents` emits `SIGNED_IN`, triggering `AppNavigator` to switch to the Main Stack.
    4.  Subsequent API calls via `apiClient` automatically attach the `access_token`.

### 3.2 Lobby & Team Management (`src/lib/dataService.js`)
This module handles the core CRUD operations for the tournament logic.
*   **Lobbies:** Created, updated, and ended via REST endpoints (`/api/lobbies`).
*   **Teams:** Managed as sub-resources of lobbies. Supports **batch operations** (`batchUpdateTeams`) for efficiency when editing multiple teams at once.
*   **Data Models:**
    *   `Lobby`: Contains settings, status, and share IDs.
    *   `Team`: Contains name, members, and scores.

### 3.3 AI & Image Generation
This is a standout feature of LazarFlow.
*   **AI Extraction (`src/lib/aiExtraction.js`):**
    *   Sends unstructured text or OCR data to `/api/ai/extract-teams`.
    *   The backend parses this into structured `{ name, members[] }` objects.
*   **Visual Rendering:**
    *   The app does *not* render the complex standings tables locally using React Native views for export.
    *   Instead, it requests a server-side render via `/render/${lobbyId}/${themeId}`.
    *   The server returns a binary image buffer (PNG), which the app displays and allows the user to save to their gallery.

### 3.4 Theme Engine
*   **System vs. User Themes:** Users can select community designs or upload their own assets.
*   **Caching Strategy:** Themes are cached in `AsyncStorage` with a 5-minute expiry (`CACHE_KEYS.USER_THEMES`).
*   **Asset Resolution:** `getDesignImageSource` handles the complexity of resolving image URLs, which may come from Supabase Storage, a CDN, or the custom API (`/storage/themes/`).

---

## 4. Folder Structure

```
lazarflow-app/
├── src/
│   ├── components/      # Reusable UI elements (DesignRenderer, GlobalAlert)
│   ├── context/         # Global State (UserContext)
│   ├── hooks/           # Custom React Hooks (useSubscription, usePushNotifications)
│   ├── lib/             # Service Layer (Business Logic & API Clients)
│   │   ├── aiExtraction.js    # AI Team parsing logic
│   │   ├── apiClient.js       # Axios instance with interceptors
│   │   ├── authService.js     # Supabase Auth wrapper
│   │   ├── dataService.js     # Main data repository (Lobbies, Teams, Themes)
│   │   └── supabaseClient.js  # Direct Supabase client
│   ├── navigation/      # Navigation Configuration (AppNavigator)
│   ├── screens/         # Application Views (1:1 with routes)
│   └── styles/          # Global Design Tokens (theme.js)
├── assets/              # Static Images & Icons
├── app.json             # Expo Configuration
└── package.json         # Dependencies & Scripts
```

---

## 5. Configuration & Build

### 5.1 Permissions (`app.json`)
The app requires extensive permissions on Android to support its media features:
*   `READ/WRITE_EXTERNAL_STORAGE`: For saving generated result images.
*   `CAMERA`: (Likely for future features or profile updates).
*   `INTERNET`: Core connectivity.

### 5.2 Deep Linking
*   **Scheme:** `lazarflow://`
*   **Universal Links:** configured for password resets (`/reset-password`).

### 5.3 Build Profiles
*   **Development:** `npm start`
*   **Production:** `npm run build:prod` (uses EAS Build).

---

## 6. API Interface Summary

The application interacts with `https://api.lazarflow.app` (proxied or direct) for the following key resources:

| Resource | Methods | Description |
| :--- | :--- | :--- |
| `/api/auth` | POST | Login, Register (handled via Supabase mostly) |
| `/api/lobbies` | GET, POST, PUT, DELETE | Tournament lobby management |
| `/api/teams` | PUT, DELETE | Individual team management |
| `/api/ai/extract-teams` | POST | AI text-to-team conversion |
| `/api/themes` | GET, POST | Fetch and upload design themes |
| `/render/...` | POST | Server-side image generation |
| `/api/notifications` | POST | Push token registration |
