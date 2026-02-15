# LazarFlow 🚀
### The Ultimate Esports Lobby Management System

LazarFlow is a professional-grade mobile application built to streamline the management of esports tournaments and lobbies. It features AI-powered result extraction, customizable design themes, and a robust point calculation system.

---

## 🏗️ Project Structure

The project is organized into two main parts: the mobile application and the web interface.

### 📱 [LazarFlow App](file:///c:/Users/Dell/OneDrive/Desktop/Coding/whatsappbotlazarflow/lazarflow_app/LazarFlow/lazarflow-app)
- **`src/screens/`**: Contains all UI screens (Dashboard, Lobby Creation, Result Calculation, etc.).
- **`src/lib/`**: Core logic and utilities:
    - `supabaseClient.js`: Supabase integration for database and auth.
    - `aiResultExtraction.js`: AI logic for reading screenshot data.
    - `dataService.js`: API calls and data fetching logic.
- **`src/components/`**: Reusable UI components.
- **`src/styles/`**: Global theme and design tokens.
- **`assets/`**: Images, fonts, and static resources.

### 🌐 [LazarFlow Web](file:///c:/Users/Dell/OneDrive/Desktop/Coding/whatsappbotlazarflow/lazarflow_app/lazarlow-web)
- Web interface for viewing results and managing community designs.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React Native (Expo) |
| **Backend / DB** | Supabase (PostgreSQL + Auth + Storage) |
| **Design / Icons** | Lucide React Native, Expo Linear Gradient |
| **AI Processing** | Custom AI Result Extraction (OCR + Logic) |
| **State / Storage** | React Hooks, AsyncStorage |
| **Navigation** | React Navigation (Stack) |

---

## ✨ Key Features

- **🏆 Dynamic Lobby Management**: Create and manage tournaments with custom point systems.
- **🤖 LexiView AI**: Automatically extract results from Free Fire / BGMI screenshots.
- **🎨 Professional Themes**: Generate high-quality standings images using the custom design engine.
- **📊 Detailed Analytics**: Track player kills, WWCDs, and tournament statistics.
- **💳 Subscription System**: Tiered access for free and premium users.

---

## 📖 User Guide: Getting Started

### 1. Creating a Tournament (Lobby)
1. Open the app and go to the **Dashboard**.
2. Tap the **"+" (Create Lobby)** button.
3. Fill in the **General Info** (Name, Game type).
4. Configure the **Points System** (Placement points & Kill points).
5. Add **Teams** to the lobby. You can add pre-registered teams or create new ones.

### 2. registering Teams
1. Navigate to **Manage Teams** or tap "Add Team" within a lobby.
2. Enter the **Team Name** and **Player Names**.
3. Teams will be stored in your library for reuse in future tournaments.

### 3. Calculating Results
There are two ways to get results in LazarFlow:

#### 🟢 Manual Method
1. Go to **Calculate Results** in your active lobby.
2. Search for the team and tap to add.
3. Input the **Position** and **Kills**.
4. The system automatically calculates total points based on your lobby rules.

#### ⚡ AI Method (LexiView AI)
1. Switch to the **LexiView AI** tab in the Calculate Results screen.
2. Upload a screenshot of the end-game standings.
3. The AI will extract positions, kills, and teammate names.
4. **Verify & Map**: Match the AI-detected teams to your registered lobby teams.
5. Tap **Apply Results** to auto-fill the standings.

### 4. Exporting Results
1. Navigate to **Live Lobby** or **Results**.
2. Tap **Export Standings**.
3. Choose a **Theme** (Template) and customize colors/logos if needed.
4. Share the professional image directly with your community!

---

## 🔧 Developer Manual: Updating the App

### 🎨 Updating the Frontend
- **Styles**: Modify `src/styles/theme.js` to change global colors, fonts, or spacing.
- **Screens**: Each screen in `src/screens/` follows a standard React Native functional component structure.
- **Navigation**: Update constants or routes in `src/navigation/` or root `App.js`.

### ⚖️ Updating Terms & Policies
To modify the Legal text:
- Open [TermsAndConditionsScreen.js](file:///c:/Users/Dell/OneDrive/Desktop/Coding/whatsappbotlazarflow/lazarflow_app/LazarFlow/lazarflow-app/src/screens/TermsAndConditionsScreen.js)
- Open [PrivacyPolicyScreen.js](file:///c:/Users/Dell/OneDrive/Desktop/Coding/whatsappbotlazarflow/lazarflow_app/LazarFlow/lazarflow-app/src/screens/PrivacyPolicyScreen.js)
- Edit the text within the `ScrollView` content.

### 🗄️ Database Changes
Database schema is tracked in [DATABASE_SCHEMA.md](file:///c:/Users/Dell/OneDrive/Desktop/Coding/whatsappbotlazarflow/lazarflow_app/LazarFlow/DATABASE_SCHEMA.md).
- Any changes to tables (profiles, lobbies, lobby_teams) should be performed via the Supabase Dashboard SQL Editor or UI.

---

## 🚀 Deployment
- **Android**: Run `npm run build:prod` to trigger an EAS Build.
- **Development**: Run `npx expo start` to launch the dev server.

---
*Developed for LazarFlow Esports Management.*
