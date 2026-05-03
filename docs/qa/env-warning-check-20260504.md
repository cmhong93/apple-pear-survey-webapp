# Vercel .env 감지 경고 관련 저장소 보안 점검

## 점검 배경

Vercel 빌드 로그에 `.env` 파일 감지 경고가 표시되었다. 실제 민감한 환경변수 파일이 Git에 추적되거나 배포 업로드 대상에 포함될 가능성이 있는지 재확인했다.

## 실행한 명령

```bat
git ls-files .env .env.example .env.local .env.production .env.preview
cmd /c "git ls-files | findstr /i .env"
git check-ignore -v .env .env.local .env.production .env.example
rg -n "GOOGLE_PRIVATE_KEY|GEMINI_API_KEY|GOOGLE_SERVICE_ACCOUNT_JSON_BASE64|GOOGLE_OAUTH_CLIENT_SECRET|GOOGLE_OAUTH_REFRESH_TOKEN|APP_ADMIN_PASSWORD|APP_SURVEYOR_SHARED_SECRET|process\\.env|DRIVE|SHEETS|VERCEL|API[_ -]?key" app agents data lib types .env.example package.json
```

실제 `.env.local` 내용은 열람하지 않았다.

## .env 관련 Git 추적 상태

- `git ls-files .env .env.example .env.local .env.production .env.preview` 결과: `.env.example`만 추적 중.
- `cmd /c "git ls-files | findstr /i .env"` 결과: `.env.example`, `next-env.d.ts`.
- `next-env.d.ts`는 Next.js 타입 파일이며 민감 환경변수 파일이 아님.
- 실제 `.env`, `.env.local`, `.env.production`, `.env.preview`는 Git 추적 상태가 아님.

## .gitignore 상태

- 점검 전에는 `.env*.local`과 `*.local`은 제외되어 있었지만, `.env`, `.env.*`, `!.env.example`가 명시되어 있지 않았다.
- 점검 중 `.gitignore`에 아래 항목을 추가했다.

```gitignore
.env
.env.*
!.env.example
```

- `git check-ignore -v` 확인:
  - `.env`: ignore 적용
  - `.env.local`: ignore 적용
  - `.env.production`: ignore 적용
  - `.env.example`: 추적 허용

## .vercelignore 상태

`.vercelignore`는 이미 아래 정책을 포함하고 있었다.

```gitignore
.env
.env.*
!.env.example
.vercel
node_modules
dist
```

따라서 Vercel CLI 업로드 대상에서 `.env`, `.env.local` 등은 제외되며, `.env.example`만 허용된다.

## 하드코딩 의심 항목

- 코드 검색 결과 실제 secret 값 하드코딩은 발견하지 못했다.
- `process.env.*` 사용 위치는 `lib/auth.ts`, `lib/googleSheets.ts`, `lib/googleDrive.ts`, `lib/gemini.ts`, `lib/kakao.ts`, `app/api/auth/login/route.ts` 등 서버/설정 경로에 집중되어 있다.
- `.env.example`에는 변수명만 있고 실제 값은 없다.
- `lib/auth.ts`에는 로컬 개발용 fallback 문자열이 있으나 운영 환경에서는 환경변수 사용이 전제되어 있으며 실제 운영 secret 값은 아니다.

## 수정 여부

- `.gitignore`에 `.env`, `.env.*`, `!.env.example`를 명시 추가했다.
- `.vercelignore`는 수정하지 않았다.
- 실제 환경변수 값은 읽거나 문서화하지 않았다.

## 추가 조치 필요 여부

- Vercel 경고는 로컬에 `.env.local`이 존재하는 상태에서 빌드가 실행되어 감지된 것으로 보인다.
- 배포 보안 정책상 Vercel Environment Variables를 계속 기준으로 사용한다.
- 권장: 로컬에서 `vercel --prod` 실행 시 `.vercelignore` 유지 여부를 배포 전 계속 확인한다.
- 권장: GitHub Push Protection 또는 secret scanning이 활성화되어 있는지 GitHub 설정에서 확인한다.
