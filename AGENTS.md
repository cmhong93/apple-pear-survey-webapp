# Apple Pear Survey Webapp Agents

## Project Rules

- This repository is the source of truth for the 2026 Chungnam apple/pear survey DX webapp.
- Vercel hosts the webapp and API routes.
- Google Sheets is the MVP data store.
- Google Drive stores original photos, watermarked derivatives, MyGPS660 screen evidence, and NAS-ready package artifacts.
- Gemini is a QA assistant only. It never makes the final approval decision.
- Kakao Map/Local API supports admin map views and geocoding checks.
- Tablet survey submissions are the source of truth. Photos, GPS, watermarks, and NAS package files are evidence artifacts.

## Security Rules

- Never expose server secrets to client components or `NEXT_PUBLIC_*` variables.
- Keep Google, Gemini, Kakao REST, admin, and service account secrets server-only.
- Do not commit `.env.local`, `.vercel`, `node_modules`, or `dist`.
- Do not put farmer names, phone numbers, resident numbers, or bank account data in watermarks.
- API routes must validate role and intent again on the server. Do not rely on frontend checks.
- Keep external integrations stubbed unless the relevant environment variables are configured.

## MVP Agents

- `FormGuideAgent`: provides survey form guidance and missing-context hints.
- `RuleValidationAgent`: checks required fields, photos, GPS, and MyGPS660 evidence.
- `GeoEvidenceAgent`: compares app GPS, MyGPS660 coordinates, and sample coordinates.
- `VisionQaAgent`: safely stubs Gemini image checks until real integration is enabled.
- `EvidenceMatchingAgent`: combines form, rule, geo, and vision evidence.
- `IssueGenerationAgent`: creates Korean repair request messages for admins.
- `NasPackagingAgent`: prepares approved evidence for NAS packaging.

## Implementation Notes

- Build must pass after every PR.
- Prefer small PRs: one feature, one reviewable change.
- Use typed data structures from `types/`.
- Keep integration clients lazy and server-only.
