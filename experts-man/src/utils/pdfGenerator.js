import jsPDF from 'jspdf'

// 한글 폰트 로드 상태
let fontLoaded = false
let fontCache = null

// Noto Sans KR Regular 폰트 로드 함수
async function loadKoreanFont(pdf) {
  if (fontLoaded && fontCache) {
    pdf.addFileToVFS('NotoSansKR.ttf', fontCache)
    pdf.addFont('NotoSansKR.ttf', 'NotoSansKR', 'normal')
    pdf.setFont('NotoSansKR', 'normal')
    return
  }

  try {
    // Noto Sans KR Regular (400) - 가독성이 좋은 웨이트
    const fontUrl = 'https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLTq8H4hfeE.ttf'

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

// 동의서 페이지 생성 - 모던 스타일 (1, 2페이지와 동일한 스타일)
function generateConsentPage(doc, consent, profile) {
  doc.drawPageHeader()

  const pdf = doc.pdf
  const startX = doc.margin.left
  const contentWidth = doc.contentWidth
  const cornerRadius = 1.5

  // 셀 그리기 함수 (모던 스타일)
  const drawCell = (x, y, w, h, options = {}) => {
    if (options.fill) {
      pdf.setFillColor(...options.fill)
      pdf.rect(x, y, w, h, 'F')
    }
    pdf.setDrawColor(...COLORS.border)
    pdf.setLineWidth(0.3)
    pdf.rect(x, y, w, h, 'S')
  }

  // 텍스트 그리기 함수
  const drawText = (text, x, y, options = {}) => {
    doc.applyFont()
    pdf.setFontSize(options.fontSize || 10)
    if (options.color) {
      pdf.setTextColor(...options.color)
    } else {
      pdf.setTextColor(...COLORS.text)
    }
    if (options.align === 'center') {
      pdf.text(text, x, y, { align: 'center' })
    } else {
      pdf.text(text, x, y)
    }
  }

  // ========== 제1섹션: 개인정보 수집 및 이용 확인서 ==========
  let y = doc.y

  // 섹션 제목
  const sectionTitleHeight = 10
  pdf.setFillColor(...COLORS.primary)
  pdf.roundedRect(startX, y, contentWidth, sectionTitleHeight, cornerRadius, cornerRadius, 'F')
  drawText('개인정보 수집 및 이용 확인서', startX + contentWidth / 2, y + 7, { fontSize: 13, align: 'center', color: [255, 255, 255] })
  y += sectionTitleHeight + 2

  // 레이블 열 너비
  const labelWidth = 34
  const valueWidth = contentWidth - labelWidth
  const rowHeight = 7

  // 성 명
  drawCell(startX, y, labelWidth, rowHeight, { fill: COLORS.headerBg })
  drawCell(startX + labelWidth, y, valueWidth, rowHeight)
  drawText('성  명', startX + labelWidth / 2, y + 5, { fontSize: 10, align: 'center' })
  drawText(consent.name || profile.name || '', startX + labelWidth + 3, y + 5, { fontSize: 10 })
  y += rowHeight

  // 소속기관
  drawCell(startX, y, labelWidth, rowHeight, { fill: COLORS.headerBg })
  drawCell(startX + labelWidth, y, valueWidth, rowHeight)
  drawText('소속기관', startX + labelWidth / 2, y + 5, { fontSize: 10, align: 'center' })
  drawText(consent.organization || profile.organization || '', startX + labelWidth + 3, y + 5, { fontSize: 10 })
  y += rowHeight

  // 직위(직급)
  drawCell(startX, y, labelWidth, rowHeight, { fill: COLORS.headerBg })
  drawCell(startX + labelWidth, y, valueWidth, rowHeight)
  drawText('직위(직급)', startX + labelWidth / 2, y + 5, { fontSize: 10, align: 'center' })
  drawText(consent.position || profile.position || '', startX + labelWidth + 3, y + 5, { fontSize: 10 })
  y += rowHeight

  // 주 소
  const addressHeight = 9
  drawCell(startX, y, labelWidth, addressHeight, { fill: COLORS.headerBg })
  drawCell(startX + labelWidth, y, valueWidth, addressHeight)
  drawText('주  소', startX + labelWidth / 2, y + 4, { fontSize: 10, align: 'center' })
  drawText('(자택주소)', startX + labelWidth / 2, y + 7.5, { align: 'center', fontSize: 7 })
  drawText(consent.address || profile.address || '', startX + labelWidth + 3, y + 5.5, { fontSize: 10 })
  y += addressHeight

  // 은행명
  drawCell(startX, y, labelWidth, addressHeight, { fill: COLORS.headerBg })
  drawCell(startX + labelWidth, y, valueWidth, addressHeight)
  drawText('은행명', startX + labelWidth / 2, y + 4, { fontSize: 10, align: 'center' })
  drawText('(본인계좌)', startX + labelWidth / 2, y + 7.5, { align: 'center', fontSize: 7 })
  drawText(consent.bankName || '', startX + labelWidth + 3, y + 5.5, { fontSize: 10 })
  y += addressHeight

  // 계좌번호
  drawCell(startX, y, labelWidth, rowHeight, { fill: COLORS.headerBg })
  drawCell(startX + labelWidth, y, valueWidth, rowHeight)
  drawText('계좌번호', startX + labelWidth / 2, y + 5, { fontSize: 10, align: 'center' })
  drawText(consent.accountNumber || '', startX + labelWidth + 3, y + 5, { fontSize: 10 })
  y += rowHeight

  // 지급액 (복합 테이블) - 수당|금액|교통비|빈칸|기타|빈칸 구조
  const paymentHeight = 20
  const headerRowHeight = 7
  const valueRowHeight = paymentHeight - headerRowHeight

  // 지급액 라벨
  drawCell(startX, y, labelWidth, paymentHeight, { fill: COLORS.headerBg })
  drawText('지급액', startX + labelWidth / 2, y + 6, { fontSize: 10, align: 'center' })
  drawText('(연구원 초빙부서', startX + labelWidth / 2, y + 10, { align: 'center', fontSize: 6.5 })
  drawText('담당자가 기재)', startX + labelWidth / 2, y + 13.5, { align: 'center', fontSize: 6.5 })

  // 지급액 내부 테이블 - 6열: 수당|금액|교통비|빈칸|기타|빈칸
  const innerX = startX + labelWidth
  const innerWidth = valueWidth
  const colWidth = innerWidth / 6

  // 헤더 행: 수당 | (금액) | 교통비 | (빈칸) | 기타 | (빈칸)
  drawCell(innerX, y, colWidth, headerRowHeight, { fill: COLORS.headerBg })
  drawCell(innerX + colWidth, y, colWidth, headerRowHeight)
  drawCell(innerX + colWidth * 2, y, colWidth, headerRowHeight, { fill: COLORS.headerBg })
  drawCell(innerX + colWidth * 3, y, colWidth, headerRowHeight)
  drawCell(innerX + colWidth * 4, y, colWidth, headerRowHeight, { fill: COLORS.headerBg })
  drawCell(innerX + colWidth * 5, y, colWidth, headerRowHeight)

  drawText('수당', innerX + colWidth / 2, y + 5, { align: 'center', fontSize: 10 })
  // 수당 (consent.allowance 사용)
  const allowanceAmount = consent.allowance || ''
  drawText(allowanceAmount, innerX + colWidth + colWidth / 2, y + 5, { align: 'center', fontSize: 10 })
  drawText('교통비', innerX + colWidth * 2 + colWidth / 2, y + 5, { align: 'center', fontSize: 10 })
  drawText(consent.transportFee || '', innerX + colWidth * 3 + colWidth / 2, y + 5, { align: 'center', fontSize: 10 })
  drawText('기타', innerX + colWidth * 4 + colWidth / 2, y + 5, { align: 'center', fontSize: 10 })
  drawText(consent.otherFee || '', innerX + colWidth * 5 + colWidth / 2, y + 5, { align: 'center', fontSize: 10 })

  // 안내 메시지 행
  const noteY = y + headerRowHeight
  drawCell(innerX, noteY, innerWidth, valueRowHeight)
  drawText('*계좌에 실제 입금되는 금액은 제세금(8.8%)을 공제한 후 입금됨', innerX + 2, noteY + valueRowHeight - 3, { fontSize: 8 })
  y += paymentHeight

  // 개인정보 처리 사유
  const reasonHeight = 9
  drawCell(startX, y, labelWidth, reasonHeight, { fill: COLORS.headerBg })
  drawCell(startX + labelWidth, y, valueWidth, reasonHeight)
  drawText('개인정보', startX + labelWidth / 2, y + 4, { align: 'center', fontSize: 9 })
  drawText('처리 사유', startX + labelWidth / 2, y + 7.5, { align: 'center', fontSize: 9 })
  drawText('전문가활용비 지급 및 원천징수영수증의 발급, 지급명세서 제출 등', startX + labelWidth + 3, y + 5.5, { fontSize: 9 })
  y += reasonHeight

  // 수집·이용하는 근거 및 대상 항목
  const basisHeight = 26
  drawCell(startX, y, labelWidth, basisHeight, { fill: COLORS.headerBg })
  drawCell(startX + labelWidth, y, valueWidth, basisHeight)
  drawText('수집·이용하는', startX + labelWidth / 2, y + 9, { align: 'center', fontSize: 9 })
  drawText('근거 및', startX + labelWidth / 2, y + 13, { align: 'center', fontSize: 9 })
  drawText('대상 항목', startX + labelWidth / 2, y + 17, { align: 'center', fontSize: 9 })

  const basisText = [
    '소득세법 제145조(기타소득에 대한 원천징수시기와 방법 및 원천징수영수증의',
    '발급), 동법 제164조(지급명세서의 제출), 개인정보 보호법 제15조제1항',
    '제4호(계약의 이행)에 의거하여 아래와 같이 개인정보를 수집합니다.',
    '① 기본정보 : 성명, 소속기관, 직위(직급), 주소'
  ]
  basisText.forEach((line, i) => {
    drawText(line, startX + labelWidth + 3, y + 4 + i * 4, { fontSize: 8 })
  })
  // 파란색 밑줄 텍스트
  const blueText = [30, 64, 175]
  drawText('② 금융정보 : ', startX + labelWidth + 3, y + 4 + 4 * 4, { fontSize: 8 })
  pdf.setFontSize(8)
  drawText('은행명, 계좌번호', startX + labelWidth + 3 + pdf.getTextWidth('② 금융정보 : '), y + 4 + 4 * 4, { fontSize: 8, color: blueText })
  const underlineX = startX + labelWidth + 3 + pdf.getTextWidth('② 금융정보 : ')
  pdf.setDrawColor(...blueText)
  pdf.setLineWidth(0.2)
  pdf.line(underlineX, y + 5 + 4 * 4, underlineX + pdf.getTextWidth('은행명, 계좌번호'), y + 5 + 4 * 4)
  y += basisHeight

  // 개인정보의 보유 및 이용 기간
  const periodHeight = 9
  drawCell(startX, y, labelWidth, periodHeight, { fill: COLORS.headerBg })
  drawCell(startX + labelWidth, y, valueWidth, periodHeight)
  drawText('개인정보의', startX + labelWidth / 2, y + 4, { align: 'center', fontSize: 9 })
  drawText('보유/이용 기간', startX + labelWidth / 2, y + 7.5, { align: 'center', fontSize: 8 })
  drawText('국세기본법 제85조의3에 의거 해당국세의 법정신고기한이 지난날부터 ', startX + labelWidth + 3, y + 5.5, { fontSize: 8 })
  pdf.setFontSize(8)
  const periodTextX = startX + labelWidth + 3 + pdf.getTextWidth('국세기본법 제85조의3에 의거 해당국세의 법정신고기한이 지난날부터 ')
  drawText('5년간 보존', periodTextX, y + 5.5, { fontSize: 8, color: blueText })
  pdf.setDrawColor(...blueText)
  pdf.line(periodTextX, y + 6.5, periodTextX + pdf.getTextWidth('5년간 보존'), y + 6.5)
  y += periodHeight

  doc.y = y + 3

  // ========== 제2섹션: 고유식별정보 수집 및 이용 확인서 ==========
  y = doc.y

  // 섹션 제목
  pdf.setFillColor(...COLORS.primary)
  pdf.roundedRect(startX, y, contentWidth, sectionTitleHeight, cornerRadius, cornerRadius, 'F')
  drawText('고유식별정보 수집 및 이용 확인서', startX + contentWidth / 2, y + 7, { fontSize: 13, align: 'center', color: [255, 255, 255] })
  y += sectionTitleHeight + 2

  // 주민등록번호
  drawCell(startX, y, labelWidth, rowHeight, { fill: COLORS.headerBg })
  drawCell(startX + labelWidth, y, valueWidth, rowHeight)
  drawText('주민등록번호', startX + labelWidth / 2, y + 5, { align: 'center', fontSize: 10 })
  drawText(consent.idNumber || profile.idNumber || '', startX + labelWidth + 3, y + 5, { fontSize: 10 })
  y += rowHeight

  // 개인정보 처리 사유
  drawCell(startX, y, labelWidth, reasonHeight, { fill: COLORS.headerBg })
  drawCell(startX + labelWidth, y, valueWidth, reasonHeight)
  drawText('개인정보', startX + labelWidth / 2, y + 4, { align: 'center', fontSize: 9 })
  drawText('처리 사유', startX + labelWidth / 2, y + 7.5, { align: 'center', fontSize: 9 })
  drawText('전문가활용비 지급 및 원천징수영수증의 발급, 지급명세서 제출 등', startX + labelWidth + 3, y + 5.5, { fontSize: 9 })
  y += reasonHeight

  // 수집·이용 항목
  drawCell(startX, y, labelWidth, rowHeight, { fill: COLORS.headerBg })
  drawCell(startX + labelWidth, y, valueWidth, rowHeight)
  drawText('수집·이용 항목', startX + labelWidth / 2, y + 5, { align: 'center', fontSize: 9 })
  drawText('① 고유식별정보 : ', startX + labelWidth + 3, y + 5, { fontSize: 9 })
  pdf.setFontSize(9)
  const idTextX = startX + labelWidth + 3 + pdf.getTextWidth('① 고유식별정보 : ')
  drawText('주민등록번호', idTextX, y + 5, { fontSize: 9, color: blueText })
  pdf.setDrawColor(...blueText)
  pdf.line(idTextX, y + 6, idTextX + pdf.getTextWidth('주민등록번호'), y + 6)
  y += rowHeight

  // 수집·이용 근거
  const basis2Height = 12
  drawCell(startX, y, labelWidth, basis2Height, { fill: COLORS.headerBg })
  drawCell(startX + labelWidth, y, valueWidth, basis2Height)
  drawText('수집·이용 근거', startX + labelWidth / 2, y + 7, { align: 'center', fontSize: 9 })
  drawText('소득세법 제145조(기타소득에 대한 원천징수시기와 방법 및 원천징수영수증의 발급),', startX + labelWidth + 3, y + 4, { fontSize: 8 })
  drawText('동법 제164조(지급명세서의 제출), 개인정보 보호법 제15조제1항제4호(계약의 이행)', startX + labelWidth + 3, y + 8, { fontSize: 8 })
  y += basis2Height

  // 개인정보의 보유 및 이용 기간
  drawCell(startX, y, labelWidth, periodHeight, { fill: COLORS.headerBg })
  drawCell(startX + labelWidth, y, valueWidth, periodHeight)
  drawText('개인정보의', startX + labelWidth / 2, y + 4, { align: 'center', fontSize: 9 })
  drawText('보유/이용 기간', startX + labelWidth / 2, y + 7.5, { align: 'center', fontSize: 8 })
  drawText('국세기본법 제85조의3에 의거 해당국세의 법정신고기한이 지난날부터 ', startX + labelWidth + 3, y + 5.5, { fontSize: 8 })
  pdf.setFontSize(8)
  const period2TextX = startX + labelWidth + 3 + pdf.getTextWidth('국세기본법 제85조의3에 의거 해당국세의 법정신고기한이 지난날부터 ')
  drawText('5년간 보존', period2TextX, y + 5.5, { fontSize: 8, color: blueText })
  pdf.setDrawColor(...blueText)
  pdf.line(period2TextX, y + 6.5, period2TextX + pdf.getTextWidth('5년간 보존'), y + 6.5)
  y += periodHeight

  doc.y = y + 5

  // ========== 확인 문구 ==========
  doc.addCenteredText('위와 같이 개인정보 및 고유식별정보를 수집·활용하는 것을 확인하였으며', 11)
  doc.addCenteredText('본 수당 지급 목적의 회의 또는 심사 등에 참가하였음을 확인합니다.', 11)
  doc.addSpace(4)

  // 날짜
  const yearStr = consent.year ? (String(consent.year).length === 2 ? `20${consent.year}` : consent.year) : '    '
  const dateStr = `${yearStr}년    ${consent.month || '    '}월    ${consent.day || '    '}일`
  doc.addCenteredText(dateStr, 12)
  doc.addSpace(4)

  // 성명 및 서명
  doc.applyFont()
  pdf.setFontSize(12)
  pdf.setTextColor(...COLORS.text)
  pdf.text('성  명', doc.pageWidth - 72, doc.y)
  pdf.text(consent.name || profile.name || '', doc.pageWidth - 54, doc.y)
  pdf.text('(서명)', doc.pageWidth - 22, doc.y)

  // 서명 이미지 추가
  if (consent.signature) {
    try {
      pdf.addImage(consent.signature, 'PNG', doc.pageWidth - 54, doc.y - 10, 30, 15)
    } catch (e) {
      console.warn('서명 이미지 추가 실패:', e)
    }
  }

  doc.addSpace(7)
  doc.addCenteredText('한국전자통신연구원장 귀하', 12)
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
