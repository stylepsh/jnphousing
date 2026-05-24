/**
 * 공실 매물 정보서 PDF — 부동산 사장님이 고객에게 보여줄 자료.
 */

import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import { ensureKoreanFonts } from "./fonts";
import { formatWonSuffix } from "@/lib/money";
import { formatKoreanDate } from "@/lib/dates";
import { COMPANY } from "@/lib/company";

ensureKoreanFonts();

export interface VacancyInfoData {
  vacancy_id: string;
  property_name: string;
  property_address: string;
  unit_number: string;
  floor: number | null;
  area_pyeong: number | null;
  area_m2: number | null;
  room_count: number | null;
  bathroom_count: number | null;
  deposit: number;
  monthly_rent: number;
  maintenance_fee: number;
  move_in_date: string | null;
  description: string | null;
  image_url: string | null;
  issued_at: string;
}

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 40, paddingHorizontal: 44, fontFamily: "Pretendard", fontSize: 10 },
  brandHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  brandName: { fontSize: 14, fontWeight: "bold", color: "#1c3a5e" },
  brandSub: { fontSize: 8, color: "#64748b", marginTop: 2 },
  rightHeader: { fontSize: 8, color: "#94a3b8", textAlign: "right" },

  title: { fontSize: 22, fontWeight: "bold", marginBottom: 6, color: "#1c3a5e" },
  subtitle: { fontSize: 11, color: "#475569", marginBottom: 16 },

  thumbnail: { width: "100%", height: 220, objectFit: "cover", marginBottom: 18, borderRadius: 4 },
  placeholder: { width: "100%", height: 220, backgroundColor: "#f1f5f9", marginBottom: 18, borderRadius: 4 },

  sectionTitle: { fontSize: 11, fontWeight: "bold", color: "#1c3a5e", marginTop: 14, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: "#1c3a5e", paddingBottom: 4 },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: 90, color: "#64748b" },
  value: { flex: 1 },

  priceBox: { backgroundColor: "#f1f5f9", padding: 14, borderRadius: 4, marginTop: 8 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  priceLabel: { fontWeight: "bold" },
  priceValue: { fontWeight: "bold" },
  priceTotal: { fontSize: 13, color: "#1c3a5e", fontWeight: "bold" },

  description: { fontSize: 10, lineHeight: 1.6, color: "#334155", marginTop: 6 },

  footer: { position: "absolute", bottom: 24, left: 44, right: 44, fontSize: 7, color: "#94a3b8", textAlign: "center", borderTopColor: "#e2e8f0", borderTopWidth: 1, paddingTop: 8 },
});

export function VacancyInfoPdf({ data }: { data: VacancyInfoData }) {
  return (
    <Document title={`매물정보_${data.property_name}_${data.unit_number}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.brandHeader}>
          <View>
            <Text style={styles.brandName}>{COMPANY.brand}</Text>
            <Text style={styles.brandSub}>{COMPANY.parts.join(" · ")} · {COMPANY.yearsOfExperience}년차</Text>
          </View>
          <View>
            <Text style={styles.rightHeader}>공실 매물 정보서</Text>
            <Text style={styles.rightHeader}>발행일 {formatKoreanDate(data.issued_at.slice(0, 10))}</Text>
            <Text style={styles.rightHeader}>문서번호 {data.vacancy_id.slice(0, 8).toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.title}>{data.property_name} · {data.unit_number}호</Text>
        <Text style={styles.subtitle}>{data.property_address}</Text>

        {data.image_url ? (
          <Image src={data.image_url} style={styles.thumbnail} />
        ) : (
          <View style={styles.placeholder} />
        )}

        <Text style={styles.sectionTitle}>임대 조건</Text>
        <View style={styles.priceBox}>
          <View style={styles.priceRow}><Text style={styles.priceLabel}>보증금</Text><Text style={styles.priceValue}>{formatWonSuffix(data.deposit)}</Text></View>
          <View style={styles.priceRow}><Text style={styles.priceLabel}>월세</Text><Text style={styles.priceTotal}>{formatWonSuffix(data.monthly_rent)}</Text></View>
          <View style={styles.priceRow}><Text style={styles.priceLabel}>관리비</Text><Text style={styles.priceValue}>{formatWonSuffix(data.maintenance_fee)}</Text></View>
          {data.move_in_date && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>입주가능일</Text>
              <Text style={styles.priceValue}>{formatKoreanDate(data.move_in_date)}</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>호실 정보</Text>
        {data.area_pyeong != null && (
          <View style={styles.row}>
            <Text style={styles.label}>면적</Text>
            <Text style={styles.value}>{data.area_pyeong}평{data.area_m2 != null ? ` (${data.area_m2}m²)` : ""}</Text>
          </View>
        )}
        {data.floor != null && (
          <View style={styles.row}><Text style={styles.label}>층</Text><Text style={styles.value}>{data.floor}층</Text></View>
        )}
        {data.room_count != null && (
          <View style={styles.row}><Text style={styles.label}>방</Text><Text style={styles.value}>{data.room_count}개</Text></View>
        )}
        {data.bathroom_count != null && (
          <View style={styles.row}><Text style={styles.label}>욕실</Text><Text style={styles.value}>{data.bathroom_count}개</Text></View>
        )}

        {data.description && (
          <>
            <Text style={styles.sectionTitle}>매물 설명</Text>
            <Text style={styles.description}>{data.description}</Text>
          </>
        )}

        <Text style={styles.sectionTitle}>문의</Text>
        <View style={styles.row}><Text style={styles.label}>대표 전화</Text><Text style={styles.value}>{COMPANY.contact.phone}</Text></View>
        <View style={styles.row}><Text style={styles.label}>카카오 채팅</Text><Text style={styles.value}>{COMPANY.contact.kakaoOpenChat.replace("https://", "")}</Text></View>
        <View style={styles.row}><Text style={styles.label}>본점</Text><Text style={styles.value}>{COMPANY.branches[0].address}</Text></View>

        <Text style={styles.footer}>
          본 매물 정보서는 {COMPANY.brand}에서 발행한 정식 자료입니다.
          {"\n"}매물 정보는 변동될 수 있으므로 최종 계약 전 반드시 현장 확인 및 본사 확인 바랍니다.
        </Text>
      </Page>
    </Document>
  );
}
