/**
 * 해지 정산서 PDF.
 */

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { ensureKoreanFonts } from "./fonts";
import { formatWonSuffix } from "@/lib/money";
import { formatKoreanDate } from "@/lib/dates";
import { COMPANY } from "@/lib/company";

ensureKoreanFonts();

export interface SettlementData {
  lease_id: string;
  tenant_name: string;
  unit_label: string;
  start_date: string;
  termination_date: string;
  deposit: number;
  outstanding: number;
  restore_cost: number;
  refund: number;
  reason: string | null;
}

const styles = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 40, paddingHorizontal: 50, fontFamily: "Pretendard", fontSize: 11 },
  header: { textAlign: "center", marginBottom: 28 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 9, color: "#64748b" },
  hr: { borderBottomColor: "#1c3a5e", borderBottomWidth: 2, marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", marginTop: 16, marginBottom: 8, color: "#1c3a5e" },
  row: { flexDirection: "row", marginBottom: 5 },
  label: { width: 110, color: "#64748b" },
  value: { flex: 1 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  positive: { color: "#15803d", fontWeight: "bold" },
  negative: { color: "#b91c1c", fontWeight: "bold" },
  summary: { backgroundColor: "#f1f5f9", padding: 14, marginTop: 14, borderRadius: 6 },
  refundLabel: { fontSize: 14, fontWeight: "bold" },
  refundValue: { fontSize: 16, fontWeight: "bold", color: "#1c3a5e" },
  footer: { position: "absolute", bottom: 30, left: 50, right: 50, fontSize: 8, color: "#94a3b8", textAlign: "center" },
});

export function SettlementPdf({ data }: { data: SettlementData }) {
  return (
    <Document title={`정산서_${data.unit_label}_${data.termination_date}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>임대차 해지 정산서</Text>
          <Text style={styles.subtitle}>{COMPANY.brand} · {COMPANY.legalName}</Text>
        </View>
        <View style={styles.hr} />

        <Text style={styles.sectionTitle}>계약 정보</Text>
        <View style={styles.row}><Text style={styles.label}>임차인</Text><Text style={styles.value}>{data.tenant_name}</Text></View>
        <View style={styles.row}><Text style={styles.label}>호실</Text><Text style={styles.value}>{data.unit_label}</Text></View>
        <View style={styles.row}><Text style={styles.label}>계약 기간</Text><Text style={styles.value}>{formatKoreanDate(data.start_date)} ~ {formatKoreanDate(data.termination_date)}</Text></View>
        <View style={styles.row}><Text style={styles.label}>계약 번호</Text><Text style={styles.value}>{data.lease_id.slice(0, 8).toUpperCase()}</Text></View>

        <Text style={styles.sectionTitle}>정산 내역</Text>
        <View style={styles.totalRow}>
          <Text>보증금</Text>
          <Text style={styles.positive}>+ {formatWonSuffix(data.deposit)}</Text>
        </View>
        {data.outstanding > 0 && (
          <View style={styles.totalRow}>
            <Text>미납 금액 (연체이자 포함)</Text>
            <Text style={styles.negative}>- {formatWonSuffix(data.outstanding)}</Text>
          </View>
        )}
        {data.restore_cost > 0 && (
          <View style={styles.totalRow}>
            <Text>원상복구비</Text>
            <Text style={styles.negative}>- {formatWonSuffix(data.restore_cost)}</Text>
          </View>
        )}

        <View style={styles.summary}>
          <View style={styles.totalRow}>
            <Text style={styles.refundLabel}>최종 환급액</Text>
            <Text style={styles.refundValue}>{formatWonSuffix(data.refund)}</Text>
          </View>
        </View>

        {data.reason && (
          <>
            <Text style={styles.sectionTitle}>해지 사유</Text>
            <Text>{data.reason}</Text>
          </>
        )}

        <Text style={styles.footer}>
          본 정산서는 시뮬레이션이며, 실제 정산 시 보증금 반환 영수증으로 갈음됩니다. {COMPANY.brand}
        </Text>
      </Page>
    </Document>
  );
}
