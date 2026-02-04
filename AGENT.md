# ExpertsMan - 전문가 관리 및 세미나 요청 시스템

## 프로젝트 개요

전문가 목록을 관리하고, 전문가로부터 프로필/세미나 정보/개인정보동의서를 수집하기 위한 웹 애플리케이션

## 기술 스택

- **프레임워크**: Next.js 14 (App Router)
- **스타일링**: Tailwind CSS
- **PDF 생성**: html2canvas + jspdf
- **서명 기능**: react-signature-canvas
- **상태 관리**: React useState/useReducer
- **데이터 저장**:
  - 관리자 측: 서버 DB (SQLite 또는 PostgreSQL)
  - 전문가 측: 브라우저 localStorage (서버리스)

---

## 사용자 역할

### 1. 관리자 (Admin)
- 전문가 목록 CRUD
- 전문가 정보 입력용 링크 생성 및 공유
- 기존 링크 조회

### 2. 전문가 (Expert)
- 고유 링크 + 비밀번호로 접근
- 프로필, 발표요약, 개인정보동의서 작성
- PDF 다운로드
- 임시저장 (브라우저)

---

## 페이지 구조

```
/                           # 랜딩 페이지 (관리자 로그인으로 리다이렉트)
/admin                      # 관리자 대시보드
  /admin/login              # 관리자 로그인
  /admin/experts            # 전문가 목록 관리
  /admin/experts/new        # 전문가 신규 등록
  /admin/experts/[id]       # 전문가 정보 수정
  /admin/links              # 생성된 링크 목록 조회
  /admin/links/new          # 새 링크 생성
/form/[randomId]            # 전문가 정보 입력 폼 (비밀번호 필요)
```

---

## 데이터 모델

### Expert (전문가 기본 정보 - 관리자 관리용)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string (UUID) | 고유 식별자 |
| name | string | 이름 |
| affiliation | string | 소속 |
| position | string | 직위 |
| email | string | 이메일 |
| phone | string | 전화번호 |
| consultingFee | number | 자문료 |
| createdAt | datetime | 생성일 |
| updatedAt | datetime | 수정일 |

### FormLink (전문가 입력 링크)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string (UUID) | 고유 식별자 |
| randomId | string | URL용 랜덤 ID (8-12자) |
| password | string (hashed) | 접근 비밀번호 |
| expertId | string | 연결된 전문가 ID |
| expiresAt | datetime | 만료일 (선택) |
| createdAt | datetime | 생성일 |

### ExpertProfile (전문가가 입력하는 상세 프로필 - 클라이언트 저장)

```typescript
interface ExpertProfile {
  // 발표자 인적사항
  personalInfo: {
    name: string;              // 성명
    residentNumber: string;    // 주민번호
    address: string;           // 주소
    affiliation: string;       // 소속
    department: string;        // 부서
    phone: string;             // 전화번호
    email: string;             // 이메일
  };

  // 학력 (다중)
  education: Array<{
    year: string;              // 학위 취득년도
    degree: string;            // 학위 (학사/석사/박사 등)
    school: string;            // 학교
  }>;

  // 경력 (다중)
  career: Array<{
    period: string;            // 기간 (예: 2020.03 ~ 2023.02)
    organization: string;      // 기관
    role: string;              // 업무
  }>;

  // 주요업적
  achievements: string;        // 수상이력, 전문기술분야 등

  // 발표요약
  presentation: {
    title: string;             // 강연제목
    subtitles: string[];       // 소제목 (5개)
    summary: string;           // 요약 (500자 내외)
  };

  // 개인정보 동의
  consent: {
    agreed: boolean;           // 동의 여부
    signatureData: string;     // Base64 서명 이미지
    signedAt: datetime;        // 서명 일시
  };
}
```

---

## 기능 상세

### 1. 관리자 기능

#### 1.1 전문가 목록 관리 (`/admin/experts`)
- **목록 조회**: 테이블 형태로 전문가 목록 표시
  - 컬럼: 이름, 소속, 직위, 이메일, 전화번호, 자문료, 액션(수정/삭제)
  - 검색 기능 (이름, 소속 기준)
  - 페이지네이션
- **신규 등록**: 폼을 통한 전문가 정보 입력
- **수정**: 기존 정보 수정
- **삭제**: 확인 모달 후 삭제

#### 1.2 링크 관리 (`/admin/links`)
- **링크 생성**:
  - 전문가 선택 (드롭다운)
  - 비밀번호 자동 생성 또는 수동 입력
  - 랜덤 ID 자동 생성 (nanoid 사용, 8-12자)
  - 만료일 설정 (선택사항)
