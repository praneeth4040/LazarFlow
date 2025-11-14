import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './Dashboard.css'

function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) throw error
        
        if (!session) {
          navigate('/login')
          return
        }
        
        setUser(session.user)
      } catch (err) {
        console.error('Session check failed:', err)
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user)
      } else {
        navigate('/login')
      }
    })

    return () => subscription?.unsubscribe()
  }, [navigate])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      navigate('/login')
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-left">
          <h1>Dashboard</h1>
        </div>
        <div className="nav-right">
          <span className="user-email">{user?.email}</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-card">
          <h2>Welcome to Esports Points Table Maker</h2>
          <p>You are logged in as <strong>{user?.email}</strong></p>
          <p>This is your dashboard. More features coming soon!</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
