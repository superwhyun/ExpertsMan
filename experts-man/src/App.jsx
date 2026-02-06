import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AdminPage from './pages/AdminPage'
import ExpertFormPage from './pages/ExpertFormPage'
import MemberPollPage from './pages/MemberPollPage'
import PasswordGate from './pages/PasswordGate'
import GodGodPage from './pages/GodGodPage'
import WorkspaceGate from './pages/WorkspaceGate'

function App() {
  return (
    <Router>
      <Routes>
        {/* GodGod super admin */}
        <Route path="/godgod" element={<GodGodPage />} />

        {/* Workspace routes */}
        <Route path="/:workspace" element={<WorkspaceGate />} />
        <Route path="/:workspace/admin" element={<AdminPage />} />
        <Route path="/:workspace/poll/:expertId" element={<MemberPollPage />} />
        <Route path="/:workspace/form/:expertId" element={<PasswordGate />} />
        <Route path="/:workspace/form/:expertId/edit" element={<ExpertFormPage />} />

        {/* Default redirect to godgod */}
        <Route path="/" element={<Navigate to="/godgod" replace />} />
        <Route path="*" element={<Navigate to="/godgod" replace />} />
      </Routes>
    </Router>
  )
}

export default App
