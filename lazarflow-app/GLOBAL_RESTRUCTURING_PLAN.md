# 🌐 LazarFlow Global Restructuring & TypeScript Migration Plan (Module-Based)

This document outlines the master plan to transition the entire LazarFlow codebase into a modular, production-grade **TypeScript** system. We will migrate module-by-module, starting from the user's first interaction (Onboarding).

---

## 🎯 Primary Objectives
1.  **Unified Language**: 100% migration to TypeScript (`.ts`, `.tsx`).
2.  **Module-First Architecture**: Grouping by feature rather than technical layer (e.g., `src/auth/` contains its own components, hooks, and types).
3.  **Strict Sequencing**: Onboarding → Auth → Dashboard → Lobby → Results.
4.  **Clean Separation**: Maintain clear boundaries between UI, logic, and data within each module.

---

## 🏗️ New Global Directory Structure (Modular)

Each module follows this internal layout:
```text
src/[module_name]/
├── components/     # Module-specific UI (atoms, molecules)
├── pages/          # Screen containers
├── hooks/          # Module-specific business logic
├── types/          # TypeScript interfaces for this module
├── services/       # API/Infrastructure implementation
└── utils/          # Helper functions unique to this module
```

### Module Roadmap:
1.  **`src/onboarding/`**: Landing, Tutorial, Welcome.
2.  **`src/auth/`**: Login, SignUp, ResetPassword, OTP.
3.  **`src/dashboard/`**: Home, LobbiesList, Profile, DesignTab.
4.  **`src/lobby/`**: Create, Edit, LiveView, ManageTeams.
5.  **`src/results/`**: ScreenshotProcessing, Mapping, Submission.
6.  **`src/shared/`**: Global components, themes, API clients, and common types.

---

## 🔄 Sequential Migration Roadmap

### Phase 1: Onboarding Module (Target 1)
- [ ] Define `src/onboarding/types/index.ts`.
- [ ] Migrate `OnboardingScreen.js` → `src/onboarding/pages/OnboardingPage.tsx`.
- [ ] Extract onboarding components to `src/onboarding/components/`.

### Phase 2: Auth Module (Target 2)
- [ ] Define `src/auth/types/index.ts` (Login, Register, Session).
- [ ] Migrate `LoginScreen.js`, `SignUpScreen.js`, `ForgotPasswordScreen.js`.
- [ ] Centralize auth logic in `src/auth/hooks/useAuth.ts`.
- [ ] Infrastructure: `src/auth/services/AuthRepository.ts`.

### Phase 3: Dashboard & Navigation
- [ ] Migrate `AppNavigator.js` to `src/shared/navigation/AppNavigator.tsx`.
- [ ] Restructure `src/dashboard/` with its respective tabs and components.

### Phase 4: Lobby & Results
- [ ] Finalize `src/lobby/` and `src/results/` modules using the established pattern.

---

## 🛠️ Technical Standards for Agents

1.  **TypeScript Only**: No `.js` files in new or migrated modules.
2.  **Named Exports**: Use named exports for all components and services.
3.  **Relative Imports**: Use `../../shared/...` for global utilities and `@/` aliases if configured.
4.  **Module Isolation**: Avoid cross-module component usage; use `src/shared/` for truly global pieces.
