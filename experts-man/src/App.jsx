import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AdminPage from './pages/AdminPage'
import ExpertFormPage from './pages/ExpertFormPage'
import PasswordGate from './pages/PasswordGate'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AdminPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/form/:expertId" element={<PasswordGate />} />
        <Route path="/form/:expertId/edit" element={<ExpertFormPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
