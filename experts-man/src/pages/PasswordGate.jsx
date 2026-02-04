import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getExpertById } from '../utils/storage'

function PasswordGate() {
  const { expertId } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const expert = getExpertById(expertId)

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!expert) {
      setError('유효하지 않은 접근입니다.')
      return
    }

    if (password === expert.password) {
      navigate(`/form/${expertId}/edit`)
    } else {
      setError('비밀번호가 일치하지 않습니다.')
    }
  }

  if (!expert) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">접근 오류</h2>
          <p className="text-gray-600">유효하지 않은 링크입니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">전문가 정보 입력</h1>
          <p className="text-gray-600">
            <span className="font-semibold text-blue-600">{expert.name}</span>님, 환영합니다.
          </p>
          <p className="text-sm text-gray-500 mt-1">
            접근하려면 비밀번호를 입력해주세요.
          </p>
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest"
              placeholder="6자리 숫자"
              maxLength={6}
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

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>비밀번호를 잊으셨다면 관리자에게 문의해주세요.</p>
        </div>
      </div>
    </div>
  )
}

export default PasswordGate
