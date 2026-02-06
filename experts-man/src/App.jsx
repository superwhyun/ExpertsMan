import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import AdminPage from './pages/AdminPage'
import ExpertFormPage from './pages/ExpertFormPage'
import MemberPollPage from './pages/MemberPollPage'
import PasswordGate from './pages/PasswordGate'
import GodGodPage from './pages/GodGodPage'
import WorkspaceGate from './pages/WorkspaceGate'
import LandingPage from './pages/LandingPage'

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing page - 홍보용 첫 페이지 */}
        <Route path="/" element={<LandingPage />} />

        {/* GodGod super admin - 숨겨진 관리자 페이지 */}
        <Route path="/godgod" element={<GodGodPage />} />

        {/* Workspace routes */}
        <Route path="/:workspace" element={<WorkspaceGate />} />
        <Route path="/:workspace/admin" element={<AdminPage />} />
        <Route path="/:workspace/poll/:expertId" element={<MemberPollPage />} />
        <Route path="/:workspace/form/:expertId" element={<PasswordGate />} />
        <Route path="/:workspace/form/:expertId/edit" element={<ExpertFormPage />} />
      </Routes>
    </Router>
  )
}

export default App
