# ExpertsMan

전문가 일정 조율 및 관리 시스템입니다. 워크스페이스별로 전문가를 관리하고, 내부 멤버들의 투표를 통해 일정을 조율할 수 있습니다.

## 주요 기능

- **멀티 워크스페이스**: 조직별로 독립된 워크스페이스 운영
- **전문가 관리**: 전문가 정보 등록 및 관리
- **일정 투표**: 내부 멤버들이 가능한 일정에 투표
- **일정 확정**: 투표 결과를 바탕으로 일정 확정 및 전문가 선택
- **PDF 생성**: 전문가 정보 PDF 출력

## 기술 스택

### Backend (Cloudflare Workers)
- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Database**: Cloudflare D1 (SQLite)
- **Language**: TypeScript

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS v4
- **Routing**: React Router v7

## 프로젝트 구조

```
ExpertsMan/
├── backend/                    # Cloudflare Workers API
│   ├── src/
│   │   ├── index.ts           # 엔트리포인트
│   │   ├── types.ts           # TypeScript 타입
│   │   ├── routes/            # API 라우트
│   │   │   ├── godgod.ts      # 관리자 API
│   │   │   ├── workspaces.ts  # 워크스페이스/전문가 API
│   │   │   └── workspace-requests.ts
│   │   ├── middleware/
│   │   │   └── auth.ts        # 인증 미들웨어
│   │   └── utils/
│   │       └── token.ts       # 토큰 유틸리티
│   ├── migrations/            # D1 마이그레이션
│   ├── wrangler.toml          # Workers 설정
│   └── .dev.vars              # 로컬 개발 환경변수
│
├── experts-man/               # React 프론트엔드
│   ├── src/
│   │   ├── pages/             # 페이지 컴포넌트
│   │   ├── components/        # 재사용 컴포넌트
│   │   └── utils/             # 유틸리티
│   ├── .env.development       # 개발 환경변수
│   └── .env.production        # 프로덕션 환경변수
│
└── package.json               # 루트 워크스페이스
```

## 시작하기

### 사전 요구사항

- Node.js 18+
- npm 또는 yarn
- Cloudflare 계정 (배포 시)

### 설치

```bash
# 저장소 클론
git clone <repository-url>
cd ExpertsMan

# 백엔드 의존성 설치
cd backend && npm install

# 프론트엔드 의존성 설치
cd ../experts-man && npm install
```

### 로컬 개발 실행

```bash
# D1 로컬 데이터베이스 초기화 (최초 1회)
cd backend && npm run db:migrate && cd ..

# 프론트엔드 + 백엔드 동시 실행
npm run dev

# Cloudflare 환경 시뮬레이션
npm run dev:cf
```

#### 접속

- 프론트엔드: http://localhost:5173
- API: http://localhost:8787

### 기본 계정

- **관리자(GodGod) 비밀번호**: `godgod123`
- **기본 워크스페이스**: `default` (비밀번호: `0000`)

## 환경 변수

### Backend (.dev.vars)

```env
GODGOD_PASSWORD=godgod123
TOKEN_SECRET=your-secret-key
```

### Frontend (.env.development)

```env
VITE_API_URL=http://localhost:8787/api
```

## 프로덕션 배포

배포는 **백엔드(Workers) → 프론트엔드(Pages)** 순서로 진행합니다.

### Step 1. Cloudflare 로그인 (최초 1회)

```bash
npx wrangler login
# 브라우저가 열리면 Cloudflare 계정으로 로그인
```

### Step 2. D1 데이터베이스 생성 (최초 1회)

```bash
cd backend
npx wrangler d1 create expertsman-db
```

출력된 `database_id`를 `wrangler.toml`에 업데이트:

```toml
[[d1_databases]]
binding = "DB"
database_name = "expertsman-db"
database_id = "출력된-database-id"
```

### Step 3. Secrets 설정 (최초 1회)

```bash
cd backend
npx wrangler secret put GODGOD_PASSWORD
# 프롬프트에서 값 입력 (예: godgod123)

npx wrangler secret put TOKEN_SECRET
# 프롬프트에서 값 입력 (예: your-secret-key)
```

### Step 4. 프로덕션 D1 스키마 적용 (최초 1회)

```bash
cd backend
npm run db:migrate:prod
```

> **중요**: 이 명령어는 `--remote` 플래그를 사용하여 프로덕션 D1에 스키마를 적용합니다.
> 로컬 D1에만 적용하려면 `npm run db:migrate`를 사용하세요.

### Step 5. 백엔드 배포 (Workers)

```bash
cd backend
npm run deploy
```

배포 완료 시 터미널에 URL이 출력됩니다:
```
Published expertsman-api (1.23 sec)
  https://expertsman-api.YOUR_SUBDOMAIN.workers.dev
```

> 이 URL을 복사해두세요!

### Step 6. 프론트엔드 환경변수 설정

