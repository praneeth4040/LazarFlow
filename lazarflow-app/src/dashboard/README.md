# Dashboard Module (`src/dashboard/`)

This directory implements the central user portal, often presented immediately following a successful login. It wraps multiple application scopes (Lobbies, Layouts, Plans, Profiles) inside a unified tabbed navigational surface.

## Key Responsibilities
- Rendering the user's statistics and entry-points.
- Managing horizontal tab navigation (e.g., `DashboardPage.tsx` switching between Profile, Subscriptions, and Recent matches).
- Encapsulating the user's specific graphical layout elements like personalized results templates.

## Main Entry Points
- `pages/DashboardPage.tsx`: The primary orchestration layer mapping the dashboard tabs.
- `pages/DesignDetailsPage.tsx`: The display viewer for granular design templates available for the user.
