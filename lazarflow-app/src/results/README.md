# Results Module (`src/results/`)

This directory contains the LexiView AI orchestration domain, acting as the bridge between raw screenshot inputs and finalized lobby Leaderboards.

## Key Responsibilities
- Uploading and stitching Match Result Screenshots locally.
- Coordinating direct API requests for OCR text-extraction against the backend.
- Providing an interactive UI Wizard for users to map parsed image slots to real registered players (`CalculateResultsPage.tsx`).

## File Highlight
- `pages/CalculateResultsPage.tsx`: Handles complex matrix assignments. The rendered table inside this wizard acts as the exact point where "Staging Results" are actively manipulated and rendered prior to formal submission.
