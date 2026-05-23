# Phase 6 — PDF + 안전한 다운로드 REPORT

작업 일시: 2026-05-23
시작 commit: `631e686`

## PDF 시스템 (`src/lib/pdf/`)
- `fonts.ts`: `Font.register("Pretendard")` — jsdelivr Pretendard Regular/Bold OTF URL 기본값,
  `NEXT_PUBLIC_PRETENDARD_REGULAR_URL` / `_BOLD_URL` 로 override 가능
- `receipt.tsx`: 월세 영수증 (A4) — 임차인/호실/기간/입금일/영수증번호 + 금액 분해(월세/관리비/부가세/합계)
- `settlement.tsx`: 해지 정산서 — 보증금 + 차감 항목 + 최종 환급액
- `storage.ts` (server-only): `presignContractUrl(lease_id, path)` 5분, `uploadPdf(bucket, path, buffer)`

## 다운로드 라우트
- `/admin/rent/invoices/[id]/receipt` (GET, `.tsx`) — `requireAdmin` + `renderToBuffer` 즉시 stream, `Cache-Control: private, no-cache`
- `/tenant/my-lease/contract` (GET) — `getTenantSession` 검증 → `lease.contract_file_path` 존재 시 `presignContractUrl` 발급 → 302 redirect

## UI 변경
- `/admin/rent/invoices/[id]`: 헤더에 "영수증 PDF" 다운로드 버튼 (`paid_total > 0` 일 때만)

## 보안
- contracts/receipts 버킷은 **비공개** (`public: false`, Phase 2에서 생성)
- 다운로드는 무조건 server route 경유 → presigned URL 5분 또는 즉시 stream
- 영수증 PDF: paid > 0 검증 후 발급
- 계약서: session.lease_id 와 일치 확인

## TODO
- 한글 폰트 실제 운영 폰트 파일 (또는 CDN URL 환경변수) — 현재 jsdelivr 의존
- contract PDF 자동 생성 (계약 활성화 시 contract.tsx 작성 후 uploadPdf) — 다음 단계 (P9)
- notice/통지서 PDF — 알림 시스템과 결합 (P7)

## 검증
- `npm run build` ✅ (라우트 +3: tenant/login, my-lease, my-rent, my-lease/contract, invoices/[id]/receipt)
- `npm run test` ✅ 46/46

## 다음
Phase 7 — 알림 시스템 (NotifyChannel 인터페이스 + console/sms/kakao adapter stub).
