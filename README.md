# Research Intern Growth MVP

국가연구소 인턴·학연생 교육을 위한 React + TypeScript 기반 MVP입니다.

## 주요 기능

- 역할 기반 로그인: 활용책임자, 멘토, 학연생, 인턴
- 관리자 대시보드: 오늘 미션 완료율, 회고 작성 현황, 성장 대시보드
- 학생 관리: 학생 추가, 학생별 상세 기록 확인
- 미션 관리: 학생별 날짜별 미션 배정, 오늘 미션 체크
- 기록 관리: 일일 회고, 오늘 수행 내용, 내일 계획, 주간 보고서
- 피드백: 멘토 일일 피드백, 활용책임자 주간 피드백
- 달력: 월간 보기, 주말/공휴일 표시, 날짜별 기록 확인
- 도움말: 역할과 화면별 사용 가이드
- 데이터 이동: JSON 내보내기/가져오기
- DB 저장: Supabase 환경 변수가 있으면 공용 DB에 자동 저장
- AI 준비: 실제 API 대신 mock AI 피드백 서비스로 분리

## 실행

```bash
npm install
npm run dev
```

## 미리보기 빌드

```bash
npm run build
npm run preview
```

## 데모 계정

데모 비밀번호는 모든 계정 공통으로 `demo123`입니다.

- 활용책임자: `owner@lab.local`
- 멘토: `mentor@lab.local`
- 학연생: `minseo@lab.local`, `jiho@lab.local`
- 인턴: `sua@lab.local`, `hyun@lab.local`

## Supabase DB 연결

1. Supabase에서 새 프로젝트를 만듭니다.
2. SQL Editor에서 `db/supabase-schema.sql` 내용을 실행합니다.
3. `Project Settings > API`에서 Project URL과 anon public key를 복사합니다.
4. 로컬에서는 `.env.example`을 참고해 `.env.local`을 만듭니다.

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_APP_STATE_ID=default
```

환경 변수가 없으면 앱은 기존처럼 브라우저 `localStorage`에 저장합니다. 환경 변수가 있으면 시작 시 Supabase에서 데이터를 불러오고, 변경 사항을 Supabase에 자동 저장합니다.

현재 DB 구조는 MVP 속도를 위해 `app_state` 단일 테이블에 전체 앱 상태를 JSON으로 저장합니다. 실제 운영 전에는 사용자 인증, RLS 정책 강화, 학생/미션/회고 테이블 정규화를 권장합니다.

## 웹 배포

### Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Environment variables에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_STATE_ID`를 추가합니다.

### Vercel

- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables에 Supabase 값을 추가합니다.

## 배포 파일

`npm run build` 후 `dist` 폴더를 정적 웹 호스팅에 올리면 됩니다. 현재 저장소에는 Netlify용 `netlify.toml`과 Vercel용 `vercel.json`이 포함되어 있습니다.
