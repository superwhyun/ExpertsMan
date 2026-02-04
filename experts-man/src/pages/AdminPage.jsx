import { useState, useEffect } from 'react'
import { getExperts, createExpert, deleteExpert, saveExpert } from '../utils/storage'

function AdminPage() {
  const [experts, setExperts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingExpert, setEditingExpert] = useState(null)
  const [showLinkModal, setShowLinkModal] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    position: '',
    email: '',
    phone: '',
    fee: ''
  })

  useEffect(() => {
    setExperts(getExperts())
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (editingExpert) {
      saveExpert({ ...editingExpert, ...formData })
    } else {
      const newExpert = createExpert(formData)
      setShowLinkModal(newExpert)
    }
    
    setExperts(getExperts())
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

  const handleDelete = (id) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteExpert(id)
      setExperts(getExperts())
    }
  }

  const handleGenerateNewLink = (expert) => {
    const updated = {
      ...expert,
      id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      password: Math.floor(100000 + Math.random() * 900000).toString(),
      createdAt: new Date().toISOString()
    }
    saveExpert(updated)
    setExperts(getExperts())
    setShowLinkModal(updated)
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert('복사되었습니다!')
  }

  const getFormUrl = (expert) => {
    return `${window.location.origin}/form/${expert.id}`
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">전문가 목록 관리</h1>
              <p className="text-gray-500 mt-1">세미나 발표자 정보를 관리하고 입력 링크를 생성합니다.</p>
            </div>
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
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {experts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
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
                    <td className="px-6 py-4 text-sm space-x-2">
                      <button
                        onClick={() => setShowLinkModal(expert)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        링크
                      </button>
                      <button
                        onClick={() => handleEdit(expert)}
                        className="text-gray-600 hover:text-gray-800 font-medium"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(expert.id)}
                        className="text-red-600 hover:text-red-800 font-medium"
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
            <h2 className="text-xl font-bold text-gray-800 mb-4">전문가 입력 링크</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800 mb-2">
                <span className="font-semibold">{showLinkModal.name}</span>님에게 아래 정보를 전달하세요.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">입력 페이지 URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getFormUrl(showLinkModal)}
                    className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(getFormUrl(showLinkModal))}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    복사
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">접근 비밀번호</label>
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
                onClick={() => handleGenerateNewLink(showLinkModal)}
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                새 링크 생성
              </button>
              <button
                onClick={() => setShowLinkModal(null)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPage
