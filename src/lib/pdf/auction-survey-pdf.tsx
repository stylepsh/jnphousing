/**
 * 경매 답사지 PDF (답사자 현장 체크리스트).
 * 부동산위탁관리 survey-pdf.tsx 이식 — 지역별 그룹/동선 정렬, 가로 A4.
 * auction_property 데이터만으로 렌더 (DB 부작용 없음).
 */

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { ensureKoreanFonts } from "./fonts";

ensureKoreanFonts();

export interface SurveyPdfItem {
  property_no: number; // 물건 전역 고유번호 — 어느 답사지에 인쇄돼도 동일 (입력 매칭 키)
  case_number: string;
  court: string | null;
  category: string | null;
  address: string;
  owner_name: string | null;
  survey_status?: string | null; // 'pending' = 이번 답사 대상. vacant/occupied 등 = 기존 답사완료(회색 표시)
  // 아래는 정렬/식별용으로만 받고 1차 답사지에는 인쇄하지 않음
  creditor?: string | null;
  appraisal_value?: number | null;
  minimum_bid?: number | null;
  auction_date?: string | null;
  dividend_deadline?: string | null;
}

export interface SurveyPdfData {
  printedAt: string; // YYYY-MM-DD
  sheetLabel?: string; // 발급 지역 라벨 (어느 답사지인지 종이에서 식별)
  items: SurveyPdfItem[];
}

