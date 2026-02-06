import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = 'http://localhost:3001/api'

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
  const [newWorkspace, setNewWorkspace] = useState({ name: '', slug: '', password: '' })

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
        setNewWorkspace({ name: '', slug: '', password: '' })
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">GodGod Dashboard</h1>
            <p className="text-gray-400 text-sm">워크스페이스 관리</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            로그아웃
          </button>
        </div>

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
      </div>

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
              <div className="mb-6">
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
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewWorkspace({ name: '', slug: '', password: '' })
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
    </div>
  )
}

export default GodGodPage
