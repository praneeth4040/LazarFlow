# Layout Customization Implementation Plan

## Overview
This document outlines the strategy for implementing a robust layout customization system for the `LiveTournament` page. Users will select a base layout (Single, Split, or Card), customize it (colors, fonts, background), and save these preferences to be reflected in the public live view.

## 1. Architecture & Routing

### Current Flow
- User visits "Layout" tab in Dashboard.
- User sees 3 layout options.

### New Flow
1.  **Layout Selection**: User clicks a layout card in `LayoutContent`.
2.  **Redirection**: User is redirected to a new Editor route.
    -   **Route**: `/edit-layout/:layoutId` (e.g., `/edit-layout/single`, `/edit-layout/split`)
3.  **Customization**: User modifies styles in real-time.
4.  **Save**: Configuration is saved to the database.
5.  **Live View**: `LiveTournament.jsx` fetches and applies the configuration.

## 2. Database Schema Changes

We need to store the customization data.

**Table**: `tournaments`
**New Column**: `theme_config` (JSONB)

**Example JSON Structure**:
```json
{
  "baseLayout": "single", // 'single', 'split', 'card'
  "theme": {
    "backgroundColor": "#0f172a",
    "primaryColor": "#38bdf8",
    "secondaryColor": "#1e293b",
    "fontFamily": "Outfit",
    "textColor": "#ffffff"
  },
  "components": {
    "header": { "show": true, "alignment": "center" },
    "mvpSection": { "show": true }
  }
}
```

## 3. New Components

### A. `EditLayout.jsx` (Page)
This is the main container for the editing experience.
-   **Layout**: Split screen.
    -   **Left**: `EditorSidebar` (Controls)
    -   **Right**: `LivePreview` (The actual `LiveTournament` component in "preview mode")

### B. `EditorSidebar.jsx`
Contains form controls for:
-   Background Color (Color Picker)
-   Text Colors (Color Picker)
-   Font Selection (Dropdown)
-   Background Image (Upload)
-   Component Toggles (Show/Hide Header, MVPs, etc.)

### C. `LivePreview` Wrapper
A wrapper around the existing `LiveTournament` component.
-   Passes `previewConfig` prop to `LiveTournament` to override database data with current editor state.
-   Prevents actual API calls if needed, or uses mock data for smoother editing.

## 4. Implementation Steps

### Step 1: Route Setup
Update `App.jsx` to include the new route:
```jsx
<Route path="/edit-layout/:layoutId" element={<EditLayout />} />
```

### Step 2: Create `EditLayout` Page
Create `src/pages/EditLayout.jsx`.
-   Use `useParams` to get `layoutId`.
-   Use `useSearchParams` to get `tournamentId`.
-   Manage `config` state (colors, fonts, etc.).

### Step 3: Refactor `LiveTournament.jsx`
Modify `src/pages/LiveTournament.jsx` to accept a `customConfig` prop (optional).
-   **If `customConfig` is present**: Use it (Preview Mode).
-   **If not**: Fetch `layout_config` from Supabase (Live Mode).
-   Apply styles using CSS Variables (e.g., `var(--live-bg-color)`) injected via an inline `<style>` tag or root style object.

### Step 4: Build the Editor UI
-   Implement `EditorSidebar` with inputs.
-   Add "Save" button to update the `tournaments` table in Supabase.

### Step 5: Update `LayoutContent.jsx`
-   Change `onClick` behavior of cards to navigate to `/edit-layout/{layout}?tournamentId={activeTournamentId}`.

## 5. Technical Details for Customization

### Using CSS Variables
In `LiveTournament.jsx`:
```jsx
const styles = {
  '--live-bg': config.theme.backgroundColor,
  '--live-text': config.theme.textColor,
  '--live-font': config.theme.fontFamily,
}

return (
  <div className="live-container" style={styles}>
    ...
  </div>
)
```

In `LiveTournament.css`:
```css
.live-container {
  background-color: var(--live-bg, #0f172a); /* Fallback to default */
  color: var(--live-text, #ffffff);
  font-family: var(--live-font, 'Outfit');
}
```

## 6. Next Actions for You
1.  **Select a Layout**: Navigate to the Layout tab.
2.  **Click & Edit**: You will be taken to the editor.
3.  **Customize**: Tweak the look.
4.  **Publish**: Save changes to go live.
