# Shared Module (`src/shared/`)

This directory establishes purely uncoupled architecture standards. Components or pages placed here represent structural patterns that the entire project requires to function fundamentally.

## Sub-Directories
- `/pages/`: Houses the global `GenericErrorPage.tsx` which is the ultimate Error Boundary fallback screen preventing random crashes.
- `/navigation/`: Houses `AppNavigator.tsx`, the single source-of-truth Stack Router bridging all 10+ modules securely together.
- `/domain/`: Common TypeScript interfaces across domains.
- `/infrastructure/`: Global singletons (like base classes for repositories).
