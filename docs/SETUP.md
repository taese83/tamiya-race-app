# 인증·DB 셋업 가이드 (Stage 1)

Google OAuth 로그인과 Vercel Postgres 저장소를 준비하는 단계별 가이드다. Stage 1에서는 OAuth만 사용하지만 Stage 2에서 DB를 쓸 수 있게 함께 준비한다.

## 1. Google OAuth Client 생성

1. https://console.cloud.google.com/ 접속
2. 상단 프로젝트 셀렉터에서 **새 프로젝트** 생성 (예: `tamiya-race-app`)
3. 좌측 메뉴 **API 및 서비스 → OAuth 동의 화면**
   - User type: **External** 선택
   - 앱 이름: `타미야 경기 일정`
   - 지원 이메일: 본인 Gmail
   - 개발자 연락처: 본인 Gmail
   - 저장 후 계속 → 범위 화면에서 **email**, **profile**, **openid** 추가
   - 테스트 사용자에 본인 Gmail 추가
4. 좌측 메뉴 **API 및 서비스 → 사용자 인증 정보**
   - **사용자 인증 정보 만들기 → OAuth 클라이언트 ID**
   - 애플리케이션 유형: **웹 애플리케이션**
   - 이름: `tamiya-race-app-web`
   - **승인된 리디렉션 URI** (모두 등록):
     - `http://localhost:5173/api/auth/google/callback` (로컬 개발)
     - `https://<vercel-preview-domain>/api/auth/google/callback` (배포 후 채움)
     - `https://<production-domain>/api/auth/google/callback` (프로덕션)
   - 생성 후 **클라이언트 ID**와 **클라이언트 보안 비밀번호**를 복사 → 아래 환경 변수에 사용

## 2. Vercel Postgres 준비

1. Vercel 프로젝트로 이동 (없으면 이 리포를 먼저 import)
2. 프로젝트 대시보드 → **Storage** 탭 → **Create Database**
3. **Postgres** 선택 → 무료 플랜 (Hobby) → 리전은 `Washington, D.C.` 또는 가까운 리전
4. 생성 완료 후 **`.env.local` Tab**에서 다음 값을 복사:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_USER`, `POSTGRES_HOST`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`
5. Stage 2에서 스키마 초기화 (사용자 승인 후 실행)

## 3. 로컬 환경 변수 (`.env.local`)

`tamiya-race-app/.env.local` 파일 생성 (gitignore에 있어야 함):

```bash
# Google OAuth
GOOGLE_CLIENT_ID=xxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:5173/api/auth/google/callback

# JWT — 임의의 긴 랜덤 문자열 (예: openssl rand -base64 32)
SESSION_SECRET=<32-byte 이상 랜덤>

# Postgres (Vercel Storage에서 복사, Stage 2에서 사용)
POSTGRES_URL=postgres://...
POSTGRES_URL_NON_POOLING=postgres://...
```

## 4. Vercel Environment Variables

배포 환경에서 사용하려면 Vercel 대시보드 → Settings → Environment Variables에 위 값들을 모두 등록.
- Preview 환경: `GOOGLE_REDIRECT_URI=https://<preview-domain>/api/auth/google/callback`
- Production 환경: `GOOGLE_REDIRECT_URI=https://<production-domain>/api/auth/google/callback`

## 5. 확인

Stage 1 구현이 완료되면:
- `pnpm dev` 실행 (root에서)
- http://localhost:5173 접속
- 우측 상단 "로그인" 버튼 → Google 로그인 → 아바타 표시
- 새로고침 → 아바타 유지 (세션 복원 확인)

## 다음 단계

- Stage 2: DB 스키마 초기화 + 참여/점수 API
- Stage 3: 아바타 메뉴, 점수 레이어, 참여 체크박스, 참여 경기만 보기
