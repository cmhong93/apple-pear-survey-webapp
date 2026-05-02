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
