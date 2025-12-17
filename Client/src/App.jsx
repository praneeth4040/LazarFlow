import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Dashboard from './pages/Dashboard'
import LiveTournament from './pages/LiveTournament'
import EditLayout from './pages/EditLayout'
import TermsAndConditions from './pages/TermsAndConditions'
import PrivacyPolicy from './pages/PrivacyPolicy'
import './App.css'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './context/ToastContext'

function App() {
  return (
    <ToastProvider>
      <ErrorBoundary>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/live/:liveid" element={<LiveTournament />} />
            <Route path="/edit-layout/:layoutId" element={<EditLayout />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
          </Routes>
        </Router>
      </ErrorBoundary>
    </ToastProvider>
  )
}

export default App
