/**
 * 경매 답사지 PDF (답사자 현장 체크리스트).
 * 부동산위탁관리 survey-pdf.tsx 이식 — 지역별 그룹/동선 정렬, 가로 A4.
 * auction_property 데이터만으로 렌더 (DB 부작용 없음).
 */

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { ensureKoreanFonts } from "./fonts";
import { COMPANY } from "@/lib/company";

ensureKoreanFonts();

export interface SurveyPdfItem {
  case_number: string;
  court: string | null;
  category: string | null;
  address: string;
  owner_name: string | null;
  creditor: string | null;
  appraisal_value: number | null;
  minimum_bid: number | null;
  auction_date: string | null;
  dividend_deadline: string | null;
}

export interface SurveyPdfData {
  inspectorName: string;
  printedAt: string; // YYYY-MM-DD
  items: SurveyPdfItem[];
}

const styles = StyleSheet.create({
  page: { paddingTop: 24, paddingBottom: 30, paddingHorizontal: 24, fontFamily: "Pretendard", fontSize: 8 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 },
  title: { fontSize: 13, fontWeight: "bold" },
  sub: { fontSize: 8, color: "#64748b", marginTop: 2 },
  infoBox: { flexDirection: "row", gap: 10 },
  infoItem: { fontSize: 8, color: "#334155" },
  groupHeader: { backgroundColor: "#e2e8f0", paddingVertical: 3, paddingHorizontal: 6, marginTop: 10, flexDirection: "row", justifyContent: "space-between" },
  groupName: { fontSize: 9, fontWeight: "bold" },
  groupCount: { fontSize: 8, color: "#475569" },
  // 표
  trHead: { flexDirection: "row", backgroundColor: "#f1f5f9", borderBottomWidth: 1, borderColor: "#cbd5e1" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e2e8f0", minHeight: 36, alignItems: "center" },
  th: { fontSize: 7, fontWeight: "bold", color: "#475569", paddingVertical: 3, paddingHorizontal: 3 },
  td: { fontSize: 7.5, paddingVertical: 3, paddingHorizontal: 3 },
  cNo: { width: 18, textAlign: "center" },
  cAddr: { width: 188 },
  cOwner: { width: 52 },
  cOcc: { width: 66, textAlign: "center" },
  cMail: { width: 30, textAlign: "center" },
  cMeter: { width: 30, textAlign: "center" },
  cNotice: { width: 30, textAlign: "center" },
  cDoor: { width: 30, textAlign: "center" },
  cCode: { width: 60 },
  cMgmt: { width: 88 },
  cMemo: { flex: 1 },
  checkbox: { fontSize: 7.5 },
  caseMono: { fontSize: 7, color: "#1d4ed8" },
  mgmtLabel: { fontSize: 6, color: "#94a3b8" },
  mgmtLine: { borderBottomWidth: 0.5, borderColor: "#cbd5e1", height: 7, marginTop: 2 },
  footer: { position: "absolute", bottom: 14, left: 24, right: 24, fontSize: 7, color: "#94a3b8", textAlign: "center" },
  signature: { marginTop: 12, fontSize: 8, textAlign: "right", color: "#334155" },
});

function regionKey(address: string): string {
  const parts = (address || "").trim().split(/\s+/);
  return parts.slice(0, 3).join(" ") || "(지역 미상)";
}

function groupByRegion(items: SurveyPdfItem[]): [string, SurveyPdfItem[]][] {
  const m = new Map<string, SurveyPdfItem[]>();
  for (const it of items) {
    const k = regionKey(it.address);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(it);
  }
  // 지역 내 주소순, 지역은 건수 많은 순
  for (const [, list] of m) list.sort((a, b) => a.address.localeCompare(b.address));
  return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
}

function Row({ it, no }: { it: SurveyPdfItem; no: number }) {
  return (
    <View style={styles.tr} wrap={false}>
      <Text style={[styles.td, styles.cNo]}>{no}</Text>
      <View style={[styles.td, styles.cAddr]}>
        <Text>{it.address}</Text>
        <Text style={styles.caseMono}>{it.case_number}{it.category ? ` · ${it.category}` : ""}</Text>
      </View>
      <Text style={[styles.td, styles.cOwner]}>
        {it.owner_name ?? "-"}{it.creditor ? `\n${it.creditor.slice(0, 8)}` : ""}
      </Text>
      <Text style={[styles.td, styles.cOcc, styles.checkbox]}>☐공실 ☐거주 ☐재방</Text>
      <Text style={[styles.td, styles.cMail, styles.checkbox]}>O / X</Text>
      <Text style={[styles.td, styles.cMeter, styles.checkbox]}>O / X</Text>
      <Text style={[styles.td, styles.cNotice, styles.checkbox]}>O / X</Text>
      <Text style={[styles.td, styles.cDoor, styles.checkbox]}>Y / N</Text>
      <Text style={[styles.td, styles.cCode]}>비번:</Text>
      <View style={[styles.td, styles.cMgmt]}>
        <Text style={styles.mgmtLabel}>관리실명</Text>
        <View style={styles.mgmtLine} />
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
            <Text style={styles.title}>경매 물건 답사지</Text>
            <Text style={styles.sub}>{COMPANY.brand} · 답사자 {data.inspectorName || "______"}</Text>
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
              <Text style={[styles.th, styles.cNo]}>No</Text>
              <Text style={[styles.th, styles.cAddr]}>상세 주소 / 사건</Text>
              <Text style={[styles.th, styles.cOwner]}>임대인/채권</Text>
              <Text style={[styles.th, styles.cOcc]}>점유상태</Text>
              <Text style={[styles.th, styles.cMail]}>우편</Text>
              <Text style={[styles.th, styles.cMeter]}>계량기</Text>
              <Text style={[styles.th, styles.cNotice]}>안내문</Text>
              <Text style={[styles.th, styles.cDoor]}>개문</Text>
              <Text style={[styles.th, styles.cCode]}>현관비번</Text>
              <Text style={[styles.th, styles.cMgmt]}>관리실</Text>
              <Text style={[styles.th, styles.cMemo]}>비고</Text>
            </View>
            {list.map((it, i) => (
              <Row key={`${it.case_number}-${i}`} it={it} no={i + 1} />
            ))}
          </View>
        ))}

        <Text style={styles.signature}>답사자: {data.inspectorName || "________"} (서명)</Text>
        <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `${COMPANY.brand}  ·  ${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  );
}
