# 🤝 LazarFlow Agent Handoff & Continuity Guide

This document provides essential instructions for any AI agent (or human developer) continuing the global restructuring and TypeScript migration of the LazarFlow codebase.

---

## 🏗️ Current Project Vision
We are transitioning the entire codebase from a monolithic, JavaScript-based structure to a **Module-First Clean Architecture** using **TypeScript**. The goal is 100% type safety, modular isolation, and a production-grade codebase.

## 📍 Current Progress
- [x] **Global Models & Base Repository**: Foundation established in `src/shared/`.
- [x] **Target 1: Onboarding Module**: Fully migrated to `src/onboarding/` (TSX/TS).
- [x] **Target 2: Auth Module**: Fully migrated to `src/auth/` (TSX/TS).
- [ ] **Target 3: Dashboard Module**: Next migration target.

---

## 🛠️ Implementation Rules (Non-Negotiable)

### 1. Module Structure
Every new or migrated module MUST follow this internal directory layout:
- `pages/`: Screen containers (minimal logic).
- `components/`: Module-specific UI (atoms, molecules).
- `hooks/`: Business logic and state management (e.g., `use[Module]`).
- `types/`: Dedicated TypeScript interfaces (`index.ts`).
- `services/`: API and infrastructure implementation (`[Module]Repository.ts`).
- `README.md`: Explanation of every file in the module.

### 2. TypeScript Standards
- **Strict Typing**: No `any`. Use interfaces from `src/[module]/types/` or `src/shared/domain/models/`.
- **Functional Components**: Use `React.FC` for components and props.
- **Named Exports**: Always use named exports (e.g., `export const MyComponent = ...`) for consistency.

### 3. Logic & Data
- **No API in Components**: All API calls must go through a Repository in `services/`.
- **Hooks for Logic**: Complex state or effects should live in a custom hook in `hooks/`.
- **Infrastructure Inheritance**: All repositories should extend `BaseRepository` from `src/shared/infrastructure/repositories/`.

---

## 🔄 How to Continue
1.  **Check the Status**: Review [PRODUCTION_CHECKLIST.md](file:///Users/praneeth/Lazarflow/LazarFlow/lazarflow-app/PRODUCTION_CHECKLIST.md) for the current migration target.
2.  **Audit the Legacy Screen**: Find the corresponding `.js` file in `src/screens/`.
3.  **Define Types**: Start by creating the `types/index.ts` for the module.
4.  **Extract Logic**: Move API calls to a new Repository and business logic to a Hook.
5.  **Deconstruct UI**: Identify reusable parts and move them to `components/`.
6.  **Migrate Page**: Create the final `.tsx` page and update the `AppNavigator.js`.
7.  **Document**: Create the module `README.md` and update this handoff/checklist.

---

## 🚦 Navigation & Verification
- Always update [AppNavigator.js](file:///Users/praneeth/Lazarflow/LazarFlow/lazarflow-app/src/navigation/AppNavigator.js) after migrating a screen.
- Verify that the new modular screen functions exactly as the legacy one before deleting the old file.
