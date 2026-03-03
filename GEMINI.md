# Gemini Workspace Context: LazarFlow Mobile App

This document provides essential context for the LazarFlow mobile application codebase.

## Project Overview

LazarFlow is a React Native mobile application built with the Expo framework. It is designed for managing competitive gaming tournaments and includes features for user authentication, team and lobby management, AI-powered data extraction from text/images, and a tiered subscription system.

**Key Technologies:**
*   **Frontend:** React Native (with Expo)
*   **Backend:** Supabase (for authentication and database) and a custom API backend (`api.lazarflow.app`) for AI tasks.
*   **Navigation:** React Navigation
*   **State Management:** React Context API (`UserContext`) and custom hooks.

**Architecture:**
The application follows a modular structure:
*   `src/screens`: Contains the UI components for each screen.
*   `src/navigation`: Defines the app's navigation flow.
*   `src/lib`: Contains service modules for interacting with Supabase (`supabaseClient.js`) and the custom API (`apiClient.js`).
*   `src/context`: Manages global state, such as user authentication status.
*   `src/hooks`: Contains custom hooks for business logic, like managing user subscriptions.

## Building and Running

The project uses `npm` as its package manager. The following commands are defined in `package.json`:

*   **Start the development server:**
    ```bash
    npm start
    ```
*   **Run on Android:**
    ```bash
    npm run android
    ```
*   **Run on iOS:**
    ```bash
    npm run ios
    ```
*   **Run on Web:**
    ```bash
    npm run web
    ```
*   **Create a production build for Android:**
    ```bash
    npm run build:prod
    ```

## Development Conventions

*   **State Management**: Global user state is managed in `UserContext`. For screen-specific or feature-specific state, custom hooks are used (e.g., `useSubscription`).
*   **API Interaction**: All interactions with the custom backend API should go through the `apiClient` in `src/lib/apiClient.js`. This client handles JWT authentication and token refreshing.
*   **Database Interaction**: Direct database interactions are handled via the `supabase` client in `src/lib/supabaseClient.js`.
*   **Styling**: The application uses a custom theme object defined in `src/styles/theme.js` for consistent styling.
*   **Credentials**: The Supabase URL and key are currently hardcoded in `src/lib/supabaseClient.js`. For any changes, it is recommended to move these to a `.env` file.
