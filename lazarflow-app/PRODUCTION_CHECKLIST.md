# 🚀 LazarFlow Production Checklist & Roadmap (Modular Migration)

This document tracks the migration of the codebase to a modular, production-grade **TypeScript** system. We are proceeding sequentially, starting from the entry points of the app.

---

## 🏗️ Architectural Status (Module-Based)

### 1. Global/Shared Foundation (TS)
- [x] **Core Models**: Defined in `src/shared/domain/models`. ([models/index.ts](file:///Users/praneeth/Lazarflow/LazarFlow/lazarflow-app/src/domain/models/index.ts))
- [x] **Base Repositories**: Infrastructure foundation established. ([BaseRepository.ts](file:///Users/praneeth/Lazarflow/LazarFlow/lazarflow-app/src/infrastructure/repositories/BaseRepository.ts))
- [x] **State Management**: Refactored `UserContext` with Reducer pattern. ([UserContext.js](file:///Users/praneeth/Lazarflow/LazarFlow/lazarflow-app/src/context/UserContext.js))

### 2. Module Migration Roadmap

#### 🟢 Target 1: Onboarding Module (`src/onboarding/`)
- [ ] **Types**: Define `OnboardingTypes.ts`.
- [ ] **Pages**: Migrate `OnboardingScreen.js` to `OnboardingPage.tsx`.
- [ ] **Components**: Extract tutorial/landing components to `src/onboarding/components/`.

#### 🟡 Target 2: Auth Module (`src/auth/`)
- [ ] **Types**: Define `AuthTypes.ts` (Login, SignUp, Session).
- [ ] **Services**: Implement `AuthRepository.ts` inside `src/auth/services/`.
- [ ] **Pages**: Migrate `LoginScreen.js`, `SignUpScreen.js`, `ForgotPasswordScreen.js` to `.tsx`.
- [ ] **Hooks**: Extract `useAuth.ts` logic.

#### 🟢 Target 3: Dashboard Module (`src/dashboard/`)
- [x] **Structure**: Reorganize Tabs (Home, Lobbies, Profile) into modular subfolders.
- [x] **Components**: Move `LobbyCard`, `ThemeCards` into `src/dashboard/components/`.

#### 🟢 Target 4: Lobby & Results Module (`src/lobby/`, `src/results/`)
- [x] **Lobby UI**: Modularized `CreateLobby`, `EditLobby`, `ManageTeams`, `LiveLobby` screens.
- [x] **Calculations**: Modularize `CalculateResultsScreen.js` and its associated hooks.

---

## 🎯 Production Readiness Checklist

### Critical Path
- [x] **Backend Endpoint**: Switched to `https://www.api.lazarflow.app`. ([apiClient.js](file:///Users/praneeth/Lazarflow/LazarFlow/lazarflow-app/src/lib/apiClient.js))
- [x] **Version Control**: Updated to `1.0.2` (Build 3). ([app.json](file:///Users/praneeth/Lazarflow/LazarFlow/lazarflow-app/app.json))
- [ ] **TypeScript Migration**: Target 100% `.ts`/`.tsx` coverage.
- [ ] **EAS Build Stability**: Monitor Android/iOS build status.

### UI/UX Refinement
- [x] **AI Feedback**: Enhanced player numbering and icons.
- [x] **Visual Differentiation**: Added mapping status indicators.
- [ ] **Dark Mode Audit**: Ensure consistent UI across all new modules.

---

## 🤖 Guidelines for Agents (AI Collaborators)

1. **Strict Sequencing**: Only work on the current **Target** module unless instructed otherwise.
2. **Module Anatomy**: Every module must have `pages/`, `components/`, `types/`, and `services/`.
3. **No Cross-Pollination**: Keep module logic self-contained. Use `src/shared/` for shared assets.
4. **Named Exports**: Consistent export patterns across the entire project.
5. **Update This File**: Always update this checklist after finishing a module or significant task.
