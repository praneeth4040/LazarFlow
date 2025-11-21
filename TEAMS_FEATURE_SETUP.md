# Teams Feature Setup Guide

## Overview
The team management system has been implemented with:
- ✅ **AddTeamsModal component** - Dual-mode team input (manual entry + AI extraction)
- ✅ **"Add Teams" button** on tournament cards
- ✅ **Database schema** - New `tournament_teams` table with RLS policies
- ✅ **Backend integration** - `handleAddTeams` function saves to Supabase

## Database Setup

### 1. Create the tournament_teams table
You need to run the updated `database-setup.sql` in your Supabase SQL editor:

**Steps:**
1. Go to Supabase Dashboard → Your Project
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the contents of `/database-setup.sql` from this project
5. Click **Run**

**OR** execute only the tournament_teams table creation:

```sql
-- Create tournament_teams table
CREATE TABLE tournament_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_name VARCHAR(255) NOT NULL,
  members TEXT[] DEFAULT '{}',
  total_points JSONB DEFAULT '{"matches_played": 0, "wins": 0, "kill_points": 0, "placement_points": 0}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tournament_teams_tournament_id ON tournament_teams(tournament_id);

ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert teams to their tournaments" ON tournament_teams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = tournament_teams.tournament_id 
      AND tournaments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read teams of their tournaments" ON tournament_teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = tournament_teams.tournament_id 
      AND tournaments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update teams of their tournaments" ON tournament_teams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = tournament_teams.tournament_id 
      AND tournaments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete teams from their tournaments" ON tournament_teams FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = tournament_teams.tournament_id 
      AND tournaments.user_id = auth.uid()
    )
  );
```

## Features Implemented

### 1. AddTeamsModal Component (`Client/src/components/AddTeamsModal.jsx`)
**Two Input Modes:**

**Manual Mode:**
- Type team name in input field
- Click "Add Team" button
- Teams appear in list with remove buttons
- Click "Submit" to save all teams

**AI Mode:**
- Paste tournament details text (from WhatsApp, Discord, etc.)
- Component automatically extracts team names
- Removes lines with URLs, dates, times, instructions, emojis
- Keeps valid team names
- Edit or remove extracted teams
- Click "Submit" to save

### 2. UI Integration
- **"Add Teams" button** added to tournament cards (blue, prominent)
- Opens AddTeamsModal on click
- Modal updates only when team data is submitted
- Smooth animations and responsive design

### 3. Data Flow
```
Tournament Card
    ↓
Click "➕ Teams" button
    ↓
AddTeamsModal opens (with selectedTournament context)
    ↓
User enters teams (manual or AI mode)
    ↓
Click "Submit"
    ↓
handleAddTeams() function called
    ↓
Teams saved to tournament_teams table via Supabase
    ↓
Success alert + modal closes
```

## File Changes Summary

| File | Change | Status |
|------|--------|--------|
| `Client/src/components/AddTeamsModal.jsx` | NEW - Dual-mode team input component | ✅ Created |
| `Client/src/components/AddTeamsModal.css` | NEW - Comprehensive styling | ✅ Created |
| `Client/src/components/HomeContent.jsx` | UPDATED - Added modal state & handlers | ✅ Complete |
| `Client/src/components/TabContent.css` | UPDATED - Added `.teams-btn` styling | ✅ Complete |
| `database-setup.sql` | UPDATED - Added tournament_teams table | ✅ Updated |

## Testing Checklist

- [ ] Database table created successfully
- [ ] Tournament card displays "➕ Teams" button
- [ ] Click button opens AddTeamsModal
- [ ] Manual mode: Can add teams individually
- [ ] Manual mode: Can remove teams before submit
- [ ] AI mode: Pasting text extracts team names
- [ ] AI mode: Can remove extracted teams
- [ ] Submit saves teams to database
- [ ] Success alert appears
- [ ] Modal closes after submit

## Next Steps

1. **Run Database Setup**
   - Execute the tournament_teams table creation SQL in Supabase

2. **Test the Feature**
   - Create a tournament
   - Click "Add Teams" on the tournament card
   - Try both manual and AI modes
   - Check Supabase dashboard to verify teams were saved

3. **Future Enhancements**
   - Add "View/Edit Teams" functionality
   - Implement advanced AI extraction
   - Add team member management
   - Create team performance tracking

## Database Schema

```sql
tournament_teams {
  id: UUID (PK)
  tournament_id: UUID (FK → tournaments.id)
  team_name: VARCHAR(255) [NOT NULL]
  members: TEXT[] [default: {}]
  total_points: JSONB [default: {...}]
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

RLS Policies ensure users can only:
- Create teams for their own tournaments
- Read/update/delete teams from their tournaments
- Cascading delete: Deleting tournament deletes all its teams

## Troubleshooting

### Teams not saving
- Check Supabase RLS policies are enabled
- Verify tournament_id matches an existing tournament
- Check browser console for error messages

### Modal not opening
- Verify AddTeamsModal.jsx is imported in HomeContent.jsx
- Check that isTeamsModalOpen state is being set correctly
- Look for console errors

### AI extraction not working
- Check the text format - should be pasted tournament details
- Review the filtering logic in AddTeamsModal.jsx
- Consider improving regex patterns for your specific text format

## Contact & Support
For issues or improvements, check:
- Browser console for error logs
- Supabase dashboard for table verification
- Component props and state management
