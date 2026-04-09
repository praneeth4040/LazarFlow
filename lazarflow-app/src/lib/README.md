# Libraries (`src/lib/`)

This directory serves as the core utility and external communication layer stack. Pure JavaScript abstractions for external providers are located here.

## Contents
- **`apiClient.js`**: Core custom JWT authentication interceptor and fetch wrapper for the proprietary AI Backend.
- **`supabaseClient.js`**: Initializer and exporter for the core `@supabase/supabase-js` database bindings.
- **`dataService.js` & `authService.js`**: Abstracted wrapper methods targeting Supabase APIs directly (simplifying cross-cutting repository concepts).
- **`aiUtils.js` & `aiExtraction.js`**: Fuzzy-matching logic and backend proxy callers for the advanced LexiView AI OCR image pipelines.
- **`dateUtils.js`**: Date mapping and formatting primitives.
- **`AlertService.js`**: UI wrappers abstracting generic dialogs to avoid vendor lock-in.
