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
  page: { paddingTop: 24, paddingBottom: 30, paddingHorizontal: 24, fontFamily: "Pretendard", fontSize: 8 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 },
  title: { fontSize: 13, fontWeight: "bold" },
  legend: { fontSize: 7.5, color: "#64748b", marginTop: 2 },
  sub: { fontSize: 8, color: "#64748b", marginTop: 2 },
  infoBox: { flexDirection: "row", gap: 10 },
  infoItem: { fontSize: 8, color: "#334155" },
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
  cMeter: { width: 46 },
  cMail: { width: 84 },
  cCode: { width: 52, textAlign: "center" },
  cMgmt: { width: 78 },
  cMemo: { flex: 1 },
  noBig: { fontSize: 11, fontWeight: "bold", color: "#0f172a", textAlign: "center" },
  caseMono: { fontSize: 7.5, color: "#1d4ed8" },
  // 체크칸 — ☐ 글자는 폰트에 없어 안 보이므로 사각형을 직접 그린다.
  checkCell: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center" },
  checkItem: { flexDirection: "row", alignItems: "center", marginHorizontal: 3, marginVertical: 1 },
  box: { width: 9, height: 9, borderWidth: 1, borderColor: "#334155", marginRight: 2.5 },
  boxLabel: { fontSize: 8, color: "#0f172a", fontWeight: "bold" },
  mgmtLabel: { fontSize: 6.5, color: "#94a3b8" },
  mgmtLine: { borderBottomWidth: 0.7, borderColor: "#cbd5e1", height: 12 },
  footer: { position: "absolute", bottom: 14, left: 24, right: 24, fontSize: 7, color: "#94a3b8", textAlign: "center" },
  signature: { marginTop: 12, fontSize: 8, textAlign: "right", color: "#334155" },
});

function regionKey(address: string): string {
  const parts = (address || "").trim().split(/\s+/);
  return parts.slice(0, 3).join(" ") || "(지역 미상)";
}

// 지역별 그룹 + 정렬. PDF 레이아웃과 번호 부여(route)가 동일 순서를 쓰도록 공유.
export function groupByRegion<T extends { address: string }>(items: T[]): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = regionKey(it.address);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(it);
  }
  // 지역 내 주소순, 지역은 건수 많은 순
  for (const [, list] of m) list.sort((a, b) => a.address.localeCompare(b.address));
  return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
}

// 답사지에 인쇄되는 순서대로 평탄화 (지역별 그룹·동선 정렬). 번호는 물건 고유번호라
// 정렬과 무관하게 고정 — 여기선 인쇄 레이아웃 순서만 정한다.
export function flattenInPrintOrder<T extends { address: string }>(items: T[]): T[] {
  return groupByRegion(items).flatMap(([, list]) => list);
}

// 직접 그린 체크박스 + 라벨 (폰트에 ☐ 글자가 없어 사각형을 그린다)
function Check({ label }: { label: string }) {
  return (
    <View style={styles.checkItem}>
      <View style={styles.box} />
      <Text style={styles.boxLabel}>{label}</Text>
    </View>
  );
}

function Row({ it }: { it: SurveyPdfItem }) {
  return (
    <View style={styles.tr} wrap={false}>
      <Text style={[styles.td, styles.cNo, styles.noBig]}>{it.property_no}</Text>
      <View style={[styles.td, styles.cAddr]}>
        <Text>{it.address}</Text>
        <Text style={styles.caseMono}>{it.case_number}{it.category ? ` · ${it.category}` : ""}</Text>
      </View>
      <Text style={[styles.td, styles.cOwner]}>{it.owner_name ?? "-"}</Text>
      <View style={[styles.td, styles.cOcc, styles.checkCell]}>
        <Check label="공실" />
        <Check label="거주" />
      </View>
      <View style={[styles.td, styles.cMeter, styles.checkCell]}>
        <Check label="정지" />
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
      <Text style={[styles.td, styles.cMemo]}> </Text>
    </View>
  );
}

export function AuctionSurveyPdf({ data }: { data: SurveyPdfData }) {
  const groups = groupByRegion(data.items);
  const regionCount = groups.length;
  const ownerCount = new Set(data.items.map((i) => i.owner_name || "(미상)")).size;

  return (
    <Document title={`답사지_${data.printedAt}_${data.items.length}건`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.title}>경매 물건 답사지{data.sheetLabel ? ` · ${data.sheetLabel}` : ""}</Text>
            <Text style={styles.legend}>각 줄 앞 물건번호로 입력(전국 고유·발급마다 안 바뀜) · 점유는 공실/거주 중 하나에 V · 우편함 쌓임/깨끗에 V · 계량기 정지·우편 쌓임은 공실 근거</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoItem}>출력일 {data.printedAt}</Text>
            <Text style={styles.infoItem}>총 {data.items.length}건</Text>
            <Text style={styles.infoItem}>지역 {regionCount}</Text>
            <Text style={styles.infoItem}>소유자 {ownerCount}</Text>
          </View>
        </View>

        {groups.map(([region, list]) => (
          <View key={region}>
            <View style={styles.groupHeader} wrap={false}>
              <Text style={styles.groupName}>{region}</Text>
              <Text style={styles.groupCount}>{list.length}건</Text>
            </View>
            <View style={styles.trHead} wrap={false}>
              <Text style={[styles.th, styles.cNo]}>번호</Text>
              <Text style={[styles.th, styles.cAddr]}>상세 주소 / 사건</Text>
              <Text style={[styles.th, styles.cOwner]}>임대인</Text>
              <Text style={[styles.th, styles.cOcc]}>점유상태</Text>
              <Text style={[styles.th, styles.cMeter]}>계량기</Text>
              <Text style={[styles.th, styles.cMail]}>우편함</Text>
              <Text style={[styles.th, styles.cCode]}>현관비번</Text>
              <Text style={[styles.th, styles.cMgmt]}>관리실 번호</Text>
              <Text style={[styles.th, styles.cMemo]}>비고</Text>
            </View>
            {list.map((it, i) => (
              <Row key={`${it.case_number}-${i}`} it={it} />
            ))}
          </View>
        ))}

        <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  );
}
