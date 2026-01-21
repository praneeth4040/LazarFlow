# Themes Schema
create table public.themes (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  name text not null,
  url text not null,
  status text null default 'pending'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  mapping_config jsonb null default '{}'::jsonb,
  constraint themes_pkey primary key (id),
  constraint themes_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint themes_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'verified'::text,
          'rejected'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

# Lobbies Schema
create table public.lobbies (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  name character varying(255) not null,
  game character varying(50) not null,
  points_system jsonb not null,
  kill_points integer null default 1,
  status character varying(50) null default 'active'::character varying,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  share_id text null,
  is_public boolean null default false,
  selected_template_id uuid null,
  theme text null default 'darkBlue'::text,
  final_standings jsonb null default '[]'::jsonb,
  theme_config jsonb null default '{}'::jsonb,
  constraint lobbies_pkey primary key (id),
  constraint lobbies_share_id_key unique (share_id),
  constraint lobbies_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_lobbies_user_id on public.lobbies using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_lobbies_status on public.lobbies using btree (status) TABLESPACE pg_default;

create index IF not exists idx_lobbies_share_id on public.lobbies using btree (share_id) TABLESPACE pg_default;

create trigger on_lobby_created
after INSERT on lobbies for EACH row
execute FUNCTION increment_lobby_count ();

# Lobby Teams Schema
create table public.lobby_teams (
  id uuid not null default gen_random_uuid (),
  lobby_id uuid not null,
  team_name character varying(255) not null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  total_points jsonb null default '{"wins": 0, "kill_points": 0, "matches_played": 0, "placement_points": 0}'::jsonb,
  members jsonb null default '[]'::jsonb,
  constraint lobby_teams_pkey primary key (id),
  constraint lobby_teams_lobby_id_fkey foreign KEY (lobby_id) references lobbies (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_lobby_teams_lobby_id on public.lobby_teams using btree (lobby_id) TABLESPACE pg_default;

# Profiles Schema
create table public.profiles (
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
) TABLESPACE pg_default;

# Chat Messages Schema
create table public.chat_messages (
  id uuid not null default gen_random_uuid (),
  sender_number text not null,
  user_id uuid null,
  role text not null,
  content text not null,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  constraint chat_messages_pkey primary key (id),
  constraint chat_messages_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade
) TABLESPACE pg_default;

create index IF not exists idx_chat_messages_sender_number on public.chat_messages (sender_number);

# Teams Schema
create table public.teams (
  id uuid not null default gen_random_uuid (),

  -- identity
  name character varying(255) not null,
  game character varying(50) not null,

  -- ownership (NULL = ghost team)
  owner_user_id uuid null,

  -- lifetime participation
  lobbies_count integer not null default 0,
  lobbies_played uuid[] not null default '{}',

  -- team members (array of profile IDs)
  members jsonb not null default '[]'::jsonb,

  constraint teams_pkey primary key (id),

  constraint teams_owner_user_id_fkey
    foreign key (owner_user_id)
    references public.profiles (id)
    on delete set null
) TABLESPACE pg_default;
