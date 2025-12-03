import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import Landing from './pages/Landing'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Dashboard from './pages/Dashboard'
import LiveTournament from './pages/LiveTournament'
import './App.css'

function App() {
  return (
    <>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/live/:liveid" element={<LiveTournament />} />
        </Routes>
      </Router>
      <Analytics />
    </>
  )
}

export default App
