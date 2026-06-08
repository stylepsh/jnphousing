/**
 * 답사자 배정 PDF — 물건 1건당 1페이지. 현장에서 손으로 체크 + QR로 모바일 입력 폼 진입.
 * 부동산위탁관리 inspector-pdf.tsx 이식.
 */

import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { ensureKoreanFonts } from "./fonts";
import { COMPANY } from "@/lib/company";

ensureKoreanFonts();

export interface InspectorPdfUnit {
  inspectionId: string;
  caseNumber: string;
  court: string | null;
  category: string | null;
  address: string;
  ownerName: string | null;
  appraisalValue: number | null;
  minimumBid: number | null;
  auctionDate: string | null;
  managerNote: string | null;
  qrDataUrl: string | null; // qrcode.toDataURL 결과
}

export interface InspectorPdfData {
  inspectorName: string;
  printedAt: string;
  units: InspectorPdfUnit[];
}

const styles = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 30, paddingHorizontal: 36, fontFamily: "Pretendard", fontSize: 10 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10, borderBottomWidth: 2, borderColor: "#1c3a5e", paddingBottom: 6 },
  title: { fontSize: 14, fontWeight: "bold" },
  sub: { fontSize: 9, color: "#64748b", marginTop: 2 },
  caseRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  caseNo: { fontSize: 13, fontWeight: "bold", color: "#1d4ed8" },
  addr: { fontSize: 11, marginTop: 4 },
  meta: { fontSize: 9, color: "#475569", marginTop: 2 },
  infoGrid: { flexDirection: "row", gap: 10, marginTop: 8 },
  infoBox: { flex: 1, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4, padding: 6 },
  infoLabel: { fontSize: 7, color: "#94a3b8" },
  infoValue: { fontSize: 10, fontWeight: "bold", marginTop: 1 },
  note: { backgroundColor: "#fef9c3", padding: 6, borderRadius: 4, marginTop: 8, fontSize: 9 },
  section: { marginTop: 12 },
  secTitle: { fontSize: 10, fontWeight: "bold", marginBottom: 4 },
  check: { fontSize: 10, marginBottom: 4 },
  memoLine: { borderBottomWidth: 1, borderColor: "#cbd5e1", height: 16, marginTop: 6 },
  qrWrap: { alignItems: "center", marginLeft: 12 },
  qr: { width: 90, height: 90 },
  qrCaption: { fontSize: 7, color: "#64748b", marginTop: 2, textAlign: "center" },
  footer: { position: "absolute", bottom: 16, left: 36, right: 36, fontSize: 8, color: "#94a3b8", textAlign: "center" },
});

export function AuctionInspectorPdf({ data }: { data: InspectorPdfData }) {
  return (
    <Document title={`답사배정_${data.inspectorName}_${data.printedAt}`}>
      {data.units.map((u, idx) => (
        <Page key={u.inspectionId} size="A4" style={styles.page}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>현장 답사 보고서</Text>
              <Text style={styles.sub}>답사자 {data.inspectorName} · {idx + 1}/{data.units.length}</Text>
            </View>
            <Text style={styles.sub}>{COMPANY.brand} · {data.printedAt}</Text>
          </View>

          <View style={styles.caseRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.caseNo}>{u.caseNumber}{u.category ? `  ·  ${u.category}` : ""}</Text>
              <Text style={styles.addr}>{u.address}</Text>
              <Text style={styles.meta}>{[u.court, u.ownerName].filter(Boolean).join(" · ")}</Text>
            </View>
            {u.qrDataUrl && (
              <View style={styles.qrWrap}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={u.qrDataUrl} style={styles.qr} />
                <Text style={styles.qrCaption}>모바일 입력</Text>
              </View>
            )}
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>감정가</Text>
              <Text style={styles.infoValue}>{u.appraisalValue != null ? u.appraisalValue.toLocaleString() : "-"}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>최저가</Text>
              <Text style={styles.infoValue}>{u.minimumBid != null ? u.minimumBid.toLocaleString() : "-"}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>매각기일</Text>
              <Text style={styles.infoValue}>{u.auctionDate ?? "-"}</Text>
            </View>
          </View>

          {u.managerNote && <Text style={styles.note}>📌 {u.managerNote}</Text>}

          <View style={styles.section}>
            <Text style={styles.secTitle}>① 점유 상태</Text>
            <Text style={styles.check}>☐ 공실    ☐ 점유중    ☐ 재확인</Text>
            <Text style={styles.secTitle}>② 우편물</Text>
            <Text style={styles.check}>☐ 없음    ☐ 정상    ☐ 다량 쌓임</Text>
            <Text style={styles.secTitle}>③ 개문 / 도어락</Text>
            <Text style={styles.check}>☐ 개문 가능    ☐ 개문 불가    ☐ 관리자 확인    ☐ 개문작업 필요   비번: __________</Text>
            <Text style={styles.secTitle}>④ 즉시 상품화 가능성</Text>
            <Text style={styles.check}>☐ 가능    ☐ 보류    ☐ 불가</Text>
            <Text style={styles.secTitle}>⑤ 현장 메모</Text>
            <View style={styles.memoLine} />
            <View style={styles.memoLine} />
            <View style={styles.memoLine} />
          </View>

          <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `${COMPANY.brand}  ·  ${pageNumber} / ${totalPages}`} />
        </Page>
      ))}
    </Document>
  );
}