- **링크 목록**:
  - 전문가명, 랜덤 ID, 비밀번호 (마스킹/복사), 생성일, 만료일
  - 링크 복사 버튼
  - 링크 재생성/삭제

### 2. 전문가 입력 폼 (`/form/[randomId]`)

#### 2.1 접근 제어
- URL의 randomId로 유효한 링크인지 서버에서 검증
- 비밀번호 입력 화면 표시
- 비밀번호 검증 성공 시 폼 접근 허용
- 세션 유지: sessionStorage에 인증 상태 저장

#### 2.2 폼 구성 (탭 또는 스텝 방식)

**Step 1: 발표자 인적사항**
- 기본 정보 입력 필드들
- 학력 섹션:
  - 기본 1개 행 표시
  - [+] 버튼으로 행 추가
  - [-] 버튼으로 행 삭제 (최소 1개 유지)
- 경력 섹션:
  - 동일한 동적 추가/삭제 UI
- 주요업적: textarea

**Step 2: 발표요약**
- 강연제목: text input
- 소제목: 5개의 text input 고정 표시
- 요약: textarea (500자 제한, 글자수 카운터 표시)

**Step 3: 개인정보제공 동의서**
- 동의서 내용 표시 (첨부 이미지 기반 디자인)
- 동의 체크박스
- 서명 캔버스 (react-signature-canvas)
  - 서명 초기화 버튼
- 서명일자 자동 입력

#### 2.3 하단 액션 버튼
- **임시저장**: localStorage에 현재 폼 데이터 저장
  - 키: `expertform_${randomId}`
  - 페이지 진입 시 저장된 데이터 자동 복원
- **PDF 다운로드**:
  - 모든 필수 필드 검증
  - 서명 완료 확인
  - 3페이지 PDF 생성

### 3. PDF 생성

#### 3.1 PDF 구성 (3페이지)

**Page 1: 발표자 인적사항**
```
┌─────────────────────────────────────┐
│         발표자 인적사항              │
├─────────────────────────────────────┤
│ 성명: [      ]  주민번호: [        ]│
│ 주소: [                            ]│
│ 소속: [      ]  부서: [            ]│
│ 전화: [      ]  이메일: [          ]│
├─────────────────────────────────────┤
│ ■ 학력                              │
│ ┌──────┬──────┬──────────┐         │
│ │ 년도 │ 학위 │   학교   │         │
│ ├──────┼──────┼──────────┤         │
│ │ 2010 │ 박사 │ OO대학교 │         │
│ └──────┴──────┴──────────┘         │
├─────────────────────────────────────┤
│ ■ 경력                              │
│ ┌──────────┬──────────┬──────┐     │
│ │   기간   │   기관   │ 업무 │     │
│ └──────────┴──────────┴──────┘     │
├─────────────────────────────────────┤
│ ■ 주요업적                          │
│ [                                  ]│
└─────────────────────────────────────┘
```

**Page 2: 발표요약**
```
┌─────────────────────────────────────┐
│            발표 요약                 │
├─────────────────────────────────────┤
│ ■ 강연제목                          │
│ [                                  ]│
├─────────────────────────────────────┤
│ ■ 소제목                            │
│ 1. [                               ]│
│ 2. [                               ]│
│ 3. [                               ]│
│ 4. [                               ]│
│ 5. [                               ]│
├─────────────────────────────────────┤
│ ■ 요약                              │
│ [                                  ]│
│ [                                  ]│
│ [                                  ]│
└─────────────────────────────────────┘
```

**Page 3: 개인정보제공 동의서**
- 첨부된 이미지와 동일한 레이아웃
- 하단에 서명 이미지 삽입
- 서명일자 표시

#### 3.2 PDF 생성 프로세스
```typescript
async function generatePDF() {
  const pdf = new jsPDF('p', 'mm', 'a4');

  // Page 1: 인적사항
  const page1Element = document.getElementById('pdf-page-1');
  const canvas1 = await html2canvas(page1Element, { scale: 2 });
  pdf.addImage(canvas1.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);

  // Page 2: 발표요약
  pdf.addPage();
  const page2Element = document.getElementById('pdf-page-2');
  const canvas2 = await html2canvas(page2Element, { scale: 2 });
  pdf.addImage(canvas2.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);

  // Page 3: 동의서
  pdf.addPage();
  const page3Element = document.getElementById('pdf-page-3');
  const canvas3 = await html2canvas(page3Element, { scale: 2 });
  pdf.addImage(canvas3.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);

  pdf.save('전문가_프로필_${name}.pdf');
}
```

---

## API 엔드포인트

### 관리자 API (서버)

