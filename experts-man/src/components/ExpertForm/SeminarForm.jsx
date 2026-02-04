function SeminarForm({ data, onChange }) {
  const handleChange = (field, value) => {
    onChange({ ...data, [field]: value })
  }

  const handleSubtitleChange = (index, value) => {
    const newSubtitles = [...(data.subtitles || ['', '', '', '', ''])]
    newSubtitles[index] = value
    onChange({ ...data, subtitles: newSubtitles })
  }

  const summaryLength = (data.summary || '').length

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800 border-b pb-2">발표요약</h2>
      
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">강연제목 *</label>
        <input
          type="text"
          value={data.title || ''}
          onChange={(e) => handleChange('title', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="강연 제목을 입력하세요"
        />
      </div>

      {/* Subtitles */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">소제목 (최대 5개)</label>
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-gray-500 text-sm w-8">{index + 1}.</span>
              <input
                type="text"
                value={(data.subtitles || [])[index] || ''}
                onChange={(e) => handleSubtitleChange(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`소제목 ${index + 1}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium text-gray-700">요약 *</label>
          <span className={`text-sm ${summaryLength > 500 ? 'text-red-500' : 'text-gray-500'}`}>
            {summaryLength} / 500자
          </span>
        </div>
        <textarea
          value={data.summary || ''}
          onChange={(e) => handleChange('summary', e.target.value)}
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="강연 발표의 내용을 500자 내외로 기재해주세요."
        />
        {summaryLength > 500 && (
          <p className="text-red-500 text-sm mt-1">500자를 초과했습니다.</p>
        )}
      </div>

      {/* Preview */}
      {data.title && (
        <div className="bg-gray-50 rounded-lg p-4 border">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">미리보기</h4>
          <div className="text-center">
            <h3 className="text-lg font-bold text-gray-800 mb-2">{data.title}</h3>
            {(data.subtitles || []).filter(s => s).length > 0 && (
              <div className="space-y-1">
                {(data.subtitles || []).filter(s => s).map((subtitle, index) => (
                  <p key={index} className="text-gray-600 text-sm">{subtitle}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SeminarForm
