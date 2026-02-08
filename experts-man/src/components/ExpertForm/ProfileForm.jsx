function ProfileForm({ data, onChange }) {
  const handleChange = (field, value) => {
    onChange({ ...data, [field]: value })
  }

  const handleIdNumberChange = (value) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '')

    // Format with hyphen after 6 digits
    let formatted = digits
    if (digits.length > 6) {
      formatted = digits.slice(0, 6) + '-' + digits.slice(6, 13)
    }

    onChange({ ...data, idNumber: formatted })
  }

  const handleEducationChange = (index, field, value) => {
    const newEducation = [...(data.education || [])]
    newEducation[index] = { ...newEducation[index], [field]: value }
    onChange({ ...data, education: newEducation })
  }

  const addEducation = () => {
    const newEducation = [...(data.education || []), { year: '', degree: '', school: '' }]
    onChange({ ...data, education: newEducation })
  }

  const removeEducation = (index) => {
    const newEducation = (data.education || []).filter((_, i) => i !== index)
    onChange({ ...data, education: newEducation })
  }

  const handleCareerChange = (index, field, value) => {
    const newCareer = [...(data.career || [])]
    newCareer[index] = { ...newCareer[index], [field]: value }
    onChange({ ...data, career: newCareer })
  }

  const addCareer = () => {
    const newCareer = [...(data.career || []), { period: '', organization: '', work: '' }]
    onChange({ ...data, career: newCareer })
  }

  const removeCareer = (index) => {
    const newCareer = (data.career || []).filter((_, i) => i !== index)
    onChange({ ...data, career: newCareer })
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800 border-b pb-2">발표자 인적사항</h2>
      
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">성명 *</label>
          <input
            type="text"
            value={data.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="실명을 입력하세요"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">주민등록번호 *</label>
          <input
            type="text"
            value={data.idNumber || ''}
            onChange={(e) => handleIdNumberChange(e.target.value)}
            maxLength={14}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="000000-0000000"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">주소 *</label>
          <input
            type="text"
            value={data.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="주소를 입력하세요"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">소속 *</label>
          <input
            type="text"
            value={data.organization || ''}
            onChange={(e) => handleChange('organization', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="소속 기관"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
          <input
            type="text"
            value={data.department || ''}
            onChange={(e) => handleChange('department', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="부서명"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">전화번호 *</label>
          <input
            type="tel"
            value={data.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="010-0000-0000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">이메일 *</label>
          <input
            type="email"
            value={data.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="email@example.com"
          />
        </div>
      </div>

      {/* Education */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-800">학력</h3>
          <button
            type="button"
            onClick={addEducation}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
          >
            + 추가
          </button>
        </div>
        {(data.education || []).length === 0 && (
          <p className="text-gray-400 text-sm">학력을 추가해주세요.</p>
        )}
        {(data.education || []).map((edu, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-center">
            <div className="col-span-3">
              <input
                type="text"
                value={edu.year}
                onChange={(e) => handleEducationChange(index, 'year', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="년도 (예: 2020)"
              />
            </div>
            <div className="col-span-3">
              <input
                type="text"
                value={edu.degree}
                onChange={(e) => handleEducationChange(index, 'degree', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="학위"
              />
            </div>
            <div className="col-span-5">
              <input
                type="text"
                value={edu.school}
                onChange={(e) => handleEducationChange(index, 'school', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="학교명"
              />
            </div>
            <div className="col-span-1">
              <button
                type="button"
                onClick={() => removeEducation(index)}
                className="w-full py-2 text-red-500 hover:text-red-700 text-sm"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Career */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-800">경력</h3>
          <button
            type="button"
            onClick={addCareer}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
          >
            + 추가
          </button>
        </div>
        {(data.career || []).length === 0 && (
          <p className="text-gray-400 text-sm">경력을 추가해주세요.</p>
        )}
        {(data.career || []).map((career, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-center">
            <div className="col-span-3">
              <input
                type="text"
                value={career.period}
                onChange={(e) => handleCareerChange(index, 'period', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="기간 (예: 2020-2023)"
              />
            </div>
            <div className="col-span-4">
              <input
                type="text"
                value={career.organization}
                onChange={(e) => handleCareerChange(index, 'organization', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="기관명"
              />
            </div>
            <div className="col-span-4">
              <input
                type="text"
                value={career.work}
                onChange={(e) => handleCareerChange(index, 'work', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="담당업무"
              />
            </div>
            <div className="col-span-1">
              <button
                type="button"
                onClick={() => removeCareer(index)}
                className="w-full py-2 text-red-500 hover:text-red-700 text-sm"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">주요업적</h3>
        <textarea
          value={data.achievements || ''}
          onChange={(e) => handleChange('achievements', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="수상이력, 전문기술분야 등 주요 업적을 기재해주세요."
        />
      </div>
    </div>
  )
}

export default ProfileForm
