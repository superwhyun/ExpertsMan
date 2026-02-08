import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getExpertById, saveFormData, getFormData, clearFormData, selectExpertSlot, markNoAvailableSchedule, getWorkspacePublicSettings } from '../utils/storage'
import { generateMultiPagePDF } from '../utils/pdfGenerator'
import ProfileForm from '../components/ExpertForm/ProfileForm'
import SeminarForm from '../components/ExpertForm/SeminarForm'
import ConsentForm from '../components/ExpertForm/ConsentForm'

function ExpertFormPage() {
  const { workspace, expertId } = useParams()
  const navigate = useNavigate()

  const [expert, setExpert] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [isGenerating, setIsGenerating] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [senderName, setSenderName] = useState('')

  // Form data states
  const [profile, setProfile] = useState({
    name: '',
    organization: '',
    position: '',
    email: '',
    phone: '',
    education: [],
    career: [],
    achievements: ''
  })

  const [seminar, setSeminar] = useState({
    title: '',
    subtitles: ['', '', '', '', ''],
    summary: '',
    selectedSlot: null
  })

  const [consent, setConsent] = useState({
    name: '',
    organization: '',
    position: '',
    address: '',
    bankName: '',
    accountNumber: '',
    allowance: '',
    transportFee: '',
    otherFee: '',
    idNumber: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
    signature: ''
  })

  // Load expert data and initialize forms (with draft sync)
  useEffect(() => {
    const fetchData = async () => {
      // 워크스페이스 설정 로드
      try {
        const settings = await getWorkspacePublicSettings(workspace)
        if (settings.sender_name) {
          setSenderName(settings.sender_name)
        }
      } catch (err) {
        console.warn('워크스페이스 설정 로드 실패:', err)
      }

      const data = await getExpertById(expertId, workspace)
      if (!data) {
        setLoading(false)
        return
      }

      setExpert(data)
      const saved = getFormData(expertId)

      // 1. 초기값 설정
      let initialProfile = {
        name: data.name || '',
        organization: data.organization || '',
        position: data.position || '',
        email: data.email || '',
        phone: data.phone || '',
        education: [],
        career: [],
        achievements: ''
      }

      let initialSeminar = {
        title: '',
        subtitles: ['', '', '', '', ''],
        summary: '',
        selectedSlot: null
      }

      let initialConsent = {
        name: data.name || '',
        organization: data.organization || '',
        position: data.position || '',
        address: '',
        bankName: '',
        accountNumber: '',
        allowance: data.fee ? parseInt(data.fee).toLocaleString() : '',
        transportFee: '',
        otherFee: '',
        idNumber: '',
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        day: new Date().getDate(),
        signature: ''
      }

      // 2. 전문가가 선택한 "확정 일정"이 있다면 동의서 날짜 설정
      if (data.selectedSlot?.date) {
        const [year, month, day] = data.selectedSlot.date.split('-').map(Number)
        initialConsent.year = year
        initialConsent.month = month
        initialConsent.day = day
      }

      // 3. 임시저장(draft) 데이터가 있으면 덮어쓰기
      if (saved) {
        if (saved.profile) initialProfile = { ...initialProfile, ...saved.profile }
        if (saved.seminar) initialSeminar = { ...initialSeminar, ...saved.seminar }
        if (saved.consent) {
          initialConsent = { ...initialConsent, ...saved.consent }
          // 임시저장 데이터가 있더라도 "확정 일정"의 날짜 정보는 항상 최신화
          if (data.selectedSlot?.date) {
            const [year, month, day] = data.selectedSlot.date.split('-').map(Number)
            initialConsent.year = year
            initialConsent.month = month
            initialConsent.day = day
          }
        }
      }

      setProfile(initialProfile)
      setSeminar(initialSeminar)
      setConsent(initialConsent)
      setLoading(false)
    }
    fetchData()
  }, [expertId, workspace])

  // Auto save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      handleAutoSave()
    }, 30000)
    return () => clearInterval(interval)
  }, [profile, seminar, consent])

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">데이터를 불러오는 중...</div>
  }

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
    saveFormData(expertId, { profile, seminar, consent, selectedSlot: seminar.selectedSlot })
    setSaveMessage('자동 저장됨')
    setTimeout(() => setSaveMessage(''), 2000)
  }

  const handleManualSave = () => {
    saveFormData(expertId, { profile, seminar, consent, selectedSlot: seminar.selectedSlot })
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
    if (!profile.education || profile.education.length === 0) {
      alert('학력을 최소 1개 이상 입력해주세요.')
      setActiveTab('profile')
      return
    }
    if (!profile.career || profile.career.length === 0) {
      alert('경력을 최소 1개 이상 입력해주세요.')
      setActiveTab('profile')
      return
    }
    if (!seminar.title || !seminar.summary) {
      alert('발표요약을 입력해주세요.')
      setActiveTab('seminar')
      return
    }
    if (!consent.bankName || !consent.accountNumber) {
      alert('은행명과 계좌번호를 입력해주세요.')
      setActiveTab('consent')
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
        { profile, seminar, consent },
        { senderName }
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

  if (expert.status === 'none' || expert.status === 'polling') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center bg-white p-10 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">일정 조율 중</h2>
          <p className="text-gray-500 font-medium">관리자 측에서 아직 후보 일정을 확정하지 않았습니다. 잠시 후 다시 접속하시거나 관리자에게 문의해 주세요.</p>
        </div>
      </div>
    )
  }

  // 전문가가 "가능한 일정 없음"을 선택한 경우
  if (expert.status === 'unavailable') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center bg-white p-10 rounded-3xl shadow-2xl border border-amber-100 max-w-lg w-full">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-4">일정 조율 요청이 접수되었습니다</h2>
          <div className="bg-amber-50 rounded-2xl p-6 mb-6 border border-amber-100">
            <p className="text-gray-700 font-medium leading-relaxed">
              <span className="font-bold text-amber-700">{expert.name}</span> 전문가님의 일정 조율 요청이
              연구팀에 전달되었습니다.
            </p>
            <p className="text-gray-600 mt-3 leading-relaxed">
              담당자가 다른 날짜로 조정한 후 <span className="font-semibold">빠른 시일 내에 다시 연락</span>드리겠습니다.
            </p>
          </div>
          <div className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4">
            <p className="mb-1">문의사항이 있으시면 아래로 연락해 주세요.</p>
            <p className="font-semibold text-gray-700">연구팀 담당자 연락처</p>
          </div>
        </div>
      </div>
    )
  }

  // Step 1: Date Selection (if status is 'confirmed')
  if (expert.status === 'confirmed') {
    const isNoScheduleSelected = seminar.selectedSlot === 'unavailable'

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-2xl w-full border border-white">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2 text-center">강연 일정 확정</h1>
          <p className="text-gray-500 font-medium mb-8 text-center">{expert.name} 전문가님, 아래 후보 일정 중 가능한 하나를 선택해 주세요.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {expert.confirmedSlots?.map((slot) => (
              <label
                key={slot.id}
                className={`flex items-center p-5 border-2 rounded-2xl cursor-pointer transition-all ${seminar.selectedSlot?.id === slot.id
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xl ring-4 ring-blue-100'
                  : 'bg-gray-50 border-gray-100 text-gray-700 hover:border-blue-200 hover:bg-blue-50'
                  }`}
              >
                <input
                  type="radio"
                  name="selectedSlot"
                  className="hidden"
                  checked={seminar.selectedSlot?.id === slot.id}
                  onChange={() => setSeminar({ ...seminar, selectedSlot: slot })}
                />
                <div className="flex flex-col">
                  <span className="text-lg font-black">{slot.date}</span>
                  <span className={`font-bold ${seminar.selectedSlot?.id === slot.id ? 'text-blue-100' : 'text-gray-500'}`}>{slot.time}</span>
                </div>
              </label>
            ))}
          </div>

          {/* 가능한 일정 없음 옵션 */}
          <div className="border-t border-gray-200 pt-4 mb-8">
            <label
              className={`flex items-center p-5 border-2 rounded-2xl cursor-pointer transition-all ${isNoScheduleSelected
                ? 'bg-amber-500 border-amber-500 text-white shadow-xl ring-4 ring-amber-100'
                : 'bg-gray-50 border-gray-100 text-gray-700 hover:border-amber-200 hover:bg-amber-50'
                }`}
            >
              <input
                type="radio"
                name="selectedSlot"
                className="hidden"
                checked={isNoScheduleSelected}
                onChange={() => setSeminar({ ...seminar, selectedSlot: 'unavailable' })}
              />
              <div className="flex items-center gap-3">
                <svg className={`w-6 h-6 ${isNoScheduleSelected ? 'text-white' : 'text-amber-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span className="text-lg font-black">가능한 일정 없음</span>
              </div>
            </label>
            <p className="text-xs text-gray-500 mt-2 ml-2">위 일정 중 참여 가능한 일정이 없으시면 선택해 주세요. 연구팀에서 다른 날짜로 조정 후 다시 연락드리겠습니다.</p>
          </div>

          {isNoScheduleSelected ? (
            <button
              onClick={async () => {
                try {
                  await markNoAvailableSchedule(expertId, workspace)
                  setExpert({ ...expert, status: 'unavailable' })
                } catch (error) {
                  alert('요청 처리에 실패했습니다. 다시 시도해 주세요.')
                }
              }}
              className="w-full bg-amber-500 text-white font-black py-4 rounded-2xl hover:bg-amber-600 transition-all shadow-xl shadow-amber-200 text-lg"
            >
              일정 조율 요청하기
            </button>
          ) : (
            <button
              disabled={!seminar.selectedSlot}
              onClick={async () => {
                try {
                  await selectExpertSlot(expertId, seminar.selectedSlot, workspace)
                  setExpert({ ...expert, status: 'registered', selectedSlot: seminar.selectedSlot })

                  // 전문가가 선택한 날짜를 동의서 날짜로 동기화
                  if (seminar.selectedSlot?.date) {
                    const [year, month, day] = seminar.selectedSlot.date.split('-').map(Number)
                    setConsent(prev => ({
                      ...prev,
                      year,
                      month,
                      day
                    }))
                  }
                } catch (error) {
                  alert('일정 확정에 실패했습니다. 다시 시도해 주세요.')
                }
              }}
              className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              일정 확정 및 정보 입력하기
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">전문가 정보 입력</h1>
              <p className="text-sm text-gray-500">{expert.name}님, 아래 내용을 입력해주세요. (확정 일시: {expert.selectedSlot?.date} {expert.selectedSlot?.time})</p>
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
                className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id
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
              senderName={senderName}
            />
          )}
        </div>
      </main>

    </div>
  )
}

export default ExpertFormPage
