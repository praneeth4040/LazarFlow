# Lobby Module (`src/lobby/`)

The crown jewel module for LazarFlow. This directory encapsulates all processes surrounding the creation, viewing, and operation of a singular tournament context (a "Lobby").

## Key Responsibilities
- Rendering the core `LiveLobbyPage` where the real-time leaderboard is displayed.
- Providing forms and validation hooks to edit lobby parameters (`useCreateLobby`, `useEditLobby`).
- Managing the entry of participants and syncing real-time positions.

## Structure
- `/pages/`: `CreateLobbyPage`, `LiveLobbyPage`, and forms.
- `/hooks/`: Specialized state wrappers specific exclusively to Lobbies.
- `/components/`: Granular UI chunks (e.g. `ResultsBottomSheet.tsx`, which serves as the finalized rendering plane for the Post-Match Leaderboard).
