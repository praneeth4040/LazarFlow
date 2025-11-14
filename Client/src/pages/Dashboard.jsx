import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Sidebar from '../components/Sidebar'
import HomeContent from '../components/HomeContent'
import LazarEonContent from '../components/LazarEonContent'
import LazarHubContent from '../components/LazarHubContent'
import ProfileContent from '../components/ProfileContent'
import CreateTournamentModal from '../components/CreateTournamentModal'
import './Dashboard.css'

function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('home')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newTournament, setNewTournament] = useState(null)
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

  const handleCreateClick = () => {
    setIsCreateModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsCreateModalOpen(false)
  }

  const handleCreateTournament = async (tournamentData) => {
    try {
      console.log('📝 Creating tournament directly in Supabase...')
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('You must be logged in to create a tournament')
        return
      }

      const { data, error } = await supabase
        .from('tournaments')
        .insert([
          {
            name: tournamentData.name,
            game: tournamentData.game,
            points_system: tournamentData.pointsSystem,
            kill_points: tournamentData.killPoints,
            user_id: user.id,
            status: 'active',
          },
        ])
        .select()

      if (error) {
        console.error('❌ Database error:', error)
        throw error
      }

      console.log('✅ Tournament created:', data)
      setIsCreateModalOpen(false)
      
      // Store the new tournament and navigate to home tab
      setNewTournament(data[0])
      setActiveTab('home')
    } catch (error) {
      console.error('❌ Failed to create tournament:', error)
      alert(`Failed to create tournament: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <p>Loading...</p>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeContent newTournament={newTournament} onTournamentProcessed={() => setNewTournament(null)} />
      case 'lazareon':
        return <LazarEonContent />
      case 'hub':
        return <LazarHubContent />
      case 'profile':
        return <ProfileContent user={user} onLogout={handleLogout} />
      default:
        return <HomeContent />
    }
  }

  return (
    <div className="dashboard-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onCreateClick={handleCreateClick} />
      <main className="dashboard-main">
        {renderContent()}
      </main>
      <CreateTournamentModal 
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleCreateTournament}
      />
    </div>
  )
}

export default Dashboard
