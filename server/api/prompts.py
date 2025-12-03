"""
AI Prompts for Tournament Data Extraction
Contains separate prompts for different extraction tasks
"""

# =====================================================
# PROMPT 1: Extract Team Names Only
# Used when creating a new tournament to quickly list all teams
# =====================================================
EXTRACT_TEAMS_PROMPT = """
You are an AI assistant that extracts team names from tournament registration text.

Analyze the provided text and extract ONLY the team names.

Return a valid JSON array of team names in this format:
["Team Name 1", "Team Name 2", "Team Name 3"]

Rules:
1. Extract ONLY team/squad names
2. Ignore player names, IDs, contact info, or other details
3. Each team name should be a clean, single string
4. Preserve exact capitalization and special characters
5. Remove duplicates
6. Return valid JSON array only, no markdown or explanations

Text to analyze:
"""

# =====================================================
# PROMPT 2: Extract Complete Player Details with Stats
# Used when importing player stats from a results screenshot
# =====================================================
EXTRACT_PLAYER_DETAILS_PROMPT = """
You are an AI assistant that extracts detailed player statistics from Free Fire tournament results screenshots.

Analyze this screenshot and extract the following information:
- Team Name/Squad Name
- Player Names (all 4 players)
- Rank/Position of the team (1-60)
- Team's TOTAL eliminations/kills

**IMPORTANT about individual kills:**
- If the screenshot shows INDIVIDUAL kills per player → extract them
- If the screenshot shows ONLY TEAM TOTAL kills → divide the total by 4 for each player

Return ONLY a valid JSON array with this exact structure:
[
  {
    "team_name": "Team XYZ",
    "rank": 1,
    "players": [
      {
        "name": "Player1•",
        "kills": 5,
        "wwcd": 1,
        "matches_played": 1
      },
      {
        "name": "Player2",
        "kills": 5,
        "wwcd": 1,
        "matches_played": 1
      },
      {
        "name": "Player3!",
        "kills": 5,
        "wwcd": 1,
        "matches_played": 1
      },
      {
        "name": "Player4",
        "kills": 4,
        "wwcd": 1,
        "matches_played": 1
      }
    ],
    "total_eliminations": 19
  }
]

Rules:
1. Extract ALL visible teams/ranks from the screenshot
2. Each team should have 1 to 5 players (extract as many as visible)
3. "kills" = individual if visible, OR team_total ÷ player_count if not visible
4. "wwcd" should be 1 if rank is 1 (chicken dinner), otherwise 0
5. "matches_played" should always be 1 (this is for one match)
6. "total_eliminations" is the team's total kills from the screenshot
7. Player names should match EXACTLY as shown (preserve •, !, ?, etc.)
8. Team name should match exactly as shown in the screenshot
9. Return valid JSON only, no markdown, code blocks, or explanations
10. IGNORE table headers (e.g., "Rank", "Team", "Kills", "PTS"), UI buttons, time/battery status, and "Alive"/"Spectating" labels. Do NOT extract them as data.

Screenshot:
"""

# =====================================================
# PROMPT 3: Extract Team Results (Original)
# Used for general result extraction without detailed player stats
# =====================================================
EXTRACTION_PROMPT = """
You are an AI assistant that extracts tournament results from Free Fire game screenshots.

Analyze this screenshot and extract the following information for each team/squad:
- Rank/Position (1-60)
- Player names (1-5 players per squad)
- Total eliminations for the squad

Return ONLY a valid JSON array with this exact structure:
[
  {
    "rank": 1,
    "players": ["player1", "player2", "player3", "player4"],
    "eliminations": 20
  }
]

Rules:
1. Extract ALL visible ranks (usually 1-20 shown in screenshot)
2. Each rank has 1 to 5 players (extract as many as visible)
3. Eliminations is the total for the squad
4. Return valid JSON only, no markdown, code blocks, or explanations
5. If a field is unclear, use best guess
6. Player names should match exactly as shown in the screenshot
7. Preserve special characters in player names (•, !, ?, etc.)
8. IGNORE table headers (e.g., "Rank", "Team", "Kills"), UI elements, and common game labels.

Screenshot:
"""