`experts-man/.env.production` 파일을 수정:

```env
VITE_API_URL=https://expertsman-api.YOUR_SUBDOMAIN.workers.dev/api
```

> `/api`를 꼭 붙여야 합니다!

### Step 7. 프론트엔드 배포 (Pages)

```bash
cd experts-man

# 빌드
npm run build

# Cloudflare Pages 배포
npx wrangler pages deploy dist --project-name=expertsman
```

배포 완료 시 터미널에 URL이 출력됩니다:
```
✨ Deployment complete! Take a peek over at https://expertsman.pages.dev
```

---

### 루트에서 한번에 배포하기

```bash
# 프로젝트 루트에서 (빌드 + 프론트엔드 배포 + 백엔드 배포)
npm run deploy
```

---

### 배포 후 확인

1. **API 헬스체크**: `https://expertsman-api.YOUR_SUBDOMAIN.workers.dev/health`
2. **프론트엔드 접속**: `https://expertsman.pages.dev`
3. **관리자 로그인**: `/godgod` 경로에서 비밀번호 입력

---

### 재배포 (코드 수정 후)

```bash
# 백엔드만 수정한 경우
cd backend && npm run deploy

# 프론트엔드만 수정한 경우
cd experts-man && npm run build && npx wrangler pages deploy dist --project-name=expertsman

# 둘 다 수정한 경우 (루트에서)
npm run deploy
```

---

### Cloudflare 대시보드에서 확인

- **Workers & Pages**: 배포된 서비스 목록
- **D1**: 데이터베이스 내용 조회/편집
- **Analytics**: 요청 로그, 에러 확인
- **Settings**: 커스텀 도메인 연결

## API 엔드포인트

### 관리자 (GodGod)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/godgod/auth` | 관리자 로그인 |
| GET | `/api/godgod/verify` | 토큰 검증 |
| GET | `/api/godgod/workspaces` | 워크스페이스 목록 |
| POST | `/api/godgod/workspaces` | 워크스페이스 생성 |
| PUT | `/api/godgod/workspaces/:id` | 워크스페이스 수정 |
| DELETE | `/api/godgod/workspaces/:id` | 워크스페이스 삭제 |

### 워크스페이스

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/workspaces/:slug` | 워크스페이스 정보 |
| POST | `/api/workspaces/:slug/auth` | 워크스페이스 로그인 |
| GET | `/api/workspaces/:slug/experts` | 전문가 목록 |
| POST | `/api/workspaces/:slug/experts` | 전문가 생성/수정 |
| DELETE | `/api/workspaces/:slug/experts/:id` | 전문가 삭제 |

### 투표

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/workspaces/:slug/experts/:id/slots` | 투표 슬롯 추가 |
| POST | `/api/workspaces/:slug/experts/:id/vote` | 투표 제출 |
| POST | `/api/workspaces/:slug/experts/:id/confirm` | 일정 확정 |
| POST | `/api/workspaces/:slug/experts/:id/select-slot` | 전문가 일정 선택 |

## 스크립트

### Root

| 스크립트 | 설명 |
|----------|------|
| `npm run dev` | 로컬 개발 (프론트엔드 + 백엔드) |
| `npm run dev:cf` | Cloudflare 환경 시뮬레이션 |
| `npm run deploy` | Cloudflare 전체 배포 |

### Backend

| 스크립트 | 설명 |
|----------|------|
| `npm run dev` | Wrangler 개발 서버 |
| `npm run dev:local` | 로컬 D1과 함께 실행 |
| `npm run deploy` | Workers 배포 |
| `npm run db:migrate` | 로컬 D1 마이그레이션 |
| `npm run db:migrate:prod` | 프로덕션 D1 마이그레이션 |

### Frontend

| 스크립트 | 설명 |
|----------|------|
| `npm run dev` | Vite 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 미리보기 |

## 트러블슈팅

### API 호출 시 500 에러 (Internal Server Error)

**원인**: 프로덕션 D1에 스키마가 적용되지 않음

```bash
cd backend
npm run db:migrate:prod
```

### API 호출 시 404 에러

**원인**: `.env.production`에 `/api` 경로 누락

```env
# 잘못된 예
VITE_API_URL=https://expertsman-api.xxx.workers.dev

# 올바른 예
VITE_API_URL=https://expertsman-api.xxx.workers.dev/api
```

### 프론트엔드에서 API 연결 안됨 (CORS 에러)

**원인**: Workers CORS 설정 문제

`wrangler.toml`에서 `CORS_ORIGIN` 확인:
```toml
[vars]
CORS_ORIGIN = "*"  # 또는 특정 도메인
```

### Secrets 관련 에러

```bash
cd backend
npx wrangler secret list  # 설정된 secrets 확인
npx wrangler secret put GODGOD_PASSWORD  # 재설정
npx wrangler secret put TOKEN_SECRET
```

## 라이선스

ISC
