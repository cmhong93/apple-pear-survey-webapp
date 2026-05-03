# 수형/특이사항 룰 Production 배포 후 QA

## 검증 대상

- 브랜치: `feature/auth-sample-list`
- 기준 커밋: `71f6881 Add training system and special note rules`
- Production URL: `https://apple-pear-survey-webapp.vercel.app`
- 검증 범위: 수형 선택, 특이사항 빠른 입력, 제출 전 검증, `/api/submit` 한글 응답

## 실행한 명령

```bat
npm.cmd run lint
npm.cmd run build
rg -n "training_system_apple|training_system_pear|training_system_other_detail|training_system_unknown_reason|특이사항 없음|수형 혼재|병해충 많음|일부 수확|측정 불가|missing_training_system|meaningless_special_note|fire_blight_admin_report|missing_partial_harvest_amount" data app agents
Invoke-WebRequest -Uri https://apple-pear-survey-webapp.vercel.app/login -Method Head -UseBasicParsing
```

## 검증한 주요 기능

### 조사표 템플릿

- `data/surveyTemplates.ts`에서 사과 수형 목록이 `training_system_apple`로 분리되어 있음.
- `data/surveyTemplates.ts`에서 배 수형 목록이 `training_system_pear`로 분리되어 있음.
- 사과 수형 선택지에 `기타`, `확인불가`가 포함되어 있음.
- 배 수형 선택지에 `기타`, `확인불가`가 포함되어 있음.
- `기타` 선택 시 `기타 수형명 또는 설명` 필드가 조건부 표시되도록 구성되어 있음.
- `확인불가` 선택 시 `확인불가 사유` 필드가 조건부 표시되도록 구성되어 있음.

### 특이사항 빠른 입력

- `SurveySubmissionForm`에 빠른 입력 버튼이 정의되어 있음.
- 확인된 버튼: `특이사항 없음`, `수형 혼재`, `병해충 많음`, `일부 수확`, `측정 불가`.
- 버튼 클릭 시 해당 특이사항 필드 값이 사전 정의 문장으로 채워지는 구조를 확인함.

### RuleValidationAgent

- 수형 `기타` 선택 후 설명 미입력 시 `hardError` 발생.
- 수형 `확인불가` 선택 후 사유 미입력 시 `hardError` 발생.
- 특이사항 공란 또는 `.`, `ㅇ`, `모름`, `없` 단독 입력 시 차단.
- 주민등록번호, 계좌번호, 긴 식별번호 패턴 입력 시 민감정보 입력 차단.
- 병해충/피해/작황 이상 항목과 `특이사항 없음`이 모순될 경우 warning 발생.
- `기타` 항목 선택 후 특이사항 또는 기타 내용이 없으면 차단.
- 일부 수확 `O` 선택 후 일부 수확량 미입력 시 차단.
- 과수화상병 선택 또는 의심 입력 시 관리자 보고 warning 발생.

### /api/submit

- 차단 응답 메시지가 `제출할 수 없습니다.`로 한글 표시됨.
- 성공 응답 메시지가 `제출 완료: {submission_id}`로 한글 표시됨.
- 임시저장 응답 메시지가 `임시저장 완료`로 한글 표시됨.
- 기준 커밋 이후 서버 응답의 깨진 한글 문구는 수정됨.

### Production Smoke Test

- `https://apple-pear-survey-webapp.vercel.app/login` HEAD 요청 결과: `200 OK`.
- 운영 데이터 생성을 피하기 위해 Production에서 로그인, 제출, 파일 업로드는 수행하지 않음.
- in-app browser 자동화는 로컬 앱 서버 경로 문제로 실행 불가하여 네트워크 HEAD 스모크로 대체함.

## 통과/실패 결과

| 항목 | 결과 | 메모 |
| --- | --- | --- |
| lint | 통과 | `npm.cmd run lint` |
| build | 통과 | `npm.cmd run build`, Windows 권한 이슈로 권한 상승 실행 |
| 사과/배 수형 분기 | 통과 | 소스 구조 확인 |
| 기타/확인불가 조건부 필드 | 통과 | 소스 구조 확인 |
| 특이사항 빠른 입력 | 통과 | 소스 구조 확인 |
| RuleValidationAgent 수형 룰 | 통과 | 소스 구조 확인 |
| RuleValidationAgent 특이사항 룰 | 통과 | 소스 구조 확인 |
| /api/submit 한글 응답 | 통과 | 소스 구조 확인 |
| Production 기본 응답 | 통과 | `/login` 200 OK |

## 발견된 이슈

- 별도 테스트 러너가 없어 RuleValidationAgent를 자동 단위 테스트로 실행하는 스크립트는 추가하지 않음.
- Production에서 실제 로그인/제출/업로드를 수행하면 운영 Google Sheets/Drive에 데이터가 생성될 수 있어 회피함.
- in-app browser 자동화 런타임이 현재 환경에서 시작되지 않아 DOM 기반 Production 화면 검증은 수행하지 못함.

## 수정 여부

- `/api/submit`의 한글 응답 문구 깨짐을 수정함.
- `.gitignore` 보안 점검 항목은 별도 QA 문서에 기록함.
- 새로운 비즈니스 기능은 추가하지 않음.

## 추가 조치 필요 여부

- 권장: 테스트 러너 도입 후 `RuleValidationAgent` 회귀 테스트를 코드화.
- 권장: Preview 환경에서 테스트 표본으로 로그인, 사과/배 수형 분기, 조건부 입력, 차단 제출을 실제 브라우저로 확인.
- 권장: 운영 데이터 생성이 필요한 스모크는 별도 `TEST-*` 표본으로만 수행.
