# Global Components (`src/components/`)

This directory houses purely generic, reusable UI primitives that are domain-agnostic. 

If a component is tightly coupled to a specific feature (like a Leaderboard for the Lobby), it belongs in the `components/` subfolder of that specific module (e.g., `src/lobby/components/`). Only items used universally across multiple distinct modules exist here.

## Contents
- **`GlobalAlert.js`**: Global custom alert provider logic.
- **`ProcessingOverlay.tsx`**: A full-screen LexiView artificial intelligence scanning overlay indicating busy states.
