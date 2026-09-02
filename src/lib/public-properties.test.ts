import { describe, expect, it } from "vitest";
import {
  findPublicPropertyGroup,
  groupPublicProperties,
  normalizeAddressKey,
  normalizePublicBuildingName,
  toPublicAddress,
  type PublicPropertySource,
} from "./public-properties";

function property(overrides: Partial<PublicPropertySource> & Pick<PublicPropertySource, "id" | "name">): PublicPropertySource {
  const { id, name, ...rest } = overrides;
  return {
    id,
    name,
    address: "경기도 수원시 팔달구 인계동 1027-9",
    type: "officetel",
    total_units: 0,
    is_published: true,
    display_order: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...rest,
  };
}

describe("public property privacy normalization", () => {
  it("removes arrow owner text, bracketed names and trailing unit numbers", () => {
    expect(normalizePublicBuildingName("홍길동 → 수원 파크앤시티 1201호", "수원시 팔달구 인계동 1")).toBe(
      "수원 파크앤시티",
    );
    expect(normalizePublicBuildingName("파크앤시티 (홍길동) 1202", "수원시 팔달구 인계동 1")).toBe(
      "파크앤시티",
    );
    expect(normalizePublicBuildingName("아트시티A 김상균->홍민정", "인계동1027-9")).toBe("아트시티A");
    expect(normalizePublicBuildingName("(주) 트라움하임 이장미 1203호", "정릉동693-14")).toBe("트라움하임");
  });

  it("only exposes province, city, district and neighborhood", () => {
    expect(toPublicAddress("경기도 수원시 팔달구 인계동 1027-9, 1201호")).toBe(
      "경기도 수원시 팔달구 인계동",
    );
    expect(toPublicAddress("서울특별시 관악구 시흥대로158가길 25")).toBe("서울특별시 관악구");
    expect(toPublicAddress("인계동1027-9")).toBe("인계동");
    expect(toPublicAddress("서울화곡동459-12")).toBe("서울 화곡동");
    expect(toPublicAddress("이천시송정동375-61")).toBe("이천시 송정동");
    expect(toPublicAddress("일산덕이동1009-3")).toBe("일산 덕이동");
    expect(toPublicAddress("안산 상록구 부곡동 671-8")).toBe("안산 상록구 부곡동");
    expect(normalizeAddressKey("인계동1027-9")).not.toBe(normalizeAddressKey("인계동1028-1"));
  });
});

describe("groupPublicProperties", () => {
  it("groups building and unit rows and prefers unique unit numbers", () => {
    const rows = [
      property({ id: "building", name: "수원 파크앤시티", unit_type: "building", total_units: 50 }),
      property({
        id: "unit-1",
        name: "홍길동 → 수원 파크앤시티 1201호",
        unit_type: "unit",
        parent_building_id: "building",
        unit_no: "1201호",
      }),
      property({
        id: "unit-2",
        name: "김하늘 → 수원 파크앤시티 1202",
        unit_type: "unit",
        parent_building_id: "building",
        unit_no: "1202",
      }),
    ];

    const groups = groupPublicProperties(rows);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      id: "building",
      name: "수원 파크앤시티",
      address: "경기도 수원시 팔달구 인계동",
      region: "경기도 수원시 팔달구",
      totalUnits: 2,
      imagePath: "/images/properties/officetel.webp",
    });
    expect(groups[0].sourceIds).toEqual(["building", "unit-1", "unit-2"]);
  });

  it("attaches a numeric-only row to the unique building at the same address", () => {
    const rows = [
      property({ id: "named", name: "수원 파크앤시티 1201호", unit_type: "unit", unit_no: "1201" }),
      property({ id: "numeric", name: "1202", unit_type: "unit", unit_no: "1202" }),
    ];

    const groups = groupPublicProperties(rows);

    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe("수원 파크앤시티");
    expect(groups[0].totalUnits).toBe(2);
  });

  it("replaces a standalone personal name with a non-identifying locality fallback", () => {
    const groups = groupPublicProperties([
      property({ id: "personal", name: "홍민정", address: "안산 상록구 부곡동 671-8", unit_type: "unit" }),
    ]);

    expect(groups[0].name).toBe("안산 부곡동 관리현장");
    expect(groups[0].name).not.toContain("홍민정");
  });

  it("uses a trustworthy building total when there are no unit rows", () => {
    const groups = groupPublicProperties([
      property({ id: "building", name: "수원 파크앤시티", unit_type: "building", total_units: 50 }),
    ]);

    expect(groups[0].totalUnits).toBe(50);
  });

  it("counts sixty unique rooms without adding the base building row", () => {
    const rows = [
      property({ id: "park", name: "파크앤시티타워", unit_type: "building", total_units: 60 }),
      ...Array.from({ length: 60 }, (_, index) => {
        const unitNo = String(1001 + index);
        return property({
          id: `unit-${unitNo}`,
          name: `파크앤시티타워 ${unitNo}호`,
          unit_type: "unit",
          parent_building_id: "park",
          unit_no: unitNo,
        });
      }),
    ];

    expect(groupPublicProperties(rows)[0].totalUnits).toBe(60);
  });

  it("counts legacy room rows even when every row is marked as a building", () => {
    const rows = [
      property({ id: "legacy-building", name: "파크앤시티타워", unit_type: "building" }),
      ...Array.from({ length: 60 }, (_, index) => {
        const unitNo = String(501 + index);
        return property({
          id: `legacy-${unitNo}`,
          name: `파크앤시티타워 ${unitNo}`,
          unit_type: "building",
        });
      }),
    ];

    expect(groupPublicProperties(rows)[0].totalUnits).toBe(60);
  });

  it("resolves any original id to the same anonymized building", () => {
    const rows = [
      property({ id: "building", name: "수원 파크앤시티", unit_type: "building" }),
      property({
        id: "unit",
        name: "홍길동 → 수원 파크앤시티 1201호",
        unit_type: "unit",
        parent_building_id: "building",
        unit_no: "1201",
      }),
    ];

    expect(findPublicPropertyGroup(rows, "unit")?.id).toBe("building");
    expect(findPublicPropertyGroup(rows, "unit")?.name).toBe("수원 파크앤시티");
  });
});
