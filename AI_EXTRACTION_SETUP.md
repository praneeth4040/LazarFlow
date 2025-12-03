# AI Extraction Setup - Player Stats

## ✅ What's Set Up

### 1. AI Prompts (`server/api/prompts.py`)
- **EXTRACT_TEAMS_PROMPT** - Extracts only team names
- **EXTRACT_PLAYER_DETAILS_PROMPT** - Extracts individual player stats
  - Player name
  - Individual kills per player
  - Matches played (always 1 per extraction)
  - WWCD (1 if rank 1, else 0)

### 2. Backend Extraction (`server/api/app.py`)
- **Endpoint**: `POST /api/extract-results`
- **Now using**: `detailed=True` mode
- **Returns**: Full player objects with stats

### 3. Expected AI Response Format
```json
[
  {
    "team_name": "Team XYZ",
    "rank": 1,
    "players": [
      {"name": "Player1", "kills": 5, "wwcd": 1, "matches_played": 1},
      {"name": "Player2", "kills": 3, "wwcd": 1, "matches_played": 1},
      {"name": "Player3", "kills": 7, "wwcd": 1, "matches_played": 1},
      {"name": "Player4", "kills": 4, "wwcd": 1, "matches_played": 1}
    ],
    "total_eliminations": 19
  }
]
```

### 4. Database Schema
- `tournament_teams.members` is **JSONB**
- Stores: `name`, `kills`, `matches_played`, `wwcd`

## 🔄 How It Works Now

1. User uploads screenshot(s) to Calculate Results page
2. Frontend sends to `/api/extract-results`
3. Backend uses `EXTRACT_PLAYER_DETAILS_PROMPT` with Gemini Vision
4. AI extracts:
   - Team name
   - All 4 player names
   - **Individual kills per player** ✅
   - Rank
5. Backend returns data in correct format
6. Frontend saves to Supabase
7. Live page displays player stats when team is clicked

## ✅ Ready to Test!

When you upload a real screenshot:
- AI will extract individual player kills
- Data will be stored correctly in the database
- Live page will show each player's stats

No more manual data entry needed! 🎯
