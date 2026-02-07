import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787/api'

function WorkspaceGate() {
  const { workspace } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [workspaceInfo, setWorkspaceInfo] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    checkWorkspace()
  }, [workspace])

  const checkWorkspace = async () => {
    // First check if already authenticated
    const token = localStorage.getItem(`workspace_token_${workspace}`)
    if (token) {
      const isValid = await verifyToken(token)
      if (isValid) {
        navigate(`/${workspace}/admin`, { replace: true })
        return
      }
    }

    // Load workspace info
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspace}`)
      if (res.ok) {
        const data = await res.json()
        setWorkspaceInfo(data)
      } else {
        setNotFound(true)
      }
    } catch {
      setNotFound(true)
    }
    setLoading(false)
  }

  const verifyToken = async (token) => {
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspace}/verify`, {
        headers: { 'X-Workspace-Token': token }
      })
      return res.ok
    } catch {
      return false
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspace}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const data = await res.json()

      if (data.success) {
        localStorage.setItem(`workspace_token_${workspace}`, data.token)
        navigate(`/${workspace}/admin`, { replace: true })
      } else {
        setError(data.error || '비밀번호가 일치하지 않습니다.')
      }
    } catch {
      setError('서버 연결 실패')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">404</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">워크스페이스를 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-4">
            <code className="bg-gray-100 px-2 py-1 rounded">/{workspace}</code> 는 존재하지 않습니다.
          </p>
          <button
            onClick={() => navigate('/godgod')}
            className="text-blue-600 hover:underline"
          >
            관리자 페이지로 이동
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{workspaceInfo?.name}</h1>
          <p className="text-gray-600 text-sm">워크스페이스에 접속하려면 비밀번호를 입력하세요</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="워크스페이스 비밀번호"
              autoFocus
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            접속하기
          </button>
        </form>
      </div>
    </div>
  )
}

export default WorkspaceGate
