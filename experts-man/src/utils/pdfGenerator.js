import jsPDF from 'jspdf'

// 한글 폰트 로드 상태
let fontLoaded = false
let fontCache = null

// Noto Sans KR 폰트 로드 함수
async function loadKoreanFont(pdf) {
  if (fontLoaded && fontCache) {
    pdf.addFileToVFS('NotoSansKR.ttf', fontCache)
    pdf.addFont('NotoSansKR.ttf', 'NotoSansKR', 'normal')
    pdf.setFont('NotoSansKR', 'normal')
    return
  }

  try {
    const fontUrl = 'https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuozeLTq8H4hfeE.ttf'

    const response = await fetch(fontUrl)
    if (!response.ok) throw new Error('Font fetch failed')

    const arrayBuffer = await response.arrayBuffer()

    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    )

    fontCache = base64

    pdf.addFileToVFS('NotoSansKR.ttf', base64)
    pdf.addFont('NotoSansKR.ttf', 'NotoSansKR', 'normal')
    pdf.setFont('NotoSansKR', 'normal')

    fontLoaded = true
  } catch (error) {
    console.warn('한글 폰트 로드 실패, 기본 폰트 사용:', error)
  }
}

// 모던한 색상 팔레트 (시인성 개선)
const COLORS = {
  // 메인 컬러
  primary: [30, 64, 175],       // 딥 블루
  primaryLight: [59, 130, 246], // 라이트 블루
  accent: [6, 95, 70],          // 딥 그린

  // 배경
  headerBg: [241, 245, 249],    // 슬레이트 100
  sectionBg: [250, 250, 252],   // 더 연한 배경
  cardBg: [255, 255, 255],      // 흰색

  // 테두리
  border: [203, 213, 225],      // 슬레이트 300 (더 진하게)
  borderLight: [226, 232, 240], // 슬레이트 200

  // 텍스트 (시인성 개선 - 더 진하게)
  text: [0, 0, 0],              // 순수 검정
  textSecondary: [30, 41, 59],  // 슬레이트 800 (더 진하게)
  textMuted: [71, 85, 105],     // 슬레이트 500

  // 강조
  highlightBg: [254, 243, 199], // 앰버 100
  highlightBorder: [252, 211, 77], // 앰버 300

  // 푸터
  footerBg: [248, 250, 252],
  footerText: [71, 85, 105]
}

class PDFDocument {
  constructor() {
    this.pdf = new jsPDF('p', 'mm', 'a4')
    this.pageWidth = 210
    this.pageHeight = 297
    this.margin = { top: 18, right: 15, bottom: 15, left: 15 }
    this.contentWidth = this.pageWidth - this.margin.left - this.margin.right
    this.contentHeight = this.pageHeight - this.margin.top - this.margin.bottom
    this.y = this.margin.top
    this.fontName = 'helvetica'
    this.pageNumber = 1
    this.totalPages = 3
    this.documentTitle = '전문가 정보'
  }

  setFontName(name) {
    this.fontName = name
  }

  applyFont() {
    this.pdf.setFont(this.fontName, 'normal')
  }

  // 페이지 오버플로우 체크 및 자동 페이지 추가
  checkPageOverflow(requiredHeight = 15) {
    const maxY = this.pageHeight - this.margin.bottom - 10
    if (this.y + requiredHeight > maxY) {
      this.addPage()
      return true
    }
    return false
  }

  // 페이지 헤더 그리기
  drawPageHeader() {
    // 상단 라인
    this.pdf.setDrawColor(...COLORS.primary)
    this.pdf.setLineWidth(0.8)
    this.pdf.line(this.margin.left, 12, this.pageWidth - this.margin.right, 12)

    // 문서 제목 (상단 좌측)
    this.applyFont()
    this.pdf.setFontSize(8)
    this.pdf.setTextColor(...COLORS.textMuted)
    this.pdf.text(this.documentTitle, this.margin.left, 9)

    // 페이지 번호 (상단 우측)
    this.pdf.text(
      `${this.pageNumber} / ${this.totalPages}`,
      this.pageWidth - this.margin.right,
      9,
      { align: 'right' }
    )
  }

