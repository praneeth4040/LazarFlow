import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xsxwzwcfaflzynsyryzq.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzeHd6d2NmYWZsenluc3lyeXpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzEwNDIzNywiZXhwIjoyMDc4NjgwMjM3fQ.p0eJ6eX1-Z7p3LkF9rQp-Q5zLmN8wV2xA4bC6dE9fG0'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Middleware
app.use(cors())
app.use(express.json())

// Helper function to verify JWT token
async function verifyToken(token) {
  try {
    console.log('🔍 Verifying token...')
    // Use the anon key client to verify the token
    const anonClient = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzeHd6d2NmYWZsenluc3lyeXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMDQyMzcsImV4cCI6MjA3ODY4MDIzN30.gVrqiCAlqHNH9MnQj59qkW1afaEehwCEiSN7vSjrL3U')
    
    const { data: { user }, error } = await anonClient.auth.getUser(token)
    if (error) {
      console.log('❌ Token verification failed:', error.message)
      throw error
    }
    console.log('✅ Token verified for user:', user.id)
    return user
  } catch (err) {
    console.log('❌ Token error:', err.message)
    return null
  }
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' })
})

// Create tournament
app.post('/api/tournaments', async (req, res) => {
  try {
    console.log('📝 Creating tournament...')
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      console.log('❌ No token provided')
      return res.status(401).json({ error: 'No token provided' })
    }

    const user = await verifyToken(token)
    if (!user) {
      console.log('❌ Invalid token')
      return res.status(401).json({ error: 'Invalid token' })
    }

    console.log('✅ Token verified for user:', user.id)

    const { name, game, pointsSystem, killPoints } = req.body
    console.log('📤 Request body:', { name, game, killPoints })

    if (!name || !game) {
      console.log('❌ Missing name or game')
      return res.status(400).json({ error: 'Name and game are required' })
    }

    const { data, error } = await supabase
      .from('tournaments')
      .insert([
        {
          name,
          game,
          points_system: pointsSystem,
          kill_points: killPoints,
          user_id: user.id,
          created_at: new Date().toISOString(),
          status: 'active',
        },
      ])
      .select()

    if (error) {
      console.log('❌ Database error:', error)
      throw error
    }

    console.log('✅ Tournament created:', data[0].id)
    res.status(201).json({ success: true, data: data[0] })
  } catch (err) {
    console.error('❌ Create tournament error:', err.message)
    res.status(500).json({ error: err.message || 'Failed to create tournament' })
  }
})

// Get all tournaments for user
app.get('/api/tournaments', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const user = await verifyToken(token)
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    res.json({ success: true, data })
  } catch (err) {
    console.error('Get tournaments error:', err)
    res.status(500).json({ error: 'Failed to fetch tournaments' })
  }
})

// Get single tournament
app.get('/api/tournaments/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const user = await verifyToken(token)
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    const { id } = req.params

    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) throw error

    res.json({ success: true, data })
  } catch (err) {
    console.error('Get tournament error:', err)
    res.status(500).json({ error: 'Failed to fetch tournament' })
  }
})

// AI: Extract teams from text (Demo endpoint)
app.post('/api/ai/extract-teams', async (req, res) => {
  try {
    console.log('🤖 AI extraction request received')
    
    const { text, language = 'en' } = req.body

    if (!text || text.trim().length === 0) {
      console.log('❌ No text provided')
      return res.status(400).json({ error: 'Text is required' })
    }

    console.log('📝 Text length:', text.length)
    
    // Demo extraction logic
    const lines = text.split('\n')
    const extractedTeams = []

    for (const line of lines) {
      const trimmed = line.trim()
      
      // Skip empty lines, links, dates, times, and special patterns
      if (
        !trimmed ||
        trimmed.startsWith('http') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('`') ||
        trimmed.match(/^\d{1,2}[:\/]\d{1,2}/) || // Skip times and dates
        trimmed.startsWith('Prize') ||
        trimmed.startsWith('Date') ||
        trimmed.startsWith('Time') ||
        trimmed.startsWith('Schedule') ||
        trimmed.startsWith('Participating') ||
        trimmed.includes('Back To Back') ||
        trimmed.includes('Qualify') ||
        trimmed.includes('Presented')
      ) {
        continue
      }

      // Add valid team names (3-100 chars, no numbers at start)
      if (trimmed.length > 2 && trimmed.length < 100 && !trimmed.match(/^\d/)) {
        extractedTeams.push(trimmed)
      }
    }

    console.log(`✅ Extracted ${extractedTeams.length} teams from text`)

    if (extractedTeams.length === 0) {
      console.log('⚠️ No teams extracted, returning empty array')
      return res.json({ teams: [], message: 'No teams found in text' })
    }

    console.log('📤 Sending response:', extractedTeams)
    res.json({ 
      success: true,
      teams: extractedTeams,
      count: extractedTeams.length,
      message: `Extracted ${extractedTeams.length} teams`
    })
  } catch (err) {
    console.error('❌ AI extraction error:', err.message)
    res.status(500).json({ error: 'Failed to extract teams', message: err.message })
  }
})

// Update tournament
app.put('/api/tournaments/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const user = await verifyToken(token)
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    const { id } = req.params
    const { name, game, pointsSystem, killPoints, status } = req.body

    const { data, error } = await supabase
      .from('tournaments')
      .update({
        ...(name && { name }),
        ...(game && { game }),
        ...(pointsSystem && { points_system: pointsSystem }),
        ...(killPoints !== undefined && { kill_points: killPoints }),
        ...(status && { status }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()

    if (error) throw error

    res.json({ success: true, data: data[0] })
  } catch (err) {
    console.error('Update tournament error:', err)
    res.status(500).json({ error: 'Failed to update tournament' })
  }
})

// Delete tournament
app.delete('/api/tournaments/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const user = await verifyToken(token)
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    const { id } = req.params

    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    res.json({ success: true, message: 'Tournament deleted' })
  } catch (err) {
    console.error('Delete tournament error:', err)
    res.status(500).json({ error: 'Failed to delete tournament' })
  }
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong' })
})

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server is running on http://localhost:${PORT}`)
})
