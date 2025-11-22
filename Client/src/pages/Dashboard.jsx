import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Sidebar from '../components/Sidebar'
import HomeContent from '../components/HomeContent'
import LazarEonContent from '../components/LazarEonContent'
import ProfileContent from '../components/ProfileContent'
import CreateTournamentModal from '../components/modals/CreateTournamentModal'
import './Dashboard.css'
import { Menu } from 'lucide-react'

function Dashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('home')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [newTournament, setNewTournament] = useState(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  useEffect(() => {
    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        setUser(session.user)
      } else if (event === 'SIGNED_OUT') {
        navigate('/login')
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [navigate])

  async function checkUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
      } else {
        setUser(user)
      }
    } catch (error) {
      console.error('Error checking user:', error)
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const handleCreateClick = () => {
    setIsCreateModalOpen(true)
  }

  const handleCreateTournament = async (tournamentData) => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('tournaments')
        .insert([
          {
            name: tournamentData.name,
            user_id: user.id,
            status: 'active', // Set to active immediately for now
            game: tournamentData.game,
            points_system: tournamentData.pointsSystem,
            kill_points: tournamentData.killPoints
          }
        ])
        .select()

      if (error) throw error

      if (data && data[0]) {
        setNewTournament(data[0])
        setActiveTab('home')
        setIsCreateModalOpen(false)
      }
    } catch (error) {
      console.error('Error creating tournament:', error)
      alert('Error creating tournament: ' + error.message)
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
      case 'profile':
        return <ProfileContent user={user} onLogout={handleLogout} />
      default:
        return <HomeContent />
    }
  }

  return (
    <div className="dashboard-container">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onCreateClick={handleCreateClick}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="dashboard-main">
        <div className="mobile-header">
          <button className="menu-btn" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <h2>LazarFlow</h2>
        </div>
        {renderContent()}
      </main>
      <CreateTournamentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTournament}
      />
    </div>
  )
}

export default Dashboard