  // 페이지 푸터 그리기
  drawPageFooter() {
    const footerY = this.pageHeight - 12

    // 하단 라인
    this.pdf.setDrawColor(...COLORS.border)
    this.pdf.setLineWidth(0.3)
    this.pdf.line(this.margin.left, footerY - 3, this.pageWidth - this.margin.right, footerY - 3)

    // 푸터 텍스트
    this.applyFont()
    this.pdf.setFontSize(7)
    this.pdf.setTextColor(...COLORS.footerText)
    this.pdf.text('한국전자통신연구원', this.margin.left, footerY)

    const today = new Date()
    const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`
    this.pdf.text(dateStr, this.pageWidth - this.margin.right, footerY, { align: 'right' })
  }

  // 페이지 제목 (큰 제목)
  addTitle(text) {
    this.checkPageOverflow(15)

    // 제목 배경 박스
    const titleHeight = 10
    this.pdf.setFillColor(...COLORS.primary)
    this.pdf.roundedRect(this.margin.left, this.y, this.contentWidth, titleHeight, 1.5, 1.5, 'F')

    // 제목 텍스트
    this.applyFont()
    this.pdf.setFontSize(12)
    this.pdf.setTextColor(255, 255, 255)
    this.pdf.text(text, this.pageWidth / 2, this.y + 7, { align: 'center' })

    this.y += titleHeight + 6
  }

  // 섹션 제목
  addSectionTitle(text) {
    this.checkPageOverflow(10)

    // 섹션 라인 + 원형 마커
    const markerX = this.margin.left
    const markerY = this.y + 2.5

    this.pdf.setFillColor(...COLORS.primary)
    this.pdf.circle(markerX + 1.5, markerY, 1.5, 'F')

    // 제목 텍스트
    this.applyFont()
    this.pdf.setFontSize(10)
    this.pdf.setTextColor(...COLORS.text)
    this.pdf.text(text, this.margin.left + 6, this.y + 4)

    // 하단 라인
    this.pdf.setDrawColor(...COLORS.borderLight)
    this.pdf.setLineWidth(0.4)
    this.pdf.line(this.margin.left + 6 + this.pdf.getTextWidth(text) + 2, this.y + 2.5, this.pageWidth - this.margin.right, this.y + 2.5)

    this.y += 8
  }

  // 테이블 그리기 (모던 스타일)
  drawTable(headers, rows, options = {}) {
    const { colWidths, cellPadding = 3 } = options
    const rowHeight = 8
    const totalWidth = this.contentWidth
    const widths = colWidths || headers.map(() => totalWidth / headers.length)
    const cornerRadius = 1.5

    // 전체 테이블 높이 계산
    const hasHeaders = headers.length > 0 && headers[0] !== null
    const tableHeight = (hasHeaders ? rowHeight : 0) + rows.length * rowHeight

    // 페이지 오버플로우 체크
    this.checkPageOverflow(tableHeight + 5)

    const startY = this.y

    // 테이블 배경 (둥근 모서리)
    this.pdf.setFillColor(255, 255, 255)
    this.pdf.roundedRect(this.margin.left, this.y, totalWidth, tableHeight, cornerRadius, cornerRadius, 'F')

    // 헤더 그리기
    if (hasHeaders) {
      // 헤더 배경 (상단만 둥근 모서리)
      this.pdf.setFillColor(...COLORS.headerBg)
      this.pdf.roundedRect(this.margin.left, this.y, totalWidth, rowHeight, cornerRadius, cornerRadius, 'F')
      // 하단 채우기 (둥근 부분 덮기)
      this.pdf.rect(this.margin.left, this.y + cornerRadius, totalWidth, rowHeight - cornerRadius, 'F')

      let x = this.margin.left
      this.applyFont()
      this.pdf.setFontSize(9)
      this.pdf.setTextColor(...COLORS.textSecondary)

      headers.forEach((header, i) => {
        if (header) {
          this.pdf.text(header, x + cellPadding, this.y + 5.5)
        }
        x += widths[i]
      })
      this.y += rowHeight
    }

    // 데이터 행 그리기
    rows.forEach((row, rowIndex) => {
      // 페이지 오버플로우 체크 (각 행마다)
      if (this.checkPageOverflow(rowHeight)) {
        // 새 페이지에서 테이블 계속
      }

      let x = this.margin.left
      const isEvenRow = rowIndex % 2 === 0

      // 줄무늬 배경
      if (!isEvenRow && options.stripedRows) {
        this.pdf.setFillColor(...COLORS.sectionBg)
        this.pdf.rect(this.margin.left, this.y, totalWidth, rowHeight, 'F')
      }

      this.applyFont()
      this.pdf.setFontSize(9)
      this.pdf.setTextColor(...COLORS.text)

      row.forEach((cell, i) => {
        const cellContent = cell?.toString() || ''
        const cellOptions = options.cellStyles?.[rowIndex]?.[i] || {}

        if (cellOptions.bg) {
          this.pdf.setFillColor(...cellOptions.bg)
          this.pdf.rect(x, this.y, widths[i], rowHeight, 'F')
        }

        // 텍스트가 셀 너비를 초과하면 자르기
        const maxWidth = widths[i] - (cellPadding * 2)
        let displayText = cellContent
        while (this.pdf.getTextWidth(displayText) > maxWidth && displayText.length > 0) {
          displayText = displayText.slice(0, -1)
        }
        if (displayText !== cellContent && displayText.length > 0) {
          displayText = displayText.slice(0, -1) + '…'
        }

        this.pdf.text(displayText, x + cellPadding, this.y + 5.5)
        x += widths[i]
      })

      this.y += rowHeight
    })

    // 테이블 테두리 (둥근 모서리)
    this.pdf.setDrawColor(...COLORS.border)
    this.pdf.setLineWidth(0.4)
    this.pdf.roundedRect(this.margin.left, startY, totalWidth, this.y - startY, cornerRadius, cornerRadius, 'S')

    // 내부 가로선 (얇게)
    this.pdf.setLineWidth(0.2)
    this.pdf.setDrawColor(...COLORS.borderLight)
    let currentY = startY
    const totalRows = (hasHeaders ? 1 : 0) + rows.length
    for (let i = 0; i < totalRows - 1; i++) {
      currentY += rowHeight
      this.pdf.line(this.margin.left + 1, currentY, this.margin.left + totalWidth - 1, currentY)
    }

    // 세로선
    let x = this.margin.left
    for (let i = 0; i < widths.length - 1; i++) {
      x += widths[i]
      this.pdf.line(x, startY + 1, x, this.y - 1)
    }

    this.y += 4
  }

  // 키-값 테이블 (양식용) - 모던 스타일
  drawFormTable(data, options = {}) {
    const { labelWidth = 32 } = options
    const rowHeight = 8
    const valueWidth = this.contentWidth - labelWidth
    const cornerRadius = 1.5

    // 전체 높이 계산
    const totalHeight = data.length * rowHeight
    this.checkPageOverflow(totalHeight + 5)

    const startY = this.y

    data.forEach((row, index) => {
      this.checkPageOverflow(rowHeight)

      const isFirst = index === 0
      const isLast = index === data.length - 1

      // 라벨 배경
      this.pdf.setFillColor(...(row.labelBg || COLORS.headerBg))
      if (isFirst && isLast) {
        this.pdf.roundedRect(this.margin.left, this.y, labelWidth, rowHeight, cornerRadius, cornerRadius, 'F')
      } else if (isFirst) {
        this.pdf.roundedRect(this.margin.left, this.y, labelWidth, rowHeight, cornerRadius, cornerRadius, 'F')
        this.pdf.rect(this.margin.left, this.y + cornerRadius, labelWidth, rowHeight - cornerRadius, 'F')
        this.pdf.rect(this.margin.left + labelWidth - cornerRadius, this.y, cornerRadius, rowHeight, 'F')
      } else if (isLast) {
        this.pdf.rect(this.margin.left, this.y, labelWidth, rowHeight - cornerRadius, 'F')
        this.pdf.roundedRect(this.margin.left, this.y, labelWidth, rowHeight, cornerRadius, cornerRadius, 'F')
        this.pdf.rect(this.margin.left + labelWidth - cornerRadius, this.y, cornerRadius, rowHeight, 'F')
      } else {
        this.pdf.rect(this.margin.left, this.y, labelWidth, rowHeight, 'F')
      }

      // 값 배경
      if (row.valueBg) {
        this.pdf.setFillColor(...row.valueBg)
        this.pdf.rect(this.margin.left + labelWidth, this.y, valueWidth, rowHeight, 'F')
      }

      // 내부 구분선
      this.pdf.setDrawColor(...COLORS.borderLight)
      this.pdf.setLineWidth(0.2)
      this.pdf.line(this.margin.left + labelWidth, this.y, this.margin.left + labelWidth, this.y + rowHeight)

      // 텍스트
      this.applyFont()
      this.pdf.setFontSize(9)
      this.pdf.setTextColor(...COLORS.textSecondary)
      this.pdf.text(row.label, this.margin.left + 3, this.y + 5.5)

      this.pdf.setTextColor(...COLORS.text)
      this.pdf.text(row.value || '', this.margin.left + labelWidth + 4, this.y + 5.5)

      this.y += rowHeight
    })

    // 외곽 테두리
    this.pdf.setDrawColor(...COLORS.border)
    this.pdf.setLineWidth(0.4)
    this.pdf.roundedRect(this.margin.left, startY, this.contentWidth, this.y - startY, cornerRadius, cornerRadius, 'S')

    this.y += 4
  }

  // 2열 키-값 테이블 (모던 스타일)
  drawTwoColumnFormTable(rows) {
    const rowHeight = 8
    const labelWidth = 24
    const halfWidth = this.contentWidth / 2
    const cornerRadius = 1.5

    const totalHeight = rows.length * rowHeight
    this.checkPageOverflow(totalHeight + 5)

    const startY = this.y

    rows.forEach((row) => {
      this.checkPageOverflow(rowHeight)

      // 왼쪽 라벨 배경
      this.pdf.setFillColor(...COLORS.headerBg)
      this.pdf.rect(this.margin.left, this.y, labelWidth, rowHeight, 'F')

      // 오른쪽 라벨 배경
      this.pdf.rect(this.margin.left + halfWidth, this.y, labelWidth, rowHeight, 'F')

      // 내부 구분선
      this.pdf.setDrawColor(...COLORS.borderLight)
      this.pdf.setLineWidth(0.2)
      this.pdf.line(this.margin.left + labelWidth, this.y, this.margin.left + labelWidth, this.y + rowHeight)
      this.pdf.line(this.margin.left + halfWidth, this.y, this.margin.left + halfWidth, this.y + rowHeight)
      this.pdf.line(this.margin.left + halfWidth + labelWidth, this.y, this.margin.left + halfWidth + labelWidth, this.y + rowHeight)

      // 텍스트
      this.applyFont()
      this.pdf.setFontSize(9)

      this.pdf.setTextColor(...COLORS.textSecondary)
      this.pdf.text(row[0].label, this.margin.left + 3, this.y + 5.5)
      this.pdf.text(row[1].label, this.margin.left + halfWidth + 3, this.y + 5.5)

      this.pdf.setTextColor(...COLORS.text)
      this.pdf.text(row[0].value || '', this.margin.left + labelWidth + 3, this.y + 5.5)
      this.pdf.text(row[1].value || '', this.margin.left + halfWidth + labelWidth + 3, this.y + 5.5)

      this.y += rowHeight
    })

    // 외곽 테두리
    this.pdf.setDrawColor(...COLORS.border)
    this.pdf.setLineWidth(0.4)
    this.pdf.roundedRect(this.margin.left, startY, this.contentWidth, this.y - startY, cornerRadius, cornerRadius, 'S')

    this.y += 4
  }

  // 전체 너비 행 추가 (모던 스타일)
  drawFullWidthRow(label, value, options = {}) {
    const rowHeight = 8
    const labelWidth = options.labelWidth || 24
    const cornerRadius = 1.5

    this.checkPageOverflow(rowHeight + 5)

    // 라벨 배경
    this.pdf.setFillColor(...COLORS.headerBg)
    this.pdf.roundedRect(this.margin.left, this.y, labelWidth, rowHeight, cornerRadius, 0, 'F')
    this.pdf.rect(this.margin.left + labelWidth - cornerRadius, this.y, cornerRadius, rowHeight, 'F')

    // 내부 구분선
    this.pdf.setDrawColor(...COLORS.borderLight)
    this.pdf.setLineWidth(0.2)
    this.pdf.line(this.margin.left + labelWidth, this.y, this.margin.left + labelWidth, this.y + rowHeight)

    // 외곽 테두리
    this.pdf.setDrawColor(...COLORS.border)
    this.pdf.setLineWidth(0.4)
    this.pdf.roundedRect(this.margin.left, this.y, this.contentWidth, rowHeight, cornerRadius, cornerRadius, 'S')

    // 텍스트
    this.applyFont()
    this.pdf.setFontSize(9)
    this.pdf.setTextColor(...COLORS.textSecondary)
    this.pdf.text(label, this.margin.left + 3, this.y + 5.5)
    this.pdf.setTextColor(...COLORS.text)
    this.pdf.text(value || '', this.margin.left + labelWidth + 4, this.y + 5.5)

    this.y += rowHeight + 4
  }

  // 텍스트 박스 (긴 텍스트용) - 모던 스타일
  drawTextBox(text, minHeight = 25) {
    const lineHeight = 4.5
    const padding = 4
    const cornerRadius = 2

    this.applyFont()
    this.pdf.setFontSize(9)
    const lines = this.pdf.splitTextToSize(text || '', this.contentWidth - (padding * 2))
    const textHeight = Math.max(lines.length * lineHeight + (padding * 2), minHeight)

    this.checkPageOverflow(textHeight + 5)

    // 배경
    this.pdf.setFillColor(...COLORS.sectionBg)
    this.pdf.roundedRect(this.margin.left, this.y, this.contentWidth, textHeight, cornerRadius, cornerRadius, 'F')

    // 테두리
    this.pdf.setDrawColor(...COLORS.border)
    this.pdf.setLineWidth(0.4)
    this.pdf.roundedRect(this.margin.left, this.y, this.contentWidth, textHeight, cornerRadius, cornerRadius, 'S')

    // 텍스트
    this.pdf.setTextColor(...COLORS.text)
    this.pdf.text(lines, this.margin.left + padding, this.y + padding + 3)

    this.y += textHeight + 4
  }

  // 줄바꿈
  addSpace(height = 3) {
    this.y += height
  }

  // 새 페이지
  addPage() {
    this.drawPageFooter()
    this.pdf.addPage()
    this.pageNumber++
    this.y = this.margin.top
    this.drawPageHeader()
  }

  // 서명 이미지 추가
  addSignature(signatureData, label = '(서명)') {
    this.checkPageOverflow(18)

    if (signatureData) {
      try {
        this.pdf.addImage(signatureData, 'PNG', this.pageWidth - 55, this.y - 3, 35, 18)
      } catch (e) {
        console.warn('서명 이미지 추가 실패:', e)
      }
    }
    this.applyFont()
    this.pdf.setFontSize(9)
    this.pdf.setTextColor(...COLORS.text)
    this.pdf.text(label, this.pageWidth - this.margin.right - 12, this.y + 10)
  }

  // 중앙 정렬 텍스트
  addCenteredText(text, fontSize = 10) {
    this.checkPageOverflow(fontSize + 3)

    this.applyFont()
    this.pdf.setFontSize(fontSize)
    this.pdf.setTextColor(...COLORS.text)
    this.pdf.text(text, this.pageWidth / 2, this.y, { align: 'center' })
    this.y += fontSize * 0.4 + 2
  }

  // 강조 텍스트 박스 (알림용)
  addHighlightBox(text, options = {}) {
    const padding = 3
    const cornerRadius = 1.5

    this.applyFont()
    this.pdf.setFontSize(8)
    const lines = this.pdf.splitTextToSize(text, this.contentWidth - (padding * 2))
    const boxHeight = lines.length * 4 + (padding * 2)

    this.checkPageOverflow(boxHeight + 3)

    // 배경
    this.pdf.setFillColor(...(options.bg || COLORS.highlightBg))
    this.pdf.roundedRect(this.margin.left, this.y, this.contentWidth, boxHeight, cornerRadius, cornerRadius, 'F')

    // 왼쪽 강조 라인
    this.pdf.setFillColor(...(options.accent || COLORS.highlightBorder))
    this.pdf.rect(this.margin.left, this.y, 2.5, boxHeight, 'F')

    // 텍스트
    this.pdf.setTextColor(...COLORS.text)
    this.pdf.text(lines, this.margin.left + padding + 2, this.y + padding + 2.5)

    this.y += boxHeight + 3
  }

  // 구분선
  addDivider() {
    this.checkPageOverflow(6)
    this.pdf.setDrawColor(...COLORS.borderLight)
    this.pdf.setLineWidth(0.3)
    this.pdf.line(this.margin.left + 15, this.y, this.pageWidth - this.margin.right - 15, this.y)
    this.y += 4
  }

  // 저장
  save(filename) {
    this.drawPageFooter()
    this.pdf.save(filename)
  }
}

// 프로필 페이지 생성
function generateProfilePage(doc, profile) {
  doc.drawPageHeader()
  doc.addTitle('발표자 인적사항')

  // 기본 정보 테이블
  doc.drawTwoColumnFormTable([
    [{ label: '성명', value: profile.name }, { label: '주민번호', value: profile.idNumber }],
    [{ label: '소속', value: profile.organization }, { label: '부서', value: profile.department }],
  ])

  doc.drawFullWidthRow('주소', profile.address)

  doc.drawTwoColumnFormTable([
    [{ label: '전화번호', value: profile.phone }, { label: '이메일', value: profile.email }],
  ])

  // 학력
  doc.addSectionTitle('학력')
  const educationRows = (profile.education || []).map(edu => [edu.year, edu.degree, edu.school])
  if (educationRows.length === 0) {
    educationRows.push(['-', '-', '-'])
  }
  doc.drawTable(['년도', '학위', '학교'], educationRows, {
    colWidths: [45, 60, 75],
    stripedRows: true
  })

  // 경력
  doc.addSectionTitle('경력')
  const careerRows = (profile.career || []).map(c => [c.period, c.organization, c.work])
  if (careerRows.length === 0) {
    careerRows.push(['-', '-', '-'])
  }
  doc.drawTable(['기간', '기관', '업무'], careerRows, {
    colWidths: [55, 65, 60],
    stripedRows: true
  })

  // 주요업적
  doc.addSectionTitle('주요업적')
  doc.drawTextBox(profile.achievements, 35)
}

// 세미나 페이지 생성
function generateSeminarPage(doc, seminar) {
  doc.drawPageHeader()
  doc.addTitle('발표요약')

  // 강연제목
  doc.drawFormTable([
    { label: '강연제목', value: seminar.title }
  ], { labelWidth: 25 })

  // 소제목
  doc.addSectionTitle('소제목')
  const subtitles = (seminar.subtitles || []).filter(s => s)
  const subtitleRows = subtitles.length > 0
    ? subtitles.map((s, i) => [`${i + 1}`, s])
    : [['', '소제목 없음']]
  doc.drawTable([null], subtitleRows, {
    colWidths: [15, 165]
  })

  // 요약
  doc.addSectionTitle('요약')
  doc.drawTextBox(seminar.summary, 70)
}

// 동의서 페이지 생성
function generateConsentPage(doc, consent, profile) {
  doc.drawPageHeader()
  doc.addTitle('개인정보 수집 및 이용 확인서')

  doc.addCenteredText('〈국내 전문가 수당지급〉', 9)
  doc.addSpace(2)

  // 기본 정보
  const formData = [
    { label: '성명', value: consent.name || profile.name, labelBg: COLORS.highlightBg },
    { label: '소속기관', value: consent.organization || profile.organization, labelBg: COLORS.highlightBg },
    { label: '직위(직급)', value: consent.position || profile.position, labelBg: COLORS.highlightBg },
    { label: '주소', value: consent.address || profile.address, labelBg: COLORS.highlightBg },
    { label: '은행명', value: consent.bankName, labelBg: COLORS.highlightBg },
    { label: '계좌번호', value: consent.accountNumber, labelBg: COLORS.highlightBg },
  ]
  doc.drawFormTable(formData, { labelWidth: 25 })

  // 지급액 테이블
  doc.drawTable(['지급액', '수당', '교통비', '기타'], [
    ['', consent.allowance || '', consent.transportFee || '', consent.otherFee || '']
  ], {
    colWidths: [25, 55, 50, 50]
  })

  // 안내 메시지
  doc.addHighlightBox('계좌에 실제 입금되는 금액은 제세금(8.8%)을 공제한 후 입금됩니다.')

  // 개인정보 처리 안내
  doc.drawFormTable([
    { label: '개인정보 처리 사유', value: '전문가활용비 지급 및 원천징수영수증의 발급, 지급명세서 제출 등' },
    { label: '수집·이용 근거', value: '소득세법 제145조, 제164조, 개인정보보호법 제15조제1항제4호' },
    { label: '보유 및 이용 기간', value: '법정신고기한이 지난날부터 5년간 보존' },
  ], { labelWidth: 35 })

  doc.addDivider()

  // 고유식별정보
  doc.addCenteredText('고유식별정보 수집 및 이용 확인서', 10)
  doc.addSpace(2)

  doc.drawFormTable([
    { label: '주민등록번호', value: consent.idNumber || profile.idNumber, labelBg: COLORS.highlightBg },
    { label: '처리 사유', value: '전문가활용비 지급 및 원천징수영수증의 발급' },
    { label: '수집·이용 항목', value: '고유식별정보: 주민등록번호' },
    { label: '보유 기간', value: '법정신고기한이 지난날부터 5년간 보존' },
  ], { labelWidth: 30 })

  doc.addSpace(4)

  // 확인 문구
  doc.addCenteredText('위와 같이 개인정보 및 고유식별정보를 수집·활용하는 것을 확인하였으며', 9)
  doc.addCenteredText('본 수당 지급 목적의 회의 또는 심사 등에 참가하였음을 확인합니다.', 9)
  doc.addSpace(3)
  doc.addCenteredText(`${consent.year}년 ${consent.month}월 ${consent.day}일`, 10)

  doc.addSpace(4)

  // 서명
  doc.applyFont()
  doc.pdf.setFontSize(10)
  doc.pdf.setTextColor(...COLORS.text)
  doc.pdf.text(`성명: ${consent.name || profile.name}`, doc.pageWidth - 75, doc.y)
  doc.addSignature(consent.signature)

  doc.addSpace(6)
  doc.addCenteredText('한국전자통신연구원장 귀하', 10)
}

export async function generateMultiPagePDF(_pageIds, filename, formData) {
  const doc = new PDFDocument()

  // 한글 폰트 로드
  await loadKoreanFont(doc.pdf)
  if (fontLoaded) {
    doc.setFontName('NotoSansKR')
  }

  const { profile, seminar, consent } = formData

  // 페이지 1: 프로필
  generateProfilePage(doc, profile)

  // 페이지 2: 세미나
  doc.addPage()
  generateSeminarPage(doc, seminar)

  // 페이지 3: 동의서
  doc.addPage()
  generateConsentPage(doc, consent, profile)

  doc.save(filename)
  return doc.pdf
}

// 하위 호환성을 위한 단일 페이지 함수
export async function generatePDF(_elementId, _filename = 'document.pdf') {
  console.warn('generatePDF는 더 이상 사용되지 않습니다. generateMultiPagePDF를 사용하세요.')
}