```
POST   /api/admin/login          # 관리자 로그인
GET    /api/admin/experts        # 전문가 목록 조회
POST   /api/admin/experts        # 전문가 등록
GET    /api/admin/experts/:id    # 전문가 상세 조회
PUT    /api/admin/experts/:id    # 전문가 수정
DELETE /api/admin/experts/:id    # 전문가 삭제

GET    /api/admin/links          # 링크 목록 조회
POST   /api/admin/links          # 링크 생성
DELETE /api/admin/links/:id      # 링크 삭제
```

### 전문가 폼 API (최소한의 서버 통신)

```
GET    /api/form/:randomId/verify    # 링크 유효성 검증
POST   /api/form/:randomId/auth      # 비밀번호 검증
```

> **주의**: 전문가가 입력하는 실제 데이터는 서버에 저장하지 않음.
> 모든 폼 데이터는 클라이언트(localStorage)에서만 관리.

---

## 보안 고려사항

1. **관리자 인증**: JWT 또는 NextAuth.js 사용
2. **비밀번호 해싱**: bcrypt 사용
3. **주민번호 처리**:
   - 서버에 절대 전송하지 않음
   - PDF 생성 시에만 클라이언트에서 사용
   - localStorage 저장 시 암호화 고려
4. **링크 만료**: 설정된 만료일 이후 접근 불가
5. **HTTPS 필수**: 모든 통신 암호화

---

## UI/UX 가이드라인

### 색상 팔레트 (Tailwind)
- Primary: `blue-600`
- Secondary: `gray-600`
- Success: `green-600`
- Error: `red-600`
- Background: `gray-50`

### 컴포넌트 스타일
- 카드: `bg-white rounded-lg shadow-md p-6`
- 버튼: `px-4 py-2 rounded-md font-medium`
- 입력 필드: `border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500`
- 테이블: `divide-y divide-gray-200`

### 반응형
- 모바일 우선 설계
- 브레이크포인트: `sm:640px`, `md:768px`, `lg:1024px`

---

## 폴더 구조

```
/src
  /app
    /admin
      /login/page.tsx
      /experts/page.tsx
      /experts/new/page.tsx
      /experts/[id]/page.tsx
      /links/page.tsx
      /links/new/page.tsx
      layout.tsx
    /form
      /[randomId]/page.tsx
    /api
      /admin/...
      /form/...
    layout.tsx
    page.tsx
  /components
    /admin
      ExpertTable.tsx
      ExpertForm.tsx
      LinkTable.tsx
      LinkForm.tsx
    /form
      PersonalInfoStep.tsx
      EducationSection.tsx
      CareerSection.tsx
      PresentationStep.tsx
      ConsentStep.tsx
      SignatureCanvas.tsx
    /pdf
      ProfilePage.tsx
      PresentationPage.tsx
      ConsentPage.tsx
    /ui
      Button.tsx
      Input.tsx
      Card.tsx
      Modal.tsx
      Table.tsx
  /lib
    db.ts
    auth.ts
    pdf.ts
    utils.ts
  /types
    index.ts
  /hooks
    useLocalStorage.ts
    useFormData.ts
```

---

## 개발 우선순위

### Phase 1: 기본 구조
1. Next.js 프로젝트 설정 + Tailwind
2. 데이터베이스 스키마 및 연결
3. 기본 UI 컴포넌트

### Phase 2: 관리자 기능
4. 관리자 인증
5. 전문가 CRUD
6. 링크 생성/관리

### Phase 3: 전문가 폼
7. 비밀번호 검증 페이지
8. 3단계 폼 구현
9. 동적 학력/경력 추가
10. 서명 캔버스

### Phase 4: PDF 및 마무리
11. PDF 템플릿 디자인
12. PDF 생성 기능
13. 임시저장/불러오기
14. 테스트 및 버그 수정

---

## 참고 라이브러리

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "tailwindcss": "^3.4.0",
    "jspdf": "^2.5.1",
    "html2canvas": "^1.4.1",
    "react-signature-canvas": "^1.0.6",
    "nanoid": "^5.0.0",
    "bcryptjs": "^2.4.3",
    "prisma": "^5.0.0",
    "@prisma/client": "^5.0.0"
  }
}
```

---

## 개인정보제공 동의서 템플릿

동의서는 첨부된 이미지를 기반으로 다음 내용을 포함:

1. 개인정보 수집 및 이용 목적
2. 수집하는 개인정보 항목
3. 개인정보 보유 및 이용 기간
4. 동의 거부 권리 및 불이익 안내
5. 동의 체크박스
6. 서명란
7. 날짜

> **Note**: 실제 동의서 내용은 첨부된 이미지 파일을 참조하여 정확히 구현할 것
