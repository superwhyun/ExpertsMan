import SignaturePad from './SignaturePad'

function ConsentForm({ data, onChange, profileData }) {
  const handleChange = (field, value) => {
    onChange({ ...data, [field]: value })
  }

  const currentDate = new Date()
  const year = data.year || currentDate.getFullYear()
  const month = data.month || currentDate.getMonth() + 1
  const day = data.day || currentDate.getDate()

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800 border-b pb-2">개인정보 수집 및 이용 확인서</h2>
      
      {/* Personal Info for Consent */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">성명</label>
          <input
            type="text"
            value={data.name || profileData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">소속기관</label>
          <input
            type="text"
            value={data.organization || profileData.organization || ''}
            onChange={(e) => handleChange('organization', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">직위(직급)</label>
          <input
            type="text"
            value={data.position || profileData.position || ''}
            onChange={(e) => handleChange('position', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
          <input
            type="text"
            value={data.address || profileData.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            placeholder="자택주소 기입"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">은행명</label>
          <input
            type="text"
            value={data.bankName || ''}
            onChange={(e) => handleChange('bankName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            placeholder="본인명의 계좌"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">계좌번호</label>
          <input
            type="text"
            value={data.accountNumber || ''}
            onChange={(e) => handleChange('accountNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
      </div>

      {/* Payment Info */}
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">지급액 (연구원 초빙부서 담당자가 기재)</label>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">수당</label>
            <input
              type="text"
              value={data.allowance || ''}
              onChange={(e) => handleChange('allowance', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">교통비</label>
            <input
              type="text"
              value={data.transportFee || ''}
              onChange={(e) => handleChange('transportFee', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">기타</label>
            <input
              type="text"
              value={data.otherFee || ''}
              onChange={(e) => handleChange('otherFee', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">*계좌에 실제 입금되는 금액은 제세금(8.8%)을 공제한 후 입금됨</p>
      </div>

      {/* Consent Text */}
      <div className="space-y-4 text-sm text-gray-700">
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-semibold mb-2">개인정보 처리 사유</h3>
          <p>전문가활용비 지급 및 원천징수영수증의 발급, 지급명세서 제출 등</p>
        </div>

        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-semibold mb-2">수집·이용하는 근거 및 대상 항목</h3>
          <p className="mb-2">
            소득세법 제145조(기타소득에 대한 원천징수시기와 방법 및 원천징수영수증의 발급), 
            동법 제164조(지급명세서의 제출), 개인정볳호법 제15조제1항제4호(계약의 이행)에 
            의거하여 아래와 같이 개인정보를 수집합니다.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>기본정보 : 성명, 소속기관, 직위(직급), 주소</li>
            <li><strong>금융정보 : 은행명, 계좌번호</strong></li>
          </ul>
        </div>

        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-semibold mb-2">개인정보의 보유 및 이용 기간</h3>
          <p>
            국세기본법 제85조의3(장부 등의 비치와 보존)에 의거 해당국세의 법정신고기한이 지난날부터 
            <strong className="text-blue-600 text-lg"> 5년간 보존</strong>
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-semibold mb-2">고유식별정보 수집 및 이용 확인서</h3>
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">주민등록번호</label>
              <input
                type="text"
                value={data.idNumber || profileData.idNumber || ''}
                onChange={(e) => handleChange('idNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="000000-0000000"
              />
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-semibold mb-2">수집·이용 항목</h3>
          <p>① 고유식별정보 : <strong className="text-blue-600">주민등록번호</strong></p>
        </div>

        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-semibold mb-2">수집·이용 근거</h3>
          <p>
            소득세법 제145조(기타소득에 대한 원천징수시기와 방법 및 원천징수영수증의 발급), 
            동법 제164조(지급명세서의 제출) 개인정보 보호법 제15조제1항제4호(계약의 이행)
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-semibold mb-2">개인정보의 보유 및 이용 기간</h3>
          <p>
            국세기본법 제85조의3(장부 등의 비치와 보존)에 의거 해당국세의 법정신고기한이 지난날부터 
            <strong className="text-blue-600 text-lg"> 5년간 보존</strong>
          </p>
        </div>
      </div>

      {/* Agreement Text */}
      <div className="text-center py-4 border-t">
        <p className="text-gray-700 mb-4">
          위와 같이 개인정보 및 고유식별정보를 수집·활용하는 것을 확인하였으며<br />
          본 수당 지급 목적의 회의 또는 심사 등에 참가하였음을 확인합니다.
        </p>
        
        {/* Date */}
        <div className="flex justify-center items-center gap-2 mb-4">
          <input
            type="number"
            value={year}
            onChange={(e) => handleChange('year', e.target.value)}
            className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
          />
          <span>년</span>
          <input
            type="number"
            value={month}
            onChange={(e) => handleChange('month', e.target.value)}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
          />
          <span>월</span>
          <input
            type="number"
            value={day}
            onChange={(e) => handleChange('day', e.target.value)}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
          />
          <span>일</span>
        </div>
      </div>

      {/* Signature */}
      <div className="border rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">서명 *</label>
        <SignaturePad
          value={data.signature}
          onChange={(signature) => handleChange('signature', signature)}
        />
      </div>

      <div className="text-center text-gray-600 font-medium">
        한국전자통신연구원장 귀하
      </div>
    </div>
  )
}

export default ConsentForm