const styles = StyleSheet.create({
  page: { paddingTop: 18, paddingBottom: 28, paddingHorizontal: 24, fontFamily: "Pretendard", fontSize: 8 },
  groupHeader: { backgroundColor: "#e2e8f0", paddingVertical: 3, paddingHorizontal: 6, marginTop: 10, flexDirection: "row", justifyContent: "space-between" },
  groupName: { fontSize: 9, fontWeight: "bold" },
  groupCount: { fontSize: 8, color: "#475569" },
  // 표
  trHead: { flexDirection: "row", backgroundColor: "#f1f5f9", borderBottomWidth: 1, borderColor: "#cbd5e1" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e2e8f0", minHeight: 40, alignItems: "center" },
  th: { fontSize: 7.5, fontWeight: "bold", color: "#475569", paddingVertical: 4, paddingHorizontal: 3 },
  td: { fontSize: 8, paddingVertical: 4, paddingHorizontal: 3 },
  cNo: { width: 40, textAlign: "center" },
  cAddr: { width: 180 },
  cOwner: { width: 50 },
  cOcc: { width: 84 },
  cMeter: { width: 60 },
  cMail: { width: 84 },
  cCode: { width: 52, textAlign: "center" },
  cMgmt: { width: 78 },
  cMemo: { flex: 1 },
  noBig: { fontSize: 11, fontWeight: "bold", color: "#0f172a", textAlign: "center" },
  caseMono: { fontSize: 7.5, color: "#1d4ed8" },
  ownerFirst: { fontSize: 8, fontWeight: "bold", color: "#0f172a" }, // 임대인 블록 첫 행 = 굵게
  ownerRepeat: { fontSize: 8, color: "#cbd5e1" }, // 같은 임대인 반복 행 = 점선 표기(시각적 그룹핑)
  // 체크칸 — ☐ 글자는 폰트에 없어 안 보이므로 사각형을 직접 그린다.
  checkCell: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  checkItem: { flexDirection: "row", alignItems: "center" },
  box: { width: 10, height: 10, borderWidth: 1, borderColor: "#334155", marginRight: 3, alignItems: "center", justifyContent: "center" },
  boxChecked: { backgroundColor: "#0f172a" },     // 채워진 박스 = 체크됨
  boxCheck: { fontSize: 7, fontWeight: "bold", color: "#ffffff", lineHeight: 1 }, // 박스 안 V
  boxLabel: { fontSize: 8, color: "#0f172a", fontWeight: "bold" },
  mgmtLabel: { fontSize: 6.5, color: "#94a3b8" },
  mgmtLine: { borderBottomWidth: 0.7, borderColor: "#cbd5e1", height: 12 },
  // 기존 답사완료 행 — 회색 줄
  trDone: { backgroundColor: "#f1f5f9" },
  doneTag: { fontSize: 7.5, fontWeight: "bold", color: "#b91c1c" },     // "기존 답사완료" 빨강 강조
  mutedNo: { fontSize: 11, fontWeight: "bold", color: "#94a3b8", textAlign: "center" },
  footer: { position: "absolute", bottom: 14, left: 24, right: 24, fontSize: 7, color: "#94a3b8", textAlign: "center" },
  signature: { marginTop: 12, fontSize: 8, textAlign: "right", color: "#334155" },
});

// 지역 그룹/정렬은 순수 로직이라 .ts 로 분리(테스트·엑셀 공유). 하위호환 위해 재노출.
import { regionKey, groupByRegion, flattenInPrintOrder } from "@/lib/auction/survey-group";
export { regionKey, groupByRegion, flattenInPrintOrder };

// 직접 그린 체크박스 + 라벨 (폰트에 ☐ 글자가 없어 사각형을 그린다). checked면 채워서 V.
function Check({ label, checked }: { label: string; checked?: boolean }) {
  return (
    <View style={styles.checkItem}>
      <View style={[styles.box, checked ? styles.boxChecked : {}]}>
        {checked ? <Text style={styles.boxCheck}>V</Text> : null}
      </View>
      <Text style={styles.boxLabel}>{label}</Text>
    </View>
  );
}

// 재방문(revisit)은 아직 답사 대상이라 회색 처리하지 않는다 (route 의 isDone 과 동일 기준).
const DONE_STATUSES = new Set(["vacant", "occupied", "skip"]);

function Row({ it, ownerFirst }: { it: SurveyPdfItem; ownerFirst: boolean }) {
  // 기존 답사완료 = pending 이 아닌 결과 상태. 회색 줄 + 결과 자동 체크 + "기존 답사완료" 표기.
  const done = !!it.survey_status && DONE_STATUSES.has(it.survey_status);
  const wasVacant = it.survey_status === "vacant";
  const wasOccupied = it.survey_status === "occupied";
  return (
    <View style={[styles.tr, done ? styles.trDone : {}]} wrap={false}>
      <Text style={[styles.td, styles.cNo, done ? styles.mutedNo : styles.noBig]}>{it.property_no}</Text>
      <View style={[styles.td, styles.cAddr]}>
        <Text>{it.address}</Text>
        <Text style={styles.caseMono}>{it.case_number}{it.category ? ` · ${it.category}` : ""}</Text>
      </View>
      {/* 임대인 그룹핑: 블록 첫 행만 임대인명 굵게, 같은 임대인 반복 행은 〃 로 표시 */}
      <Text style={[styles.td, styles.cOwner, ownerFirst ? styles.ownerFirst : styles.ownerRepeat]}>
        {ownerFirst ? (it.owner_name ?? "-") : "〃"}
      </Text>
      <View style={[styles.td, styles.cOcc, styles.checkCell]}>
        <Check label="공실" checked={done && wasVacant} />
        <Check label="거주" checked={done && wasOccupied} />
      </View>
      <View style={[styles.td, styles.cMeter, styles.checkCell]}>
        <Check label="유" />
        <Check label="무" />
      </View>
      <View style={[styles.td, styles.cMail, styles.checkCell]}>
        <Check label="쌓임" />
        <Check label="깨끗" />
      </View>
      <Text style={[styles.td, styles.cCode]}> </Text>
      <View style={[styles.td, styles.cMgmt]}>
        <Text style={styles.mgmtLabel}>관리실 번호</Text>
        <View style={styles.mgmtLine} />
      </View>
      <Text style={[styles.td, styles.cMemo]}>{done ? <Text style={styles.doneTag}>기존 답사완료 · 방문 마세요</Text> : " "}</Text>
    </View>
  );
}

export function AuctionSurveyPdf({ data }: { data: SurveyPdfData }) {
  const groups = groupByRegion(data.items);
  const doneCount = data.items.filter((i) => !!i.survey_status && i.survey_status !== "pending").length;
  const todoCount = data.items.length - doneCount;

  return (
    <Document title={`답사지_${data.printedAt}_${todoCount}건`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {groups.map(([region, list]) => (
          <View key={region}>
            <View style={styles.groupHeader} wrap={false} minPresenceAhead={90}>
              <Text style={styles.groupName}>{region}</Text>
              <Text style={styles.groupCount}>{list.length}건</Text>
            </View>
            <View style={styles.trHead} wrap={false}>
              <Text style={[styles.th, styles.cNo]}>번호</Text>
              <Text style={[styles.th, styles.cAddr]}>상세 주소 / 사건</Text>
              <Text style={[styles.th, styles.cOwner]}>임대인</Text>
              <Text style={[styles.th, styles.cOcc]}>점유상태</Text>
              <Text style={[styles.th, styles.cMeter]}>계량기(유/무)</Text>
              <Text style={[styles.th, styles.cMail]}>우편함</Text>
              <Text style={[styles.th, styles.cCode]}>현관비번</Text>
              <Text style={[styles.th, styles.cMgmt]}>관리실 번호</Text>
              <Text style={[styles.th, styles.cMemo]}>비고</Text>
            </View>
            {list.map((it, i) => (
              <Row
                key={`${it.case_number}-${i}`}
                it={it}
                ownerFirst={i === 0 || (list[i - 1].owner_name ?? "") !== (it.owner_name ?? "")}
              />
            ))}
          </View>
        ))}

        <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  );
}
