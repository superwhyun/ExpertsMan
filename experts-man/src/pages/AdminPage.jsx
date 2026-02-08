import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getExperts, createExpert, deleteExpert, saveExpert, getExpertById,
  addPollingSlot, deletePollingSlot, confirmSlots, startPolling, resetConfirmation
} from '../utils/storage'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787/api'

function AdminPage() {
  const { workspace } = useParams()
  const navigate = useNavigate()
  const [experts, setExperts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingExpert, setEditingExpert] = useState(null)
  const [showLinkModal, setShowLinkModal] = useState(null)
  const [showPollingModal, setShowPollingModal] = useState(null)
  const [newSlot, setNewSlot] = useState({ date: '', startTime: '09:00', endTime: '11:00' })
  const [selectedConfirmedSlots, setSelectedConfirmedSlots] = useState([])
  const [workspaceInfo, setWorkspaceInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    position: '',
    email: '',
    phone: '',
    fee: ''
  })

  useEffect(() => {
    checkAuth()
  }, [workspace])

  const checkAuth = async () => {
    const token = localStorage.getItem(`workspace_token_${workspace}`)
    if (!token) {
      navigate(`/${workspace}`, { replace: true })
      return
    }

    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspace}/verify`, {
        headers: { 'X-Workspace-Token': token }
      })
      if (res.ok) {
        const data = await res.json()
        setWorkspaceInfo(data.workspace)
        fetchData()
      } else {
        localStorage.removeItem(`workspace_token_${workspace}`)
        navigate(`/${workspace}`, { replace: true })
      }
    } catch {
      navigate(`/${workspace}`, { replace: true })
    }
  }

  const fetchData = async () => {
    try {
      const data = await getExperts(workspace)
      setExperts(data)
    } catch (err) {
      console.error('Failed to load experts:', err)
    }
    setLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem(`workspace_token_${workspace}`)
    navigate(`/${workspace}`, { replace: true })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (editingExpert) {
      await saveExpert({ ...editingExpert, ...formData }, workspace)
    } else {
      const newExpert = await createExpert(formData, workspace)
      setShowLinkModal(newExpert)
    }

    const updatedExperts = await getExperts(workspace)
    setExperts(updatedExperts)
    setShowForm(false)
    setEditingExpert(null)
    setFormData({ name: '', organization: '', position: '', email: '', phone: '', fee: '' })
  }

  const handleEdit = (expert) => {
    setEditingExpert(expert)
    setFormData({
      name: expert.name,
      organization: expert.organization,
      position: expert.position,
      email: expert.email,
      phone: expert.phone,
      fee: expert.fee
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      await deleteExpert(id, workspace)
      const data = await getExperts(workspace)
      setExperts(data)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert('복사되었습니다!')
  }

  const getFormUrl = (expert) => {
    return `${window.location.origin}/${workspace}/form/${expert.id}`
  }

  const getPollUrl = (expert) => {
    return `${window.location.origin}/${workspace}/poll/${expert.id}`
  }

  const handleAddSlot = async (e) => {
    if (e) e.preventDefault()
    if (!newSlot.date || !newSlot.startTime || !newSlot.endTime) return

    const timeRange = `${newSlot.startTime}~${newSlot.endTime}`
    await addPollingSlot(showPollingModal.id, { date: newSlot.date, time: timeRange }, workspace)
    const updatedExperts = await getExperts(workspace)
    setExperts(updatedExperts)
    setShowPollingModal(updatedExperts.find(e => e.id === showPollingModal.id))
    // Reset date only, keep the current time settings
    setNewSlot({ ...newSlot, date: '' })
  }

  const handleDeleteSlot = async (slotId) => {
    await deletePollingSlot(showPollingModal.id, slotId, workspace)
    const updatedExperts = await getExperts(workspace)
    setExperts(updatedExperts)
    setShowPollingModal(updatedExperts.find(e => e.id === showPollingModal.id))
  }

  const handleConfirmSlots = async () => {
    if (selectedConfirmedSlots.length === 0) {
      alert('최소 하나 이상의 시간대를 선택해주세요.')
      return
    }
    await confirmSlots(showPollingModal.id, selectedConfirmedSlots, workspace)
    const updatedExperts = await getExperts(workspace)
    setExperts(updatedExperts)
    setShowPollingModal(null)
    setSelectedConfirmedSlots([])
  }

  const handleOpenPollingModal = async (expert) => {
    const latestExpert = await getExpertById(expert.id, workspace)
    setShowPollingModal(latestExpert)
  }

  const handleStartPolling = async () => {
    if (!showPollingModal.pollingSlots || showPollingModal.pollingSlots.length === 0) {
      alert('투표를 시작하려면 최소 하나 이상의 후보 일정을 추가해야 합니다.')
      return
    }
    await startPolling(showPollingModal.id, workspace)
    const updatedExperts = await getExperts(workspace)
    setExperts(updatedExperts)
    setShowPollingModal(updatedExperts.find(e => e.id === showPollingModal.id))
  }

  const toggleSlotSelection = (slotId) => {
    setSelectedConfirmedSlots(prev =>
      prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]
    )
  }

  const handleResetConfirmation = async () => {
    const message = showPollingModal.status === 'registered'
      ? '전문가가 이미 일정을 선택했습니다. 정말 확정을 취소하시겠습니까? 전문가의 선택도 초기화됩니다.'
      : '후보일정 확정을 취소하시겠습니까? 다시 투표를 받을 수 있는 상태로 돌아갑니다.'

    if (!confirm(message)) return

    try {
      await resetConfirmation(showPollingModal.id, workspace)
      const updatedExperts = await getExperts(workspace)
      setExperts(updatedExperts)
      const updatedExpert = updatedExperts.find(e => e.id === showPollingModal.id)
      setShowPollingModal(updatedExpert)
      setSelectedConfirmedSlots([])
    } catch (error) {
      console.error('[Reset] Error:', error)
      alert('일정 변경에 실패했습니다: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-800">전문가 목록 관리</h1>
                {workspaceInfo && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {workspaceInfo.name}
                  </span>
                )}
              </div>
              <p className="text-gray-500 mt-1">세미나 발표자 정보를 관리하고 입력 링크를 생성합니다.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditingExpert(null)
                  setFormData({ name: '', organization: '', position: '', email: '', phone: '', fee: '' })
                  setShowForm(true)
                }}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                전문가 추가
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>

        {/* Experts List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">이름</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">소속</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">직위</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">이메일</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">전화번호</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">자문료</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">상태</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {experts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    등록된 전문가가 없습니다.
                  </td>
                </tr>
              ) : (
                experts.map((expert) => (
                  <tr key={expert.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{expert.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{expert.organization}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{expert.position}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{expert.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{expert.phone}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{expert.fee ? `${parseInt(expert.fee).toLocaleString()}원` : '-'}</td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {expert.status === 'registered' ? (
                        <span className="text-blue-600">일정확정 ({expert.selectedSlot.date} {expert.selectedSlot.time})</span>
                      ) : expert.status === 'confirmed' ? (
                        <span className="text-green-600">전문가요청 중</span>
                      ) : expert.status === 'polling' ? (
                        <span className="text-orange-600">일정투표중</span>
                      ) : expert.status === 'unavailable' ? (
                        <span className="text-amber-600">일정조율 필요</span>
                      ) : (
                        <span className="text-gray-400">전문가요청 전</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      <button
                        onClick={() => handleOpenPollingModal(expert)}
                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="일정투표"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                      </button>
                      <button
                        onClick={() => setShowLinkModal(expert)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="전문가요청"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEdit(expert)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="수정"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(expert.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="삭제"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {editingExpert ? '전문가 수정' : '전문가 추가'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">소속 *</label>
                  <input
                    type="text"
                    required
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">직위 *</label>
                  <input
                    type="text"
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이메일 *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">전화번호 *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="010-0000-0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">자문료</label>
                  <input
                    type="number"
                    value={formData.fee}
                    onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="원 단위로 입력"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingExpert ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Info Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">전달용 링크 및 비밀번호</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">{showLinkModal.name}</span>님 관련 링크 정보를 관리하세요.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">내부 멤버 투표 URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getPollUrl(showLinkModal)}
                    className="flex-1 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(getPollUrl(showLinkModal))}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    복사
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">이 링크를 내부 멤버들에게 공유하여 일정 투표를 받으세요.</p>
              </div>

              {/* 전문가 요청 URL (통합) */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">전문가 요청 URL</label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    showLinkModal.status === 'registered'
                      ? 'bg-blue-100 text-blue-700'
                      : showLinkModal.status === 'unavailable'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}>
                    {showLinkModal.status === 'registered'
                      ? `일정 확정 (${showLinkModal.selectedSlot?.date?.replace(/-/g, '년 ').replace(/-/, '월 ')}일)`
                      : '일정 확인중'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getFormUrl(showLinkModal)}
                    className={`flex-1 px-3 py-2 border rounded-lg text-sm ${
                      showLinkModal.status === 'confirmed' || showLinkModal.status === 'registered'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 text-gray-400 border-gray-200'
                    }`}
                  />
                  <button
                    onClick={() => {
                      if (showLinkModal.status === 'confirmed' || showLinkModal.status === 'registered') {
                        copyToClipboard(getFormUrl(showLinkModal))
                      } else {
                        alert('후보일정이 확정된 후에 복사가 가능합니다.')
                      }
                    }}
                    className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                      showLinkModal.status === 'confirmed' || showLinkModal.status === 'registered'
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    복사
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {showLinkModal.status === 'registered'
                    ? '전문가가 일정을 선택 완료했습니다. 프로필 등록을 요청하세요.'
                    : showLinkModal.status === 'unavailable'
                      ? '전문가가 가능한 일정이 없다고 응답했습니다. 일정을 재조율해 주세요.'
                      : showLinkModal.status === 'confirmed'
                        ? '전문가분께 이 링크를 전달하여 일정 선택 및 프로필 등록을 요청하세요.'
                        : '후보일정이 확정된 후 전문가에게 요청할 수 있습니다.'}
                </p>
              </div>

              {/* 이메일 문구 */}
              {(showLinkModal.status === 'confirmed' || showLinkModal.status === 'registered') && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">전문가 요청 이메일 문구</label>
                    <button
                      onClick={() => {
                        const emailText = showLinkModal.status === 'registered'
                          ? `안녕하세요, ${showLinkModal.name} 님.\n\n세미나 발표 관련 프로필 등록을 요청드립니다.\n\n아래 링크에서 프로필 정보를 입력해 주시기 바랍니다.\n\n▶ 접속 링크: ${getFormUrl(showLinkModal)}\n▶ 접속 비밀번호: ${showLinkModal.password}\n\n확정된 일정: ${showLinkModal.selectedSlot?.date} ${showLinkModal.selectedSlot?.time}\n\n감사합니다.`
                          : `안녕하세요, ${showLinkModal.name} 님.\n\n세미나 발표 일정 확인을 요청드립니다.\n\n아래 링크에서 가능한 일정을 선택해 주시기 바랍니다.\n\n▶ 접속 링크: ${getFormUrl(showLinkModal)}\n▶ 접속 비밀번호: ${showLinkModal.password}\n\n일정 선택 후 프로필 정보 입력도 함께 부탁드립니다.\n\n감사합니다.`
                        copyToClipboard(emailText)
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      문구 복사
                    </button>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-line">
                    {showLinkModal.status === 'registered' ? (
                      <>
                        안녕하세요, {showLinkModal.name} 님.{'\n\n'}
                        세미나 발표 관련 프로필 등록을 요청드립니다.{'\n\n'}
                        아래 링크에서 프로필 정보를 입력해 주시기 바랍니다.{'\n\n'}
                        ▶ 접속 링크: <span className="text-blue-600">{getFormUrl(showLinkModal)}</span>{'\n'}
                        ▶ 접속 비밀번호: <span className="font-mono font-bold">{showLinkModal.password}</span>{'\n\n'}
                        확정된 일정: <span className="font-semibold">{showLinkModal.selectedSlot?.date} {showLinkModal.selectedSlot?.time}</span>{'\n\n'}
                        감사합니다.
                      </>
                    ) : (
                      <>
                        안녕하세요, {showLinkModal.name} 님.{'\n\n'}
                        세미나 발표 일정 확인을 요청드립니다.{'\n\n'}
                        아래 링크에서 가능한 일정을 선택해 주시기 바랍니다.{'\n\n'}
                        ▶ 접속 링크: <span className="text-blue-600">{getFormUrl(showLinkModal)}</span>{'\n'}
                        ▶ 접속 비밀번호: <span className="font-mono font-bold">{showLinkModal.password}</span>{'\n\n'}
                        일정 선택 후 프로필 정보 입력도 함께 부탁드립니다.{'\n\n'}
                        감사합니다.
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">접근 비밀번호 (전문가용)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={showLinkModal.password}
                    className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-mono text-lg tracking-wider"
                  />
                  <button
                    onClick={() => copyToClipboard(showLinkModal.password)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    복사
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowLinkModal(null)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Polling Modal */}
      {showPollingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b pb-4">
              <h2 className="text-xl font-bold text-gray-800">회의 일정 관리 - {showPollingModal.name}</h2>
              <button onClick={() => setShowPollingModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            {/* Removed voting URL from here as per user request to show it above buttons after starting poll */}

            <div className="mb-8 bg-blue-50 p-6 rounded-2xl border border-blue-100 shadow-sm">
              <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">1</span>
                후보 일시 추가 (30분 단위 선택)
              </h3>
              {!(showPollingModal.status === 'confirmed' || showPollingModal.status === 'registered' || showPollingModal.status === 'unavailable') ? (
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-blue-700 mb-1.5 ml-1">날짜</span>
                    <input
                      type="date"
                      value={newSlot.date}
                      onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                      className="px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-blue-700 mb-1.5 ml-1">시작 시각</span>
                    <div className="flex gap-1">
                      <select
                        value={newSlot.startTime.split(':')[0]}
                        onChange={(e) => {
                          const h = e.target.value;
                          const m = newSlot.startTime.split(':')[1];
                          const newStart = `${h}:${m}`;

                          // Auto-calculate end time (+2 hours)
                          const startTotalMinutes = parseInt(h) * 60 + parseInt(m);
                          const endTotalMinutes = (startTotalMinutes + 120) % 1440;
                          const endH = Math.floor(endTotalMinutes / 60).toString().padStart(2, '0');
                          const endM = (endTotalMinutes % 60).toString().padStart(2, '0');

                          setNewSlot({
                            ...newSlot,
                            startTime: newStart,
                            endTime: `${endH}:${endM}`
                          });
                        }}
                        className="px-2 py-2 border border-blue-200 rounded-lg bg-white overflow-y-auto"
                      >
                        {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(h => <option key={h} value={h}>{h}시</option>)}
                      </select>
                      <select
                        value={newSlot.startTime.split(':')[1]}
                        onChange={(e) => {
                          const h = newSlot.startTime.split(':')[0];
                          const m = e.target.value;
                          const newStart = `${h}:${m}`;

                          // Auto-calculate end time (+2 hours)
                          const startTotalMinutes = parseInt(h) * 60 + parseInt(m);
                          const endTotalMinutes = (startTotalMinutes + 120) % 1440;
                          const endH = Math.floor(endTotalMinutes / 60).toString().padStart(2, '0');
                          const endM = (endTotalMinutes % 60).toString().padStart(2, '0');

                          setNewSlot({
                            ...newSlot,
                            startTime: newStart,
                            endTime: `${endH}:${endM}`
                          });
                        }}
                        className="px-2 py-2 border border-blue-200 rounded-lg bg-white"
                      >
                        <option value="00">00분</option>
                        <option value="30">30분</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-blue-700 mb-1.5 ml-1">종료 시각</span>
                    <div className="flex gap-1">
                      <select
                        value={newSlot.endTime.split(':')[0]}
                        onChange={(e) => setNewSlot({ ...newSlot, endTime: `${e.target.value}:${newSlot.endTime.split(':')[1]}` })}
                        className="px-2 py-2 border border-blue-200 rounded-lg bg-white h-auto"
                      >
                        {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(h => <option key={h} value={h}>{h}시</option>)}
                      </select>
                      <select
                        value={newSlot.endTime.split(':')[1]}
                        onChange={(e) => setNewSlot({ ...newSlot, endTime: `${newSlot.endTime.split(':')[0]}:${e.target.value}` })}
                        className="px-2 py-2 border border-blue-200 rounded-lg bg-white"
                      >
                        <option value="00">00분</option>
                        <option value="30">30분</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={handleAddSlot}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-md h-[42px]"
                  >
                    슬롯 추가
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500 font-medium">일정이 확정되어 더 이상 슬롯을 추가할 수 없습니다.</p>
              )}
              <p className="text-[11px] text-blue-600 mt-3 font-medium flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" /></svg>
                회의 시작과 종료를 30분 단위로만 정하실 수 있습니다.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <span className="bg-gray-700 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">2</span>
                후보 일시 리스트 및 투표 결과
              </h3>
              {(!showPollingModal.pollingSlots || showPollingModal.pollingSlots.length === 0) ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                  <p className="text-gray-400 font-medium">등록된 후보 일정이 없습니다. 일정을 먼저 추가해주세요.</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-center w-24">최종선택</th>
                        <th className="px-4 py-3 text-left">일시</th>
                        <th className="px-4 py-3 text-left">투표 참여자</th>
                        <th className="px-4 py-3 text-center w-24">득표</th>
                        <th className="px-4 py-3 text-right w-24">작업</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {showPollingModal.pollingSlots.map(slot => {
                        const isConfirmed = showPollingModal.confirmedSlots?.some(cs => cs.id === slot.id)
                        const isSelected = selectedConfirmedSlots.includes(slot.id)
                        return (
                          <tr key={slot.id} className={`${isConfirmed ? 'bg-green-50 border-l-4 border-l-green-500' : isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'} transition-colors`}>
                            <td className="px-4 py-4 text-center">
                              {(showPollingModal.status === 'confirmed' || showPollingModal.status === 'registered' || showPollingModal.status === 'unavailable') ? (
                                isConfirmed ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-green-500 text-white rounded-full">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                  </span>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSlotSelection(slot.id)}
                                  className="w-5 h-5 text-blue-600 rounded-md cursor-pointer border-gray-300 focus:ring-blue-500"
                                />
                              )}
                            </td>
                            <td className="px-4 py-4 font-semibold text-gray-900">
                              {slot.date} {slot.time}
                              {isConfirmed && <span className="ml-2 text-xs text-green-600 font-bold">(확정됨)</span>}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-1.5">
                                {slot.voters && slot.voters.length > 0 ? (
                                  slot.voters.map(v => (
                                    <span key={v} className="px-2.5 py-1 bg-white text-gray-700 rounded-md border border-gray-200 text-xs shadow-sm font-medium">
                                      {v}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-gray-400 text-xs italic">투표 없음</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full font-bold shadow-sm ${slot.votes > 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                {slot.votes || 0}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              {!(showPollingModal.status === 'confirmed' || showPollingModal.status === 'registered' || showPollingModal.status === 'unavailable') && (
                                <button
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 rounded hover:bg-red-50"
                                >
                                  삭제
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Poll URL display - only when polling has started */}
            {showPollingModal.status !== 'none' && (
              <div className="mt-8 bg-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-inner">
                <label className="block text-sm font-bold text-indigo-800 mb-2">내부 멤버 투표 URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getPollUrl(showPollingModal)}
                    className={`flex-1 px-3 py-2 border rounded-lg text-sm ${showPollingModal.status === 'confirmed' || showPollingModal.status === 'registered' ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white border-indigo-200 text-indigo-700 font-medium'}`}
                  />
                  <button
                    onClick={() => copyToClipboard(getPollUrl(showPollingModal))}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-bold shadow-sm"
                  >
                    URL 복사
                  </button>
                </div>
                {showPollingModal.status === 'polling' ? (
                  <p className="text-[11px] text-indigo-600 mt-1.5 font-medium">위 링크를 공유하여 내부 구성원들의 투표를 받으세요.</p>
                ) : (
                  <p className="text-[11px] text-red-500 mt-1.5 font-bold">※ 일정이 확정되어 더 이상 투표를 받을 수 없습니다.</p>
                )}
              </div>
            )}

            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-100">
              <button
                onClick={() => setShowPollingModal(null)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-colors min-w-[100px]"
              >
                닫기
              </button>

              {showPollingModal.status === 'none' && (
                <button
                  onClick={handleStartPolling}
                  disabled={!showPollingModal.pollingSlots || showPollingModal.pollingSlots.length === 0}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg shadow-blue-100 transition-all transform active:scale-[0.98]"
                >
                  투표 시작
                </button>
              )}

              {showPollingModal.status === 'polling' && (
                <>
                  <button
                    onClick={handleConfirmSlots}
                    disabled={selectedConfirmedSlots.length === 0}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg shadow-green-100 transition-all transform active:scale-[0.98]"
                  >
                    후보일정 확정 (전문가용 후보 완성)
                  </button>
                </>
              )}

              {(showPollingModal.status === 'confirmed' || showPollingModal.status === 'registered' || showPollingModal.status === 'unavailable') && (
                <>
                  <div className={`flex-1 flex items-center justify-center rounded-xl font-bold border ${showPollingModal.status === 'unavailable'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-green-50 text-green-700 border-green-200'
                    }`}>
                    {showPollingModal.status === 'registered'
                      ? '전문가 일정 선택 완료'
                      : showPollingModal.status === 'unavailable'
                        ? '전문가 일정 조율 요청됨'
                        : '후보일정 확정됨'}
                  </div>
                  <button
                    onClick={handleResetConfirmation}
                    className="px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 font-bold shadow-lg shadow-orange-100 transition-all transform active:scale-[0.98]"
                  >
                    일정 변경
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPage
