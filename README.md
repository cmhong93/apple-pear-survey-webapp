# Apple Pear Survey Webapp

MVP foundation for the 2026 Chungnam apple/pear survey DX workflow.

## Roles

- GitHub: source of truth
- Vercel: webapp, API routes, and deployments
- Google Sheets: MVP data store
- Google Drive: evidence file storage
- Gemini: QA assistant only
- Kakao: admin map and geocode support
- NAS: existing upload and client review workflow remains unchanged

## Local Setup

```powershell
npm.cmd install
npm.cmd run dev
```

Build:

```powershell
npm.cmd run build
```

## Environment

Copy `.env.example` to `.env.local` or pull from Vercel:

```powershell
vercel.cmd env pull .env.local
```

Never commit `.env.local`, `.vercel`, `node_modules`, or `dist`.

## Google Sheets Schema

`sample_master` is the operational source of truth. It may contain fieldwork PII and must stay in
Google Sheets, not GitHub.

Required/standard columns:

```text
sample_id
crop
variety
farmer_name
phone
mobile_phone
province
city
town
home_address
field_address
surveyor_id
survey_month
status
field_lat
field_lng
original_file
pnu
notes
```

Korean source headers from `충남_대전필지제외` are also accepted by the importer, including `ID`,
`품목`, `품종`, `이름`, `전화번호`, `휴대전화`, `시도`, `시군구`, `자택주소`, `필지주소`, `조사원`,
`팜맵 PNU`, and `특이사항`.

## MVP Foundation

This PR establishes:

- Next.js App Router shell
- Surveyor and admin page shells
- API route skeletons
- TypeScript domain types
- Mock sample master and survey templates
- Agentic QA module skeletons
- Safe Google Sheets, Drive, Gemini, Kakao, GPS, watermark, NAS stubs

Real external calls are intentionally deferred until the dedicated integration PRs.
