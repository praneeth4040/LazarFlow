import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// Sample data - Replace with database calls
const teamsData = [
  { id: 1, name: 'Phoenix', points: 2400, wins: 24, losses: 6 },
  { id: 2, name: 'Sentinels', points: 2290, wins: 22, losses: 8 },
  { id: 3, name: 'FaZe Clan', points: 2200, wins: 21, losses: 9 },
  { id: 4, name: 'Loud', points: 2100, wins: 20, losses: 10 },
  { id: 5, name: 'Evil Geniuses', points: 2000, wins: 19, losses: 11 },
]

// Routes

// Get all teams
app.get('/api/teams', (req, res) => {
  try {
    // Sort teams by points in descending order
    const sortedTeams = [...teamsData].sort((a, b) => b.points - a.points)
    res.json(sortedTeams)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teams' })
  }
})

// Get team by ID
app.get('/api/teams/:id', (req, res) => {
  try {
    const team = teamsData.find(t => t.id === parseInt(req.params.id))
    if (!team) {
      return res.status(404).json({ error: 'Team not found' })
    }
    res.json(team)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team' })
  }
})

// Create a new team
app.post('/api/teams', (req, res) => {
  try {
    const { name, points, wins, losses } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Team name is required' })
    }

    const newTeam = {
      id: Math.max(...teamsData.map(t => t.id), 0) + 1,
      name,
      points: points || 0,
      wins: wins || 0,
      losses: losses || 0,
    }

    teamsData.push(newTeam)
    res.status(201).json(newTeam)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create team' })
  }
})

// Update a team
app.put('/api/teams/:id', (req, res) => {
  try {
    const team = teamsData.find(t => t.id === parseInt(req.params.id))
    if (!team) {
      return res.status(404).json({ error: 'Team not found' })
    }

    const { name, points, wins, losses } = req.body
    if (name) team.name = name
    if (points !== undefined) team.points = points
    if (wins !== undefined) team.wins = wins
    if (losses !== undefined) team.losses = losses

    res.json(team)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update team' })
  }
})

// Delete a team
app.delete('/api/teams/:id', (req, res) => {
  try {
    const index = teamsData.findIndex(t => t.id === parseInt(req.params.id))
    if (index === -1) {
      return res.status(404).json({ error: 'Team not found' })
    }

    const deletedTeam = teamsData.splice(index, 1)
    res.json(deletedTeam[0])
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete team' })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong' })
})

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server is running on http://localhost:${PORT}`)
  console.log(`✓ API endpoints available at http://localhost:${PORT}/api`)
})
