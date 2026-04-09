# LazarFlow: High-Level Production-Grade Refactoring Plan

**Author:** LazarFlow Senior AI Architect  
**Status:** Proposal / Strategic Roadmap  
**Target:** Clean Architecture, Scalability, and Professional Code Standards

---

## 1. Executive Summary
This document outlines a step-by-step strategic plan to transform the existing LazarFlow codebase into a modular, testable, and maintainable "production-grade" system. We will transition from a traditional "Big Component" architecture to **Clean Architecture** principles, separating concerns into distinct layers: UI (Presentation), Business Logic (Domain), and Data (Infrastructure).

---

## 2. Core Principles & Standards
To ensure a professional-grade system, all subsequent agents and developers must adhere to:
- **SOLID Principles:** Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.
- **DRY (Don't Repeat Yourself):** Extract common logic into hooks and utilities.
- **Type Safety:** Gradual migration to TypeScript for better developer experience and bug prevention.
- **Atomic Design:** UI components broken down into Atoms, Molecules, and Organisms.
- **Predictable State:** Clear separation between local UI state and global application state.

---

## 3. Step-by-Step Implementation Plan

### Phase 1: Foundation & Infrastructure (The "Core")
*Objective: Stabilize the base and define how data flows.*

1.  **TypeScript Migration:**
    - Initialize `tsconfig.json` properly.
    - Define core Domain Models (Interfaces) for `Lobby`, `Team`, `User`, and `Result`.
    - *Why:* Prevents "undefined is not a function" errors and provides auto-complete for all future agents.

2.  **Advanced API Layer (Repository Pattern):**
    - Refactor `apiClient.js` to use a more robust class-based approach.
    - Implement a `Repository` pattern (e.g., `LobbyRepository`, `AuthRepository`) to abstract Supabase and Custom API calls.
    - *Why:* Allows switching backends or mocking data for tests without touching UI code.

3.  **Centralized State Management (Context + Reducers):**
    - Move beyond simple `useState` in `UserContext`.
    - Implement `Action/Reducer` patterns for complex state like "Current Lobby Management" to ensure state transitions are predictable.

### Phase 2: Component Deconstruction (Presentation Layer)
*Objective: Break down heavy screens into manageable, reusable pieces.*

1.  **Extract Business Logic to Custom Hooks:**
    - Example: Create `useLobbyMapping.js` from logic in `CalculateResultsScreen.js`.
    - Example: Create `useAIExtraction.js` to handle image picking and AI processing.
    - *Why:* Keeps components "dumb" (view-only) and logic "smart" (reusable).

2.  **Atomic UI Library:**
    - Move inline styles and repeated UI patterns (Badges, Buttons, Cards) into `src/components/atoms` and `src/components/molecules`.
    - Standardize theme usage across all components using the `Theme` object.

3.  **Error Boundary & Global Feedback:**
    - Implement a standardized `AsyncBoundary` or `Result` pattern for handling Loading, Error, and Success states consistently across all screens.

### Phase 3: Logic Refinement & Reliability (The "Brain")
*Objective: Ensure complex algorithms are robust and verified.*

1.  **Logic Decoupling:**
    - Move heavy calculation logic (Points calculation, fuzzy matching) from `CalculateResultsScreen.js` into dedicated service files in `src/services/`.
    - *Why:* Makes these functions pure and easily unit-testable.

2.  **Validation Layer:**
    - Implement a schema-based validation (e.g., using `Zod` or `Yup`) for API responses and user inputs.
    - *Why:* Ensures the app doesn't crash if the AI returns unexpected data formats.

### Phase 4: Developer Experience & Documentation
*Objective: Ensure the system is "Agent-Ready" and maintainable.*

1.  **Standardized Documentation (JSDoc):**
    - Every service, hook, and component must have JSDoc headers explaining inputs, outputs, and side effects.
2.  **Module Aliasing:**
    - Setup `@components`, `@hooks`, `@services` aliases in `babel.config.js` and `jsconfig.json`.
    - *Why:* Eliminates messy `../../../` imports.

---

## 4. Specific Target: `CalculateResultsScreen.js` Refactor
As the most complex screen, it serves as the primary candidate for this plan:
- **Before:** 2000+ lines, handling UI, AI Logic, Mapping Logic, Points Calculation, and API calls.
- **After:**
    - `CalculateResultsScreen.js` (View Wrapper)
    - `components/results/MappingStep.js` (Isolated Organism)
    - `components/results/StandingsList.js` (Isolated Organism)
    - `hooks/useCalculateResults.js` (Logic Controller)
    - `services/pointsCalculator.js` (Pure Logic)

---

## 5. Instructions for Future Agents
When picking up a task from this plan:
1.  **Locate the Layer:** Identify if the change is Data, Domain, or Presentation.
2.  **Follow the Pattern:** If refactoring a component, extract logic to a hook first.
3.  **Type Everything:** Always update or create interfaces for new data structures.
4.  **Document:** Update the `REFACTORING_PLAN.md` progress if a major step is completed.

---
*End of Plan*
