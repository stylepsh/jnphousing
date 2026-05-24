/**
 * 월세 영수증 PDF.
 *
 * 사용:
 *   import { renderToBuffer } from "@react-pdf/renderer";
 *   const buf = await renderToBuffer(<ReceiptPdf data={...} />);
 */

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { ensureKoreanFonts } from "./fonts";
import { formatWonSuffix } from "@/lib/money";
import { formatKoreanDateWithDay } from "@/lib/dates";
import { COMPANY } from "@/lib/company";

ensureKoreanFonts();

export interface ReceiptData {
  invoice_id: string;
  issued_at: string;          // ISO
  paid_at: string;            // ISO
  tenant_name: string;
  unit_label: string;         // "샘플 오피스텔 A · 502호"
  amount_rent: number;
  amount_management: number;
  amount_vat: number;
  amount_total: number;
  paid_amount: number;
  period_label: string;       // "2026년 5월"
}

const styles = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 40, paddingHorizontal: 50, fontFamily: "Pretendard", fontSize: 11 },
  header: { textAlign: "center", marginBottom: 32 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 9, color: "#64748b" },
  hr: { borderBottomColor: "#1c3a5e", borderBottomWidth: 2, marginBottom: 24 },
  row: { flexDirection: "row", marginBottom: 6 },
  label: { width: 90, color: "#64748b" },
  value: { flex: 1 },
  total: { backgroundColor: "#f1f5f9", padding: 12, marginTop: 18, borderRadius: 6 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totalLabel: { fontWeight: "bold" },
  totalValue: { fontWeight: "bold" },
  bigTotal: { fontSize: 16, color: "#1c3a5e", fontWeight: "bold" },
  footer: { position: "absolute", bottom: 30, left: 50, right: 50, fontSize: 8, color: "#94a3b8", textAlign: "center" },
});

export function ReceiptPdf({ data }: { data: ReceiptData }) {
  return (
    <Document title={`영수증_${data.unit_label}_${data.period_label}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>영 수 증</Text>
          <Text style={styles.subtitle}>{COMPANY.brand} · {COMPANY.legalName}</Text>
        </View>
        <View style={styles.hr} />

        <View style={styles.row}><Text style={styles.label}>임차인</Text><Text style={styles.value}>{data.tenant_name}</Text></View>
        <View style={styles.row}><Text style={styles.label}>호실</Text><Text style={styles.value}>{data.unit_label}</Text></View>
        <View style={styles.row}><Text style={styles.label}>대상 기간</Text><Text style={styles.value}>{data.period_label}</Text></View>
        <View style={styles.row}><Text style={styles.label}>입금일</Text><Text style={styles.value}>{formatKoreanDateWithDay(data.paid_at.slice(0, 10))}</Text></View>
        <View style={styles.row}><Text style={styles.label}>영수증 번호</Text><Text style={styles.value}>{data.invoice_id.slice(0, 8).toUpperCase()}</Text></View>

        <View style={styles.total}>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>월세</Text><Text style={styles.totalValue}>{formatWonSuffix(data.amount_rent)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>관리비</Text><Text style={styles.totalValue}>{formatWonSuffix(data.amount_management)}</Text></View>
          {data.amount_vat > 0 && (
            <View style={styles.totalRow}><Text style={styles.totalLabel}>부가세</Text><Text style={styles.totalValue}>{formatWonSuffix(data.amount_vat)}</Text></View>
          )}
          <View style={{ ...styles.totalRow, marginTop: 10, borderTopColor: "#cbd5e1", borderTopWidth: 1, paddingTop: 8 }}>
            <Text style={styles.bigTotal}>합계 (입금액)</Text>
            <Text style={styles.bigTotal}>{formatWonSuffix(data.paid_amount)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          {COMPANY.brand} · {COMPANY.branches[0].address} · 발행일 {new Date().toLocaleDateString("ko-KR")}
        </Text>
      </Page>
    </Document>
  );
}
