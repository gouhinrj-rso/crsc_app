import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'

// Pages
import Landing from '@/pages/Landing'
import Onboarding from '@/pages/Onboarding'
import Dashboard from '@/pages/Dashboard'
import Chat from '@/pages/Chat'
import Review from '@/pages/Review'
import Download from '@/pages/Download'
import StatusTracking from '@/pages/StatusTracking'
import Settings from '@/pages/Settings'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/review" element={<Review />} />
      <Route path="/download" element={<Download />} />
      <Route path="/status" element={<StatusTracking />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </div>
    </Router>
  )
}

export default App
