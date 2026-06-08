/**
 * 공실 인계 리스트 PDF (B팀 작업 의뢰서).
 * 부동산위탁관리 vacant-list-pdf.tsx 이식 — 확정 공실 물건 + 작업 체크.
 */

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { ensureKoreanFonts } from "./fonts";
import { COMPANY } from "@/lib/company";

ensureKoreanFonts();

export interface VacantPdfItem {
  case_number: string;
  address: string;
  owner_name: string | null;
  pipeline_state: string;
  inspector_name: string | null;
  inspector_comment: string | null;
}

export interface VacantPdfData {
  printedAt: string;
  items: VacantPdfItem[];
}

const STATE_LABEL: Record<string, string> = {
  Approved: "승인",
  WorkPrep: "상품화준비",
  Merchandising: "상품화진행",
  Available: "임대가능",
};

const styles = StyleSheet.create({
  page: { paddingTop: 24, paddingBottom: 30, paddingHorizontal: 24, fontFamily: "Pretendard", fontSize: 8 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 4 },
  title: { fontSize: 13, fontWeight: "bold" },
  badge: { fontSize: 8, color: "#7c3aed", fontWeight: "bold" },
  sub: { fontSize: 8, color: "#64748b", marginTop: 2 },
  trHead: { flexDirection: "row", backgroundColor: "#ede9fe", borderBottomWidth: 1, borderColor: "#c4b5fd", marginTop: 8 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e2e8f0", minHeight: 34, alignItems: "center" },
  th: { fontSize: 7, fontWeight: "bold", color: "#5b21b6", paddingVertical: 3, paddingHorizontal: 3 },
  td: { fontSize: 7.5, paddingVertical: 3, paddingHorizontal: 3 },
  cNo: { width: 18, textAlign: "center" },
  cAddr: { width: 200 },
  cOwner: { width: 70 },
  cMemo: { width: 200 },
  cWork: { flex: 1 },
  caseMono: { fontSize: 7, color: "#1d4ed8" },
  footer: { position: "absolute", bottom: 14, left: 24, right: 24, fontSize: 7, color: "#94a3b8", textAlign: "center" },
});

export function AuctionVacantPdf({ data }: { data: VacantPdfData }) {
  return (
    <Document title={`공실인계_${data.printedAt}_${data.items.length}건`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.title}>공실 인계 리스트 <Text style={styles.badge}>(B팀 작업 의뢰서)</Text></Text>
            <Text style={styles.sub}>{COMPANY.brand} · 출력일 {data.printedAt} · 총 {data.items.length}건</Text>
          </View>
        </View>

        <View style={styles.trHead} wrap={false}>
          <Text style={[styles.th, styles.cNo]}>No</Text>
          <Text style={[styles.th, styles.cAddr]}>상세 주소 / 사건</Text>
          <Text style={[styles.th, styles.cOwner]}>임대인/답사자</Text>
          <Text style={[styles.th, styles.cMemo]}>답사자 메모</Text>
          <Text style={[styles.th, styles.cWork]}>B팀 작업 체크</Text>
        </View>

        {data.items.map((it, i) => (
          <View key={`${it.case_number}-${i}`} style={styles.tr} wrap={false}>
            <Text style={[styles.td, styles.cNo]}>{i + 1}</Text>
            <View style={[styles.td, styles.cAddr]}>
              <Text>{it.address}</Text>
              <Text style={styles.caseMono}>{it.case_number} · {STATE_LABEL[it.pipeline_state] ?? it.pipeline_state}</Text>
            </View>
            <Text style={[styles.td, styles.cOwner]}>
              {it.owner_name ?? "-"}{it.inspector_name ? `\n답사:${it.inspector_name}` : ""}
            </Text>
            <Text style={[styles.td, styles.cMemo]}>{it.inspector_comment ?? "-"}</Text>
            <Text style={[styles.td, styles.cWork]}>☐개문 ☐청소 ☐도배 ☐도어락 ☐사진 ☐관리실 ☐광고 ☐임차완료</Text>
          </View>
        ))}

        <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) =>
          `각 호실 작업 완료 시 체크 → 임차 완료 시 A팀 회신  ·  ${COMPANY.brand}  ·  ${pageNumber}/${totalPages}`
        } />
      </Page>
    </Document>
  );
}
