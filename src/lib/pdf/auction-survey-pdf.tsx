/**
 * 경매 답사지 PDF (답사자 현장 체크리스트).
 * 부동산위탁관리 survey-pdf.tsx 이식 — 지역별 그룹/동선 정렬, 가로 A4.
 * auction_property 데이터만으로 렌더 (DB 부작용 없음).
 */

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { ensureKoreanFonts } from "./fonts";

ensureKoreanFonts();

export interface SurveyPdfItem {
  survey_seq: number; // 출력 시 부여된 통짜 번호(1~N) — 입력 매칭 키
  case_number: string;
  court: string | null;
  category: string | null;
  address: string;
  owner_name: string | null;
  // 이미 답사한 물건은 빈칸이 아니라 결과를 박아서 출력 → 답사자 재방문 방지
  survey_status?: string | null; // pending | vacant | occupied | revisit | skip
  survey_date?: string | null; // YYYY-MM-DD
  // 아래는 정렬/식별용으로만 받고 1차 답사지에는 인쇄하지 않음
  creditor?: string | null;
  appraisal_value?: number | null;
  minimum_bid?: number | null;
  auction_date?: string | null;
  dividend_deadline?: string | null;
}

/** 이미 답사가 끝나 재방문이 불필요한 상태 (답사지에 결과를 박아 패스 처리) */
function surveyedLabel(status: string | null | undefined): { text: string; color: string } | null {
  switch (status) {
    case "vacant":
      return { text: "✔ 이미 공실 확인 · 상품화 대상", color: "#047857" }; // emerald
    case "occupied":
      return { text: "✔ 이미 거주 확인 · 대상 아님", color: "#be123c" }; // rose
    case "skip":
      return { text: "✔ 제외 처리됨", color: "#64748b" };
    default:
      return null; // pending / revisit → 답사 대상(빈칸 또는 재방문)
  }
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
  trDone: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e2e8f0", minHeight: 26, alignItems: "center", backgroundColor: "#f1f5f9" },
  th: { fontSize: 7.5, fontWeight: "bold", color: "#475569", paddingVertical: 4, paddingHorizontal: 3 },
  td: { fontSize: 8, paddingVertical: 4, paddingHorizontal: 3 },
  cNo: { width: 34, textAlign: "center" },
  cAddr: { width: 230 },
  cOwner: { width: 64 },
  cOcc: { width: 86, textAlign: "center" },
  cMeter: { width: 58, textAlign: "center" },
  cMail: { width: 58, textAlign: "center" },
  cCode: { width: 72, textAlign: "center" },
  cMemo: { flex: 1 },
  noBig: { fontSize: 13, fontWeight: "bold", color: "#0f172a", textAlign: "center" },
  noMuted: { fontSize: 11, fontWeight: "bold", color: "#94a3b8", textAlign: "center" },
  occBig: { fontSize: 9, fontWeight: "bold", color: "#0f172a" },
  doneBadge: { fontSize: 8, fontWeight: "bold" },
  muted: { color: "#94a3b8" },
  revisitTag: { fontSize: 7, fontWeight: "bold", color: "#b45309" },
  checkbox: { fontSize: 8 },
  caseMono: { fontSize: 7.5, color: "#1d4ed8" },
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

// 답사지에 인쇄되는 순서대로 평탄화 — route가 이 순서로 survey_seq(1~N)를 부여한다.
export function flattenInPrintOrder<T extends { address: string }>(items: T[]): T[] {
  return groupByRegion(items).flatMap(([, list]) => list);
}

function Row({ it }: { it: SurveyPdfItem }) {
  const done = surveyedLabel(it.survey_status);

  // 이미 답사 끝난 물건 — 회색 줄로 압축, "가지 마세요" 한 줄.
  if (done) {
    const dateNote = it.survey_date ? ` (${it.survey_date})` : "";
    return (
      <View style={styles.trDone} wrap={false}>
        <Text style={[styles.td, styles.cNo, styles.noMuted]}>{it.survey_seq}</Text>
        <View style={[styles.td, styles.cAddr]}>
          <Text style={styles.muted}>{it.address}</Text>
          <Text style={[styles.caseMono, styles.muted]}>
            {it.case_number}{it.category ? ` · ${it.category}` : ""}
          </Text>
        </View>
        <Text style={[styles.td, styles.cOwner, styles.muted]}>{it.owner_name ?? "-"}</Text>
        <Text style={[styles.td, { flex: 1 }, styles.doneBadge, { color: done.color }]}>
          {done.text}{dateNote} — 방문 불필요
        </Text>
      </View>
    );
  }

  // 미답사 / 재방문 — 빈칸으로 출력 (재방문은 태그로 표시)
  const revisit = it.survey_status === "revisit";
  return (
    <View style={styles.tr} wrap={false}>
      <Text style={[styles.td, styles.cNo, styles.noBig]}>{it.survey_seq}</Text>
      <View style={[styles.td, styles.cAddr]}>
        <Text>{it.address}</Text>
        <Text style={styles.caseMono}>
          {it.case_number}{it.category ? ` · ${it.category}` : ""}
          {revisit ? <Text style={styles.revisitTag}>  · 재방문 요망</Text> : ""}
        </Text>
      </View>
      <Text style={[styles.td, styles.cOwner]}>{it.owner_name ?? "-"}</Text>
      <Text style={[styles.td, styles.cOcc, styles.occBig]}>☐ 공실   ☐ 거주</Text>
      <Text style={[styles.td, styles.cMeter, styles.checkbox]}>정지 ☐</Text>
      <Text style={[styles.td, styles.cMail, styles.checkbox]}>쌓임 ☐</Text>
      <Text style={[styles.td, styles.cCode]}> </Text>
      <Text style={[styles.td, styles.cMemo]}> </Text>
    </View>
  );
}

export function AuctionSurveyPdf({ data }: { data: SurveyPdfData }) {
  const groups = groupByRegion(data.items);
  const regionCount = groups.length;
  const ownerCount = new Set(data.items.map((i) => i.owner_name || "(미상)")).size;
  const doneCount = data.items.filter((i) => surveyedLabel(i.survey_status)).length;
  const todoCount = data.items.length - doneCount;

  return (
    <Document title={`답사지_${data.printedAt}_${data.items.length}건`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.title}>경매 물건 답사지{data.sheetLabel ? ` · ${data.sheetLabel}` : ""}</Text>
            <Text style={styles.legend}>각 줄 앞 번호로 입력 · 점유는 ☐공실 / ☐거주 중 하나만 · 계량기 정지·우편 쌓임은 공실 근거</Text>
            <Text style={styles.legend}>※ 회색 줄 = 이미 답사 완료된 물건입니다. 방문하지 마세요.</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoItem}>출력일 {data.printedAt}</Text>
            <Text style={styles.infoItem}>총 {data.items.length}건</Text>
            <Text style={[styles.infoItem, { fontWeight: "bold", color: "#0f172a" }]}>방문 {todoCount}</Text>
            <Text style={[styles.infoItem, { color: "#94a3b8" }]}>완료(패스) {doneCount}</Text>
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
