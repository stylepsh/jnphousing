/**
 * 공실 상세 PDF — 답사결과 공실(상품화 후보) 전체 상세를 임대인별로 출력.
 * (B팀 작업 의뢰서와 별개 — 모든 상세 필드 포함.)
 */
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { ensureKoreanFonts } from "./fonts";
import { AUCTION_BRAND } from "@/lib/company";

ensureKoreanFonts();

export interface VacancyDetailItem {
  owner_name: string | null;
  region: string;
  address: string;
  case_number: string;
  category: string | null;
  creditor_type: string | null;
  mail: string;
  meter: string;
  door_code: string | null;
  memo: string | null;
}

export interface VacancyDetailData {
  printedAt: string;
  items: VacancyDetailItem[];
}

const styles = StyleSheet.create({
  page: { paddingTop: 24, paddingBottom: 30, paddingHorizontal: 20, fontFamily: "Pretendard", fontSize: 8 },
  title: { fontSize: 13, fontWeight: "bold" },
  sub: { fontSize: 8, color: "#64748b", marginTop: 2, marginBottom: 6 },
  trHead: { flexDirection: "row", backgroundColor: "#e0f2fe", borderBottomWidth: 1, borderColor: "#7dd3fc" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e2e8f0", minHeight: 22, alignItems: "center" },
  th: { fontSize: 7, fontWeight: "bold", color: "#075985", paddingVertical: 3, paddingHorizontal: 2 },
  td: { fontSize: 7, paddingVertical: 2.5, paddingHorizontal: 2 },
  cNo: { width: 16, textAlign: "center" },
  cOwner: { width: 56 },
  cRegion: { width: 36 },
  cAddr: { width: 215 },
  cCat: { width: 50 },
  cCred: { width: 28, textAlign: "center" },
  cMeter: { width: 44, textAlign: "center" },
  cDoor: { width: 50 },
  cMemo: { flex: 1 },
  caseMono: { fontSize: 6.5, color: "#1d4ed8" },
  footer: { position: "absolute", bottom: 14, left: 20, right: 20, fontSize: 7, color: "#94a3b8", textAlign: "center" },
});

export function AuctionVacancyDetailPdf({ data }: { data: VacancyDetailData }) {
  return (
    <Document title={`공실상세_${data.printedAt}_${data.items.length}건`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>공실 · 상품화 후보 상세</Text>
        <Text style={styles.sub}>{AUCTION_BRAND} · 출력일 {data.printedAt} · 총 {data.items.length}건 (답사결과 공실)</Text>

        <View style={styles.trHead} fixed>
          <Text style={[styles.th, styles.cNo]}>No</Text>
          <Text style={[styles.th, styles.cOwner]}>임대인</Text>
          <Text style={[styles.th, styles.cRegion]}>지역</Text>
          <Text style={[styles.th, styles.cAddr]}>상세 주소 / 사건</Text>
          <Text style={[styles.th, styles.cCat]}>물건종류</Text>
          <Text style={[styles.th, styles.cCred]}>채권</Text>
          <Text style={[styles.th, styles.cMeter]}>우편/계량</Text>
          <Text style={[styles.th, styles.cDoor]}>현관비번</Text>
          <Text style={[styles.th, styles.cMemo]}>메모(관리실·비고)</Text>
        </View>

        {data.items.map((it, i) => (
          <View key={i} style={styles.tr} wrap={false}>
            <Text style={[styles.td, styles.cNo]}>{i + 1}</Text>
            <Text style={[styles.td, styles.cOwner]}>{it.owner_name ?? "-"}</Text>
            <Text style={[styles.td, styles.cRegion]}>{it.region || "-"}</Text>
            <View style={[styles.td, styles.cAddr]}>
              <Text>{it.address}</Text>
              {it.case_number ? <Text style={styles.caseMono}>{it.case_number}</Text> : null}
            </View>
            <Text style={[styles.td, styles.cCat]}>{it.category ?? "-"}</Text>
            <Text style={[styles.td, styles.cCred]}>{it.creditor_type ?? "-"}</Text>
            <Text style={[styles.td, styles.cMeter]}>{`${it.mail || "-"}/${it.meter || "-"}`}</Text>
            <Text style={[styles.td, styles.cDoor]}>{it.door_code ?? "-"}</Text>
            <Text style={[styles.td, styles.cMemo]}>{it.memo ?? "-"}</Text>
          </View>
        ))}

        <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) =>
          `${AUCTION_BRAND} · 공실 상품화 후보 · ${pageNumber}/${totalPages}`
        } />
      </Page>
    </Document>
  );
}
