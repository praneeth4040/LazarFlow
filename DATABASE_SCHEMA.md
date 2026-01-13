# Database Schema Documentation

This document outlines the database schema for the LazarFlow application, detailing the purpose of each table, its structure, and relationships.

## Overview

The schema is designed to manage e-sports tournaments and participating teams. It handles:
1.  **Tournament Management**: Creating, configuring, and styling tournaments.
2.  **Team Management**: Roster, score tracking, and real-time updates for teams.

---

## Tables

### 1. `public.lobbies`
**Purpose**: The core entity representing an e-sports tournament/lobby. It holds configuration details, scoring rules, and visual customization settings.

|create table public.profiles (
  id uuid not null,
  username text null,
  display_name text null,
  avatar_url text null,
  subscription_tier text not null default 'free'::text,
  subscription_status text not null default 'active'::text,
  subscription_expires_at timestamp with time zone null,
  feature_flags jsonb not null default '{}'::jsonb,
  theme_config jsonb not null default '{}'::jsonb,
  is_admin boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  lobbies_created_count integer null default 0,
  emails character varying null,
  expo_push_token text null,
  phone bigint null,
  constraint profiles_pkey primary key (id),
  constraint profiles_phone_key unique (phone),
  constraint profiles_username_key unique (username),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;--

### 2. `public.lobby_teams`
**Purpose**: Represents a team participating in a specific lobby/tournament. It stores roster information and current standings.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | **Primary Key**. Unique identifier for the team entry. Default: `gen_random_uuid()`. |
| `lobby_id` | `uuid` | **Foreign Key** to `lobbies`. The lobby this team belongs to. On Delete: `CASCADE`. |
| `team_name` | `varchar(255)` | Name of the team. |
| `created_at` | `timestamptz` | Creation timestamp. Default: `CURRENT_TIMESTAMP`. |
| `updated_at` | `timestamptz` | Last update timestamp. Default: `CURRENT_TIMESTAMP`. |
| `total_points` | `jsonb` | Detailed points breakdown. Default: `{"wins": 0, "kill_points": 0, "matches_played": 0, "placement_points": 0}`. |
| `members` | `jsonb` | JSON structure storing player details. Default: `[]`. |

**Indices**:
- `idx_tournament_teams_tournament_id` on `lobby_id`

**Relationships**:
- **Many-to-One** with `lobbies`.

---

### 3. `public.profiles`
**Purpose**: Stores user-specific data, including profile information, subscription status, and theme preferences.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | **Primary Key**. Foreign key to `auth.users(id)`. On Delete: `CASCADE`. |
| `username` | `text` | **Unique**. User's handle. |
| `display_name` | `text` | Public display name. |
| `avatar_url` | `text` | URL for the user's avatar image. |
| `subscription_tier`| `text` | Subscription plan (e.g., 'free', 'pro'). Default: `'free'`. |
| `subscription_status`| `text` | Current status of the subscription. Default: `'active'`. |
| `subscription_expires_at` | `timestamptz` | When the current subscription expires. |
| `feature_flags` | `jsonb` | Flags to enable/disable features for the user. Default: `{}`. |
| `theme_config` | `jsonb` | User-level theme preferences. Default: `{}`. |
| `is_admin` | `boolean` | Administrator flag. Default: `false`. |
| `lobbies_created_count` | `integer` | Count of lobbies created. Default: `0`. |
| `emails` | `varchar` | User email address. |
| `expo_push_token` | `text` | Expo push notification token. |
| `phone` | `bigint` | **Unique**. User's phone number. |
| `created_at` | `timestamptz` | Creation timestamp. Default: `now()`. |
| `updated_at` | `timestamptz` | Last update timestamp. Default: `now()`. |

**Relationships**:
- **One-to-One** with `auth.users` (A user has one profile).

---

### 4. `public.themes`
**Purpose**: Stores custom design themes uploaded by users or provided by the system.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | **Primary Key**. Unique identifier for the theme. Default: `gen_random_uuid()`. |
| `user_id` | `uuid` | **Foreign Key** to `auth.users`. The creator of the theme. On Delete: `CASCADE`. |
| `name` | `text` | Name of the theme. |
| `url` | `text` | URL to the theme image/resource (can be relative path in storage). |
| `status` | `text` | Verification status: `'pending'`, `'verified'`, or `'rejected'`. Default: `'pending'`. |
| `created_at` | `timestamptz` | Creation timestamp. Default: `now()`. |
| `updated_at` | `timestamptz` | Last update timestamp. Default: `now()`. |
| `mapping_config` | `jsonb` | Configuration for mapping data to the theme visual. Default: `{}`. |

**Constraints**:
- `status` must be one of: `'pending'`, `'verified'`, `'rejected'`.

**Relationships**:
- **Many-to-One** with `auth.users` (via `user_id`).

---

## Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS ||--|{ PROFILES : "has"
    USERS ||--o{ LOBBIES : "creates"

    LOBBIES ||--|{ LOBBY_TEAMS : "contains"

    PROFILES {
        uuid id PK
        text username
        text display_name
        text avatar_url
        text subscription_tier
        text subscription_status
        timestamptz subscription_expires_at
        jsonb feature_flags
        jsonb theme_config
        boolean is_admin
        timestamptz created_at
        timestamptz updated_at
    }

    LOBBIES {
        uuid id PK
        uuid user_id FK
        varchar name
        varchar game
        jsonb points_system
        integer kill_points
        varchar status
        timestamptz created_at
        timestamptz updated_at
        text share_id UK
        boolean is_public
        uuid selected_template_id
        text theme
        jsonb final_standings
        jsonb theme_config
    }

    LOBBY_TEAMS {
        uuid id PK
        uuid lobby_id FK
        varchar team_name
        timestamptz created_at
        timestamptz updated_at
        jsonb total_points
        jsonb members
    }

    THEMES {
        uuid id PK
        uuid user_id FK
        text name
        text url
        text status
        timestamptz created_at
        timestamptz updated_at
        jsonb mapping_config
    }
```
