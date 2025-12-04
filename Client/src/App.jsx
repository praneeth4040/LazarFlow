import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Dashboard from './pages/Dashboard'
import LiveTournament from './pages/LiveTournament'
import './App.css'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './context/ToastContext'

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/live/:liveid" element={<LiveTournament />} />
      </Routes>
    </Router>
  )
}

export default App
