import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getExpertById, saveFormData, getFormData, clearFormData } from '../utils/storage'
import { generateMultiPagePDF } from '../utils/pdfGenerator'
import ProfileForm from '../components/ExpertForm/ProfileForm'
import SeminarForm from '../components/ExpertForm/SeminarForm'
import ConsentForm from '../components/ExpertForm/ConsentForm'

function ExpertFormPage() {
  const { expertId } = useParams()
  const navigate = useNavigate()
  const expert = getExpertById(expertId)
  
  const [activeTab, setActiveTab] = useState('profile')
  const [isGenerating, setIsGenerating] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  
  // Form data states
  const [profile, setProfile] = useState({
    name: expert?.name || '',
    organization: expert?.organization || '',
    position: expert?.position || '',
    email: expert?.email || '',
    phone: expert?.phone || '',
    education: [],
    career: [],
    achievements: ''
  })
  
  const [seminar, setSeminar] = useState({
    title: '',
    subtitles: ['', '', '', '', ''],
    summary: ''
  })
  
  const [consent, setConsent] = useState({
    name: expert?.name || '',
    organization: expert?.organization || '',
    position: expert?.position || '',
    address: '',
    bankName: '',
    accountNumber: '',
    allowance: expert?.fee ? parseInt(expert.fee).toLocaleString() : '',
    transportFee: '',
    otherFee: '',
    idNumber: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
    signature: ''
  })

  // Load saved data on mount
  useEffect(() => {
    const saved = getFormData(expertId)
    if (saved) {
      if (saved.profile) setProfile(saved.profile)
      if (saved.seminar) setSeminar(saved.seminar)
      if (saved.consent) setConsent(saved.consent)
    }
  }, [expertId])

  // Auto save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      handleAutoSave()
    }, 30000)
    return () => clearInterval(interval)
  }, [profile, seminar, consent])

  if (!expert) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800">접근 오류</h2>
          <p className="text-gray-600">유효하지 않은 링크입니다.</p>
        </div>
      </div>
    )
  }

  const handleAutoSave = () => {
    saveFormData(expertId, { profile, seminar, consent })
    setSaveMessage('자동 저장됨')
    setTimeout(() => setSaveMessage(''), 2000)
  }

  const handleManualSave = () => {
    saveFormData(expertId, { profile, seminar, consent })
    setSaveMessage('임시저장 완료!')
    setTimeout(() => setSaveMessage(''), 3000)
  }

  const handleDownloadPDF = async () => {
    // Validation
    if (!profile.name || !profile.idNumber || !profile.address) {
      alert('발표자 인적사항을 모두 입력해주세요.')
      setActiveTab('profile')
      return
    }
    if (!seminar.title || !seminar.summary) {
      alert('발표요약을 입력해주세요.')
      setActiveTab('seminar')
      return
    }
    if (!consent.signature) {
      alert('개인정보 동의서에 서명해주세요.')
      setActiveTab('consent')
      return
    }

    setIsGenerating(true)
    try {
      await generateMultiPagePDF(
        null,
        `${profile.name || '전문가'}_제출서류.pdf`,
        { profile, seminar, consent }
      )
    } catch (error) {
      console.error('PDF 생성 오류:', error)
      alert('PDF 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  const tabs = [
    { id: 'profile', label: '발표자 인적사항' },
    { id: 'seminar', label: '발표요약' },
    { id: 'consent', label: '개인정보 동의서' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">전문가 정보 입력</h1>
              <p className="text-sm text-gray-500">{expert.name}님, 아래 내용을 입력해주세요.</p>
            </div>
            <div className="flex items-center gap-3">
              {saveMessage && (
                <span className="text-sm text-green-600">{saveMessage}</span>
              )}
              <button
                onClick={handleManualSave}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                임시저장
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={isGenerating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? '생성중...' : 'PDF 다운로드'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Form Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          {activeTab === 'profile' && (
            <ProfileForm data={profile} onChange={setProfile} />
          )}
          {activeTab === 'seminar' && (
            <SeminarForm data={seminar} onChange={setSeminar} />
          )}
          {activeTab === 'consent' && (
            <ConsentForm 
              data={consent} 
              onChange={setConsent} 
              profileData={profile}
            />
          )}
        </div>
      </main>

    </div>
  )
}

export default ExpertFormPage
