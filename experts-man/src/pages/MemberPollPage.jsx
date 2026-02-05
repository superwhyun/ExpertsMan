import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getExpertById, updateMemberVotes, getVoters, checkVoterPassword } from '../utils/storage'

function MemberPollPage() {
    const { expertId } = useParams()
    const [expert, setExpert] = useState(null)
    const [voterName, setVoterName] = useState('')
    const [voterPassword, setVoterPassword] = useState('')
    const [isNameSubmitted, setIsNameSubmitted] = useState(false)
    const [selectedSlots, setSelectedSlots] = useState([])
    const [saveMessage, setSaveMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    // Load expert data
    useEffect(() => {
        const fetchData = async () => {
            const data = await getExpertById(expertId)
            if (data) {
                setExpert(data)
            }
        }
        fetchData()
    }, [expertId])

    // Load my previously selected slots ONLY once when name is submitted
    useEffect(() => {
        if (isNameSubmitted && expert && expert.pollingSlots) {
            const mySlots = expert.pollingSlots
                .filter(slot => slot.voters && slot.voters.includes(voterName))
                .map(slot => slot.id)
            console.log('Initial selected slots for', voterName, ':', mySlots)
            setSelectedSlots(mySlots)
        }
    }, [isNameSubmitted, expertId, voterName]) // Removed 'expert' from deps to avoid reset on save

    const toggleSlot = (slotId) => {
        setSelectedSlots(prev => {
            if (prev.includes(slotId)) {
                return prev.filter(id => id !== slotId)
            } else {
                return [...prev, slotId]
            }
        })
    }

    const handleSave = async () => {
        if (expert.status === 'confirmed' || expert.status === 'registered') {
            alert('이미 확정된 일정이 있어 투표를 수정할 수 없습니다.')
            return
        }
        try {
            await updateMemberVotes(expertId, voterName, selectedSlots)
            setSaveMessage('투표가 성공적으로 저장되었습니다!')

            // Refresh local data to show updated voter list and labels
            const updated = await getExpertById(expertId)
            setExpert({ ...updated })

            setTimeout(() => setSaveMessage(''), 3000)
        } catch (error) {
            alert(error.message)
        }
    }

    const [allVoters, setAllVoters] = useState([])
    useEffect(() => {
        const fetchVoters = async () => {
            if (expertId) {
                const voters = await getVoters(expertId)
                setAllVoters(voters)
            }
        }
        fetchVoters()
    }, [expertId, expert]) // Refresh when expert data changes

    if (!expert && expertId) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">데이터를 불러오는 중...</div>
    }

    if (!expert) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-sm w-full mx-4">
                    <h2 className="text-xl font-bold text-gray-800">접근 오류</h2>
                    <p className="text-gray-500 mt-2">유효하지 않은 링크입니다.</p>
                </div>
            </div>
        )
    }

    const handleAuth = async (e) => {
        e.preventDefault()
        if (!voterName.trim() || !voterPassword.trim()) return

        const result = await checkVoterPassword(expertId, voterName.trim(), voterPassword.trim())
        if (result.success) {
            setIsNameSubmitted(true)
            setErrorMessage('')
        } else {
            setErrorMessage(result.message)
        }
    }

    if (!isNameSubmitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
                <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full border border-white">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2 text-center">일정 투표 참여</h1>
                    <p className="text-gray-500 font-medium mb-8 text-center">{expert.name} 전문가 일정 조율</p>
                    <form onSubmit={handleAuth} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">이름</label>
                            <input
                                type="text"
                                required
                                placeholder="본인 성함 입력 (예: 홍길동)"
                                value={voterName}
                                onChange={(e) => setVoterName(e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none focus:bg-white transition-all text-lg font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">비밀번호</label>
                            <input
                                type="password"
                                required
                                placeholder="비밀번호 입력 (수정 시 필요)"
                                value={voterPassword}
                                onChange={(e) => setVoterPassword(e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none focus:bg-white transition-all text-lg font-medium"
                            />
                        </div>
                        {errorMessage && <p className="text-red-500 text-sm font-bold text-center">{errorMessage}</p>}
                        <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 text-lg mt-4">
                            투표 시작하기
                        </button>
                    </form>
                    <p className="text-gray-400 text-xs mt-6 text-center leading-relaxed">
                        처음 투표하시는 경우 사용하실 비밀번호를 입력해주세요.<br />
                        기존 투표 내역을 수정하시려면 당시 입력한 이름과 비밀번호가 필요합니다.
                    </p>
                </div>
            </div>
        )
    }

    // Group slots by date
    const groupedSlots = {}
    expert.pollingSlots?.forEach(slot => {
        if (!groupedSlots[slot.date]) groupedSlots[slot.date] = []
        groupedSlots[slot.date].push(slot)
    })
    const dates = Object.keys(groupedSlots).sort()

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 h-20 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-black text-gray-900">{expert.name} 일정 조율</h1>
                        <p className="text-sm font-bold text-blue-600">{voterName}님 (선택함: {selectedSlots.length}건)</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {saveMessage && <span className="text-green-600 font-bold text-sm bg-green-50 px-4 py-2 rounded-full border border-green-100">{saveMessage}</span>}
                        {!(expert.status === 'confirmed' || expert.status === 'registered') ? (
                            <button onClick={handleSave} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-200">
                                결과 저장
                            </button>
                        ) : (
                            <span className="bg-red-500 text-white px-6 py-2 rounded-full font-black text-sm">투표 마감</span>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {dates.map(date => (
                        <div key={date} className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden flex flex-col">
                            <div className="bg-gray-800 text-white p-4 font-black text-center text-sm">
                                {new Date(date).toLocaleDateString('ko-KR', { weekday: 'short', month: 'long', day: 'numeric' })}
                            </div>
                            <div className="p-4 space-y-2 flex-1">
                                {groupedSlots[date].sort((a, b) => a.time.localeCompare(b.time)).map(slot => {
                                    const isSelected = selectedSlots.includes(slot.id)
                                    const databaseVoters = slot.voters || []
                                    // I'll show "Total" include my *current* local selection for better feedback
                                    const databaseContainsMe = databaseVoters.includes(voterName)
                                    const displayedVoterCount = databaseVoters.length + (isSelected && !databaseContainsMe ? 1 : (!isSelected && databaseContainsMe ? -1 : 0))

                                    return (
                                        <button
                                            key={slot.id}
                                            type="button"
                                            disabled={expert.status === 'confirmed' || expert.status === 'registered'}
                                            onClick={() => toggleSlot(slot.id)}
                                            className={`w-full p-4 rounded-2xl text-left border-2 transition-all relative group ${isSelected
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg ring-4 ring-blue-50'
                                                : expert.status === 'confirmed' || expert.status === 'registered'
                                                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                                    : 'bg-white border-gray-50 text-gray-700 hover:border-blue-200 hover:bg-blue-50'
                                                }`}
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`font-black ${isSelected ? 'text-white' : 'text-gray-900 group-hover:text-blue-700'}`}>{slot.time}</span>
                                                {isSelected && <span className="font-bold">✓</span>}
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isSelected ? 'bg-blue-500 text-white' : 'bg-green-100 text-green-700'
                                                    }`}>
                                                    {displayedVoterCount}명 참여
                                                </span>
                                                {displayedVoterCount > 0 && !isSelected && (
                                                    <div className="flex -space-x-1 ml-1 overflow-hidden">
                                                        {databaseVoters.filter(v => v !== voterName).slice(0, 2).map((v, i) => (
                                                            <div key={i} className="w-5 h-5 rounded-full bg-gray-200 border border-white flex items-center justify-center text-[8px] font-bold text-gray-600">
                                                                {v.substring(0, 1)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
                        실시간 투표 참여 명단 ({allVoters.length}명)
                    </h3>
                    <div className="flex flex-wrap gap-2 text-sm">
                        {allVoters.map(v => (
                            <span key={v} className={`px-4 py-2 rounded-xl font-bold border ${v === voterName ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-100 text-gray-600'
                                }`}>
                                {v} {v === voterName && '(나)'}
                            </span>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    )
}

export default MemberPollPage
