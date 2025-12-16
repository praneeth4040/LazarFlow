import React, { useState } from 'react'
import Sidebar from '../components/Sidebar'
import HomeContent from '../components/HomeContent'
import LazarEonContent from '../components/LazarEonContent'
import ProfileContent from '../components/ProfileContent'
import HistoryContent from '../components/HistoryContent'
import LayoutContent from '../components/LayoutContent'
import CreateTournamentModal from '../components/modals/CreateTournamentModal'
import './Dashboard.css'
import { Menu } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../hooks/useAuth'
import { createTournament } from '../lib/dataService'


function Dashboard() {
  const { user, loading, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('home')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [newTournament, setNewTournament] = useState(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { addToast } = useToast()

  const handleCreateClick = () => {
    setIsCreateModalOpen(true)
  }

  const handleCreateTournament = async (tournamentData) => {
    if (!user) return

    try {
      const createdTournament = await createTournament(tournamentData, user.id)

      if (createdTournament) {
        setNewTournament(createdTournament)
        setActiveTab('home')
        setIsCreateModalOpen(false)
      }
    } catch (error) {
      console.error('Error creating tournament:', error)
      try {
        addToast('error', 'Error creating tournament: ' + (error.message || 'Failed'))
      } catch (e) {
        console.error('Toast failed:', e)
      }
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
        return <ProfileContent user={user} onLogout={logout} />
      case 'history':
        return <HistoryContent />
      case 'layout':
        return <LayoutContent />
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
        user={user}
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
