import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787/api'

function GodGodPage() {
  const navigate = useNavigate()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // Dashboard state
  const [workspaces, setWorkspaces] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingWorkspace, setEditingWorkspace] = useState(null)
  const [newWorkspace, setNewWorkspace] = useState({ name: '', slug: '', password: '', organization: '', sender_name: '' })
  const [activeTab, setActiveTab] = useState('workspaces')

  // Workspace requests state
  const [workspaceRequests, setWorkspaceRequests] = useState([])
  const [showRequestDetailModal, setShowRequestDetailModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('godgod_token')
    if (token) {
      verifyToken(token)
    } else {
      setLoading(false)
    }
  }, [])

  const verifyToken = async (token) => {
    try {
      const res = await fetch(`${API_BASE}/godgod/verify`, {
        headers: { 'X-GodGod-Token': token }
      })
      if (res.ok) {
        setIsLoggedIn(true)
        loadWorkspaces(token)
        loadWorkspaceRequests()
      } else {
        localStorage.removeItem('godgod_token')
      }
    } catch {
      localStorage.removeItem('godgod_token')
    }
    setLoading(false)
  }

  const loadWorkspaces = async (token) => {
    try {
      const res = await fetch(`${API_BASE}/godgod/workspaces`, {
        headers: { 'X-GodGod-Token': token || localStorage.getItem('godgod_token') }
      })
      if (res.ok) {
        const data = await res.json()
        setWorkspaces(data)
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err)
    }
  }

  const loadWorkspaceRequests = async () => {
    try {
      const token = localStorage.getItem('godgod_token')
      const res = await fetch(`${API_BASE}/godgod/workspace-requests`, {
        headers: { 'X-GodGod-Token': token }
      })
      if (res.ok) {
        const data = await res.json()
        setWorkspaceRequests(data)
      }
    } catch (err) {
      console.error('Failed to load workspace requests:', err)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const res = await fetch(`${API_BASE}/godgod/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const data = await res.json()

      if (data.success) {
        localStorage.setItem('godgod_token', data.token)
        setIsLoggedIn(true)
        loadWorkspaces(data.token)
        loadWorkspaceRequests()
      } else {
        setError(data.error || '로그인 실패')
      }
    } catch {
      setError('서버 연결 실패')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('godgod_token')
    setIsLoggedIn(false)
    setWorkspaces([])
    setPassword('')
  }

  const handleCreateWorkspace = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem('godgod_token')

    try {
      const res = await fetch(`${API_BASE}/godgod/workspaces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GodGod-Token': token
        },
        body: JSON.stringify(newWorkspace)
      })

      const data = await res.json()

      if (data.success) {
        setShowCreateModal(false)
        setNewWorkspace({ name: '', slug: '', password: '', organization: '', sender_name: '' })
        loadWorkspaces()
      } else {
        alert(data.error || '생성 실패')
      }
    } catch {
      alert('서버 연결 실패')
    }
  }

  const handleEditWorkspace = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem('godgod_token')

    try {
      const res = await fetch(`${API_BASE}/godgod/workspaces/${editingWorkspace.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-GodGod-Token': token
        },
        body: JSON.stringify({
          name: editingWorkspace.name,
          password: editingWorkspace.newPassword || undefined
        })
      })

      const data = await res.json()

      if (data.success) {
        setShowEditModal(false)
        setEditingWorkspace(null)
        loadWorkspaces()
      } else {
        alert(data.error || '수정 실패')
      }
    } catch {
      alert('서버 연결 실패')
    }
  }

  const handleDeleteWorkspace = async (ws) => {
    if (!confirm(`정말 "${ws.name}" 워크스페이스를 삭제하시겠습니까?\n모든 전문가 데이터가 삭제됩니다.`)) {
      return
    }

    const token = localStorage.getItem('godgod_token')

    try {
      const res = await fetch(`${API_BASE}/godgod/workspaces/${ws.id}`, {
        method: 'DELETE',
        headers: { 'X-GodGod-Token': token }
      })

      if (res.ok) {
        loadWorkspaces()
      } else {
        const data = await res.json()
        alert(data.error || '삭제 실패')
      }
    } catch {
      alert('서버 연결 실패')
    }
  }

  const openEditModal = (ws) => {
    setEditingWorkspace({ ...ws, newPassword: '' })
    setShowEditModal(true)
  }

  // Workspace request handlers
  const handleApproveRequest = async (request) => {
    if (!confirm(`"${request.name}" 워크스페이스 신청을 승인하시겠습니까?`)) {
      return
    }

    const token = localStorage.getItem('godgod_token')
    try {
      const res = await fetch(`${API_BASE}/godgod/workspace-requests/${request.id}/approve`, {
        method: 'POST',
        headers: { 'X-GodGod-Token': token }
      })

      if (res.ok) {
        loadWorkspaceRequests()
        loadWorkspaces()
        setShowRequestDetailModal(false)
        setSelectedRequest(null)
      } else {
        const data = await res.json()
        alert(data.error || '승인 실패')
      }
    } catch {
      alert('서버 연결 실패')
    }
  }

  const handleRejectRequest = async (request) => {
    if (!confirm(`"${request.name}" 워크스페이스 신청을 거절하시겠습니까?`)) {
      return
    }

    const token = localStorage.getItem('godgod_token')
    try {
      const res = await fetch(`${API_BASE}/godgod/workspace-requests/${request.id}/reject`, {
        method: 'POST',
        headers: { 'X-GodGod-Token': token }
      })

      if (res.ok) {
        loadWorkspaceRequests()
        setShowRequestDetailModal(false)
        setSelectedRequest(null)
      } else {
        const data = await res.json()
        alert(data.error || '거절 실패')
      }
    } catch {
      alert('서버 연결 실패')
    }
  }

  const handleDeleteRequest = async (request) => {
    if (!confirm(`"${request.name}" 신청 내역을 삭제하시겠습니까?`)) {
      return
    }

    const token = localStorage.getItem('godgod_token')
    try {
      const res = await fetch(`${API_BASE}/godgod/workspace-requests/${request.id}`, {
        method: 'DELETE',
        headers: { 'X-GodGod-Token': token }
      })

      if (res.ok) {
        loadWorkspaceRequests()
        setShowRequestDetailModal(false)
        setSelectedRequest(null)
      } else {
        alert('삭제 실패')
      }
    } catch {
      alert('서버 연결 실패')
    }
  }

  const openRequestDetail = (request) => {
    setSelectedRequest(request)
    setShowRequestDetailModal(true)
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">대기중</span>
      case 'approved':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">승인됨</span>
      case 'rejected':
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">거절됨</span>
      default:
        return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs">{status}</span>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">로딩 중...</div>
      </div>
    )
  }

  // Login form
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full border border-gray-700">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">GodGod</h1>
            <p className="text-gray-400 text-sm">슈퍼 관리자 접속</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                마스터 비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                placeholder="비밀번호 입력"
                autoFocus
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              접속
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">GodGod Dashboard</h1>
            <p className="text-gray-400 text-sm">슈퍼 관리자 콘솔</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            로그아웃
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('workspaces')}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === 'workspaces'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            워크스페이스 ({workspaces.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'requests'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            신청 관리
            {workspaceRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {workspaceRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'workspaces' && (
          <>
            {/* Actions */}
            <div className="mb-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                + 새 워크스페이스
              </button>
            </div>

            {/* Workspace List */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">이름</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">슬러그</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">전문가 수</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {workspaces.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        워크스페이스가 없습니다
                      </td>
                    </tr>
                  ) : (
                    workspaces.map((ws) => (
                      <tr key={ws.id} className="hover:bg-gray-750">
                        <td className="px-4 py-3 text-white">{ws.name}</td>
                        <td className="px-4 py-3">
                          <code className="text-purple-400 bg-gray-700 px-2 py-1 rounded text-sm">
                            /{ws.slug}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-300">{ws.expertCount}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => navigate(`/${ws.slug}`)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 mr-2"
                          >
                            접속
                          </button>
                          <button
                            onClick={() => openEditModal(ws)}
                            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-500 mr-2"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDeleteWorkspace(ws)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'requests' && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-gray-400 text-sm">
                워크스페이스 생성 신청 목록입니다. 대기중인 신청을 검토하여 승인 또는 거절하세요.
              </p>
              <button
                onClick={loadWorkspaceRequests}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm"
              >
                새로고침
              </button>
            </div>

            {/* Requests List */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">상태</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">워크스페이스</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">담당자</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">조직</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">신청일</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {workspaceRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        신청 내역이 없습니다
                      </td>
                    </tr>
                  ) : (
                    workspaceRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-750">
                        <td className="px-4 py-3">{getStatusBadge(req.status)}</td>
                        <td className="px-4 py-3">
                          <div className="text-white font-medium">{req.name}</div>
                          <code className="text-purple-400 text-sm">/{req.slug}</code>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-300">{req.contact_name}</div>
                          <div className="text-gray-500 text-sm">{req.contact_email}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-300">{req.organization || '-'}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">
                          {new Date(req.created_at).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => openRequestDetail(req)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            상세보기
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4">새 워크스페이스</h2>
              <form onSubmit={handleCreateWorkspace}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">이름</label>
                  <input
                    type="text"
                    value={newWorkspace.name}
                    onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="예: 개발팀"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">슬러그 (URL)</label>
                  <input
                    type="text"
                    value={newWorkspace.slug}
                    onChange={(e) => setNewWorkspace({ ...newWorkspace, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="예: dev-team"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">영문 소문자, 숫자, 하이픈만 사용</p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">비밀번호</label>
                  <input
                    type="text"
                    value={newWorkspace.password}
                    onChange={(e) => setNewWorkspace({ ...newWorkspace, password: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="워크스페이스 접속 비밀번호"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">소속 조직</label>
                  <input
                    type="text"
                    value={newWorkspace.organization}
                    onChange={(e) => setNewWorkspace({ ...newWorkspace, organization: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="회사/팀/부서명"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">발송명의 (PDF 문서 하단)</label>
                  <input
                    type="text"
                    value={newWorkspace.sender_name}
                    onChange={(e) => setNewWorkspace({ ...newWorkspace, sender_name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="예: 한국전자통신연구원장"
                  />
                  <p className="text-xs text-gray-500 mt-1">미입력 시 소속 조직명 + '장'으로 자동 설정됩니다.</p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setNewWorkspace({ name: '', slug: '', password: '', organization: '', sender_name: '' })
                    }}
                    className="flex-1 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    생성
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingWorkspace && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4">워크스페이스 수정</h2>
              <form onSubmit={handleEditWorkspace}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">이름</label>
                  <input
                    type="text"
                    value={editingWorkspace.name}
                    onChange={(e) => setEditingWorkspace({ ...editingWorkspace, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">슬러그</label>
                  <input
                    type="text"
                    value={editingWorkspace.slug}
                    className="w-full px-4 py-2 bg-gray-600 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">슬러그는 변경할 수 없습니다</p>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">새 비밀번호</label>
                  <input
                    type="text"
                    value={editingWorkspace.newPassword}
                    onChange={(e) => setEditingWorkspace({ ...editingWorkspace, newPassword: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="변경하지 않으려면 비워두세요"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingWorkspace(null)
                    }}
                    className="flex-1 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    저장
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Request Detail Modal */}
        {showRequestDetailModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full border border-gray-700 my-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">신청 상세정보</h2>
                <button
                  onClick={() => {
                    setShowRequestDetailModal(false)
                    setSelectedRequest(null)
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center pb-4 border-b border-gray-700">
                  <span className="text-gray-400">상태</span>
                  {getStatusBadge(selectedRequest.status)}
                </div>

                <div className="pb-4 border-b border-gray-700">
                  <span className="text-gray-400 block mb-1">워크스페이스 이름</span>
                  <span className="text-white text-lg font-medium">{selectedRequest.name}</span>
                </div>

                <div className="pb-4 border-b border-gray-700">
                  <span className="text-gray-400 block mb-1">URL 슬러그</span>
                  <code className="text-purple-400 bg-gray-700 px-3 py-1 rounded">/{selectedRequest.slug}</code>
                </div>

                <div className="pb-4 border-b border-gray-700">
                  <span className="text-gray-400 block mb-1">담당자</span>
                  <div className="text-white">{selectedRequest.contact_name}</div>
                  <div className="text-gray-400 text-sm">{selectedRequest.contact_email}</div>
                  {selectedRequest.contact_phone && (
                    <div className="text-gray-400 text-sm">{selectedRequest.contact_phone}</div>
                  )}
                </div>

                <div className="pb-4 border-b border-gray-700">
                  <span className="text-gray-400 block mb-1">소속 조직</span>
                  <span className="text-white">{selectedRequest.organization || '미입력'}</span>
                </div>

                <div className="pb-4 border-b border-gray-700">
                  <span className="text-gray-400 block mb-1">신청일</span>
                  <span className="text-white">{new Date(selectedRequest.created_at).toLocaleString('ko-KR')}</span>
                </div>

                {selectedRequest.message && (
                  <div className="pb-4 border-b border-gray-700">
                    <span className="text-gray-400 block mb-1">추가 메시지</span>
                    <p className="text-white bg-gray-700 p-3 rounded-lg whitespace-pre-wrap">{selectedRequest.message}</p>
                  </div>
                )}

                {selectedRequest.status !== 'pending' && selectedRequest.processed_at && (
                  <div>
                    <span className="text-gray-400 block mb-1">처리일</span>
                    <span className="text-white">{new Date(selectedRequest.processed_at).toLocaleString('ko-KR')}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRequestDetailModal(false)
                    setSelectedRequest(null)
                  }}
                  className="flex-1 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
                >
                  닫기
                </button>
                {selectedRequest.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleRejectRequest(selectedRequest)}
                      className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      거절
                    </button>
                    <button
                      onClick={() => handleApproveRequest(selectedRequest)}
                      className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      승인
                    </button>
                  </>
                )}
                {selectedRequest.status !== 'pending' && (
                  <button
                    onClick={() => handleDeleteRequest(selectedRequest)}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GodGodPage
