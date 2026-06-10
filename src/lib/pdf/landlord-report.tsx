/**
 * 임대인 월간 보고서 PDF.
 */

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { ensureKoreanFonts } from "./fonts";
import { formatWonSuffix } from "@/lib/money";
import { formatKoreanDate } from "@/lib/dates";
import { COMPANY } from "@/lib/company";

ensureKoreanFonts();

export interface LandlordReportData {
  landlord_name: string;
  period_label: string;        // "2026년 5월"
  period_start: string;
  period_end: string;
  total_billing: number;
  total_paid: number;
  total_outstanding: number;
  total_commission: number;
  net_payout: number;
  unit_breakdown: {
    unit_label: string;        // "건물명 · 호실"
    tenant_name: string;
    billing: number;
    paid: number;
    status: string;
    overdue_days: number;
  }[];
  generated_at: string;
}

const styles = StyleSheet.create({
  page: { paddingTop: 38, paddingBottom: 40, paddingHorizontal: 44, fontFamily: "Pretendard", fontSize: 10 },
  brandHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  brandName: { fontSize: 13, fontWeight: "bold", color: "#1c3a5e" },
  brandSub: { fontSize: 8, color: "#64748b", marginTop: 2 },
  rightHeader: { fontSize: 8, color: "#94a3b8", textAlign: "right" },

  title: { fontSize: 20, fontWeight: "bold", color: "#1c3a5e", marginBottom: 2 },
  subtitle: { fontSize: 11, color: "#475569", marginBottom: 16 },

  sectionTitle: { fontSize: 12, fontWeight: "bold", color: "#1c3a5e", marginTop: 16, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: "#1c3a5e", paddingBottom: 4 },

  summaryGrid: { flexDirection: "row", gap: 8, marginBottom: 10 },
  summaryCard: { flex: 1, backgroundColor: "#f1f5f9", padding: 10, borderRadius: 4 },
  summaryLabel: { fontSize: 8, color: "#64748b" },
  summaryValue: { fontSize: 13, fontWeight: "bold", marginTop: 4 },
  summaryHighlight: { color: "#1c3a5e" },
  summaryDanger: { color: "#b91c1c" },
  summarySuccess: { color: "#15803d" },

  payoutBox: { backgroundColor: "#1c3a5e", padding: 14, borderRadius: 4, marginTop: 8 },
  payoutLabel: { color: "#cbd5e1", fontSize: 10 },
  payoutValue: { color: "#ffffff", fontSize: 18, fontWeight: "bold", marginTop: 4 },

  table: { marginTop: 6 },
  tableHeader: { flexDirection: "row", backgroundColor: "#1c3a5e", padding: 6, borderRadius: 2 },
  th: { color: "#ffffff", fontSize: 9, fontWeight: "bold" },
  tableRow: { flexDirection: "row", padding: 6, borderBottomWidth: 0.5, borderBottomColor: "#cbd5e1" },
  td: { fontSize: 9 },
  colUnit: { flex: 2 },
  colTenant: { flex: 1.5 },
  colBilling: { flex: 1, textAlign: "right" },
  colPaid: { flex: 1, textAlign: "right" },
  colStatus: { flex: 0.8, textAlign: "right" },

  footer: { position: "absolute", bottom: 24, left: 44, right: 44, fontSize: 7, color: "#94a3b8", textAlign: "center", borderTopColor: "#e2e8f0", borderTopWidth: 1, paddingTop: 8 },
});

const STATUS_KO: Record<string, string> = {
  unpaid: "미납",
  partial: "부분납",
  paid: "완납",
  overdue: "연체",
  waived: "면제",
};

export function LandlordReportPdf({ data }: { data: LandlordReportData }) {
  return (
    <Document title={`보고서_${data.landlord_name}_${data.period_label}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.brandHeader}>
          <View>
            <Text style={styles.brandName}>{COMPANY.brand}</Text>
            <Text style={styles.brandSub}>{COMPANY.legalName} · 위탁임대 전문</Text>
          </View>
          <View>
            <Text style={styles.rightHeader}>임대인 월간 보고서</Text>
            <Text style={styles.rightHeader}>발행일 {formatKoreanDate(data.generated_at.slice(0, 10))}</Text>
          </View>
        </View>

        <Text style={styles.title}>{data.landlord_name} 임대인님 정산 보고서</Text>
        <Text style={styles.subtitle}>{data.period_label} ({formatKoreanDate(data.period_start)} ~ {formatKoreanDate(data.period_end)})</Text>

        <Text style={styles.sectionTitle}>요약</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>이번달 청구</Text>
            <Text style={styles.summaryValue}>{formatWonSuffix(data.total_billing)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>수금 완료</Text>
            <Text style={{ ...styles.summaryValue, ...styles.summarySuccess }}>{formatWonSuffix(data.total_paid)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>미수 잔액</Text>
            <Text style={{ ...styles.summaryValue, ...styles.summaryDanger }}>{formatWonSuffix(data.total_outstanding)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>위탁수수료</Text>
            <Text style={styles.summaryValue}>{formatWonSuffix(data.total_commission)}</Text>
          </View>
        </View>

        <View style={styles.payoutBox}>
          <Text style={styles.payoutLabel}>임대인 실수령 예상액 (수금 − 수수료)</Text>
          <Text style={styles.payoutValue}>{formatWonSuffix(data.net_payout)}</Text>
        </View>

        <Text style={styles.sectionTitle}>호실별 상세</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.th, ...styles.colUnit }}>건물 · 호실</Text>
            <Text style={{ ...styles.th, ...styles.colTenant }}>임차인</Text>
            <Text style={{ ...styles.th, ...styles.colBilling }}>청구</Text>
            <Text style={{ ...styles.th, ...styles.colPaid }}>수금</Text>
            <Text style={{ ...styles.th, ...styles.colStatus }}>상태</Text>
          </View>
          {data.unit_breakdown.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={{ ...styles.td, flex: 1, textAlign: "center", color: "#94a3b8" }}>해당 기간 청구·납부 데이터가 없습니다.</Text>
            </View>
          ) : (
            data.unit_breakdown.map((u, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={{ ...styles.td, ...styles.colUnit }}>{u.unit_label}</Text>
                <Text style={{ ...styles.td, ...styles.colTenant }}>{u.tenant_name}</Text>
                <Text style={{ ...styles.td, ...styles.colBilling }}>{formatWonSuffix(u.billing)}</Text>
                <Text style={{ ...styles.td, ...styles.colPaid }}>{formatWonSuffix(u.paid)}</Text>
                <Text style={{ ...styles.td, ...styles.colStatus }}>
                  {STATUS_KO[u.status] ?? u.status}
                  {u.overdue_days > 0 ? ` (${u.overdue_days}일)` : ""}
                </Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.footer}>
          본 보고서는 {COMPANY.brand}에서 발행한 정식 정산 자료입니다.
          {"\n"}문의 {COMPANY.contact.phone} · 대표 {COMPANY.representative} · 사업자번호 {COMPANY.legal.registrationNumber}
        </Text>
      </Page>
    </Document>
  );
}
