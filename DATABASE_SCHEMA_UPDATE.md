# Database Schema Update - Support System

## New Table: `public.support_tickets`

**Purpose**: Stores user support requests, feedback, bug reports, and feature requests.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | **Primary Key**. Unique identifier. Default: `gen_random_uuid()`. |
| `user_id` | `uuid` | **Foreign Key** to `auth.users`. The user who submitted the ticket. Nullable (for guest feedback if allowed). |
| `email` | `text` | Contact email of the submitter. |
| `subject` | `text` | Short summary of the request. |
| `message` | `text` | Detailed description. |
| `type` | `text` | Type of request: `feedback`, `support`, `feature`, `bug`, `feedback_form`, `notification`, `site_update`. |
| `priority` | `text` | Priority level: `low`, `normal`, `high`. Default: `normal`. |
| `status` | `text` | Current status: `open`, `in_progress`, `resolved`, `closed`. Default: `open`. |
| `created_at` | `timestamptz` | Creation timestamp. Default: `now()`. |
| `updated_at` | `timestamptz` | Last update timestamp. Default: `now()`. |

**RLS Policies**:
- **Insert**: Authenticated users can insert their own tickets.
- **Select**: Users can see their own tickets. Admins can see all tickets.
- **Update**: Admins can update status/priority. Users can update their own tickets (optional).

```sql
-- Create Table
create table public.support_tickets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  subject text not null,
  message text not null,
  type text not null default 'feedback',
  priority text not null default 'normal',
  status text not null default 'open',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.support_tickets enable row level security;

-- Policies
create policy "Users can insert their own tickets"
  on public.support_tickets for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own tickets"
  on public.support_tickets for select
  using (auth.uid() = user_id);

create policy "Admins can view all tickets"
  on public.support_tickets for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

create policy "Admins can update tickets"
  on public.support_tickets for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );
```
