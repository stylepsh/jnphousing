import type { PropertyType } from "@/types/database";

/**
 * 공개 홈페이지에서만 사용하는 관리현장 원본 형태.
 *
 * properties 테이블의 내부 데이터는 변경하지 않고, 아래 선택 필드만
 * 건물 단위로 집계·익명화해 공개한다.
 */
export interface PublicPropertySource {
  id: string;
  name: string;
  address: string;
  type: PropertyType;
  total_units: number | null;
  is_published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  unit_type?: "building" | "unit" | null;
  parent_building_id?: string | null;
  unit_no?: string | null;
  ho?: string | null;
  short_alias?: string | null;
  household_count?: number | null;
}

export interface PublicPropertyGroup {
  id: string;
  sourceIds: string[];
  name: string;
  address: string;
  region: string;
  type: PropertyType;
  totalUnits: number;
  imagePath: string;
  updatedAt: string;
  summary?: string;
  focus?: string[];
}

const PROPERTY_IMAGE_PATH: Record<PropertyType, string> = {
  villa: "/images/properties/villa.webp",
  officetel: "/images/properties/officetel.webp",
  apartment: "/images/properties/apartment.webp",
  commercial: "/images/properties/commercial.webp",
};

const REGION_WORDS = new Set([
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
]);

const PLAIN_CITY_PREFIXES = [
  "고양",
  "과천",
  "광명",
  "광주",
  "구리",
  "군포",
  "김포",
  "남양주",
  "동두천",
  "부천",
  "성남",
  "수원",
  "시흥",
  "안산",
  "안성",
  "안양",
  "양주",
  "여주",
  "오산",
  "용인",
  "의왕",
  "의정부",
  "이천",
  "파주",
  "평택",
  "포천",
  "하남",
  "화성",
  "일산",
].sort((a, b) => b.length - a.length);

const COMMON_KOREAN_SURNAMES = new Set(
  [..."김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구민진지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용"],
);

function looksLikePersonName(value: string): boolean {
  return /^[가-힣]{2,4}$/u.test(value) && COMMON_KOREAN_SURNAMES.has(value[0]);
}

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function addressLocalityTokens(address: string): Set<string> {
  return new Set(
    compactWhitespace(address)
      .split(/[\s,/]+/)
      .filter((token) =>
        REGION_WORDS.has(token) ||
        /(?:특별시|광역시|특별자치시|특별자치도|도|시|군|구|읍|면|동|리|가)$/u.test(token),
      ),
  );
}

/** 이름 끝의 3~4자리 호수를 집계용으로 추출한다. */
export function extractUnitNumber(row: PublicPropertySource): string | null {
  const explicit = compactWhitespace(row.unit_no ?? row.ho ?? "")
    .replace(/\s*호(?:실)?$/u, "")
    .replace(/\s+/g, "");
  if (explicit) return explicit.toLocaleUpperCase("ko-KR");

  const match = compactWhitespace(row.name).match(/(?:^|[\s,/_-])([A-Za-z가-힣]?\d{3,4})\s*호?(?:실)?\s*$/u);
  return match?.[1]?.toLocaleUpperCase("ko-KR") ?? null;
}

/**
 * 공개용 건물명. 화살표 왼쪽의 개인 식별 문구, 소유자 표기,
 * 괄호·슬래시로 붙은 개인명과 마지막 호수를 제거한다.
 */
export function normalizePublicBuildingName(name: string, address = ""): string {
  const arrowParts = compactWhitespace(name)
    .split(/\s*(?:→|⇒|➜|▶|->)\s*/u)
    .filter(Boolean);
  const arrowRight = arrowParts.at(-1) ?? "";
  let value = arrowParts.length > 1 && looksLikePersonName(arrowRight) ? arrowParts[0] : arrowRight;

  value = value
    .replace(/\(\s*주\s*\)/gu, "")
    .replace(/(?:소유자|임대인|집주인|대표)\s*[:：]?\s*[가-힣]{2,4}\s*/gu, "")
    .replace(
      /\(\s*(?:(소유자|임대인|집주인|대표)\s*[:：]?\s*)?([가-힣]{2,4})\s*\)/gu,
      (match, role: string | undefined, candidate: string) => role || looksLikePersonName(candidate) ? "" : match,
    )
    .replace(/^\s*([가-힣]{2,4})\s*[/|:：-]\s*/u, (match, candidate: string) =>
      looksLikePersonName(candidate) ? "" : match,
    )
    .replace(/\s*[/|:：-]\s*([가-힣]{2,4})\s*$/u, (match, candidate: string) =>
      looksLikePersonName(candidate) ? "" : match,
    )
    .replace(/\s+(?:제\s*)?\d+\s*층\s*(?:제\s*)?[A-Za-z가-힣]?\d{3,4}\s*호?(?:실)?\s*$/u, "")
    .replace(/(?:^|[\s,/_-])(?:제\s*)?[A-Za-z가-힣]?\d{3,4}\s*호?(?:실)?\s*$/u, "");

  value = compactWhitespace(value.replace(/[()[\]{}]/g, " "));

  const trailingTokens = value.split(" ").filter(Boolean);
  if (trailingTokens.length >= 2 && looksLikePersonName(trailingTokens.at(-1) ?? "")) {
    value = trailingTokens.slice(0, -1).join(" ");
  }

  // "홍길동 건물명 101호"처럼 구분자 없이 붙은 이름은 주소의 지역명이
  // 아니며 뒤에 독립된 건물명이 남는 경우에만 제거한다.
  const tokens = value.split(" ").filter(Boolean);
  if (tokens.length >= 2 && looksLikePersonName(tokens[0])) {
    const locality = addressLocalityTokens(address);
    const isAddressLocality = [...locality].some(
      (token) => token === tokens[0] || token.startsWith(tokens[0]) || tokens[0].startsWith(token),
    );
    if (!isAddressLocality && !REGION_WORDS.has(tokens[0])) {
      value = tokens.slice(1).join(" ");
    }
  }

  return compactWhitespace(value);
}

function normalizeNameKey(name: string): string {
  return name.toLocaleLowerCase("ko-KR").replace(/[^0-9a-z가-힣]/gu, "");
}

/** 호실·우편번호 등 세부 위치를 뺀, 동일 건물 집계용 주소 키. */
export function normalizeAddressKey(address: string): string {
  return compactWhitespace(address)
    .split(/[\/]/u)[0]
    .replace(/^\s*\d{5}\s*/u, "")
    .replace(/\([^)]*\)/gu, " ")
    .replace(/,\s*(?:제\s*)?(?:\d+\s*동\s*)?[A-Za-z가-힣]?\d{3,4}\s*호?(?:실)?.*$/u, "")
    .replace(/\s+(?:제\s*)?(?:\d+\s*동\s*)?[A-Za-z가-힣]?\d{3,4}\s*호(?:실)?.*$/u, "")
    .replace(/\s+/g, "")
    .replace(/[,.]/g, "")
    .toLocaleLowerCase("ko-KR");
}

/** 공개 주소는 도로명·번지·호수를 제외하고 시·구·동 수준까지만 남긴다. */
export function toPublicAddress(address: string): string {
  let remaining = compactWhitespace(address)
    .split(/[\/,]/u)[0]
    .replace(/^\d{5}\s*/u, "")
    .replace(/\([^)]*\)/gu, " ")
    .replace(/\s+/g, "")
    .replace(/\d.*$/u, "");
  const localities: string[] = [];

  const knownRegions = [...REGION_WORDS]
    .concat([
      "서울특별시",
      "부산광역시",
      "대구광역시",
      "인천광역시",
      "광주광역시",
      "대전광역시",
      "울산광역시",
      "세종특별자치시",
      "제주특별자치도",
      "강원특별자치도",
      "경기도",
      "강원도",
      "충청북도",
      "충청남도",
      "전라북도",
      "전라남도",
      "경상북도",
      "경상남도",
      "제주도",
    ])
    .sort((a, b) => b.length - a.length);

  while (remaining) {
    const known = knownRegions.find((region) => remaining.startsWith(region));
    if (known) {
      localities.push(known);
      remaining = remaining.slice(known.length);
      continue;
    }

    const plainCity = PLAIN_CITY_PREFIXES.find(
      (city) =>
        remaining.startsWith(city) &&
        remaining.length > city.length &&
        !/^(?:특별시|광역시|특별자치시|시|군|구|대로|로|길)/u.test(remaining.slice(city.length)),
    );
    if (plainCity) {
      localities.push(plainCity);
      remaining = remaining.slice(plainCity.length);
      continue;
    }

    const administrative = remaining.match(/^([가-힣]+?(?:특별자치시|특별자치도|특별시|광역시|시|군|구|읍|면|동|리|가))/u)?.[1];
    if (!administrative) break;
    localities.push(administrative);
    remaining = remaining.slice(administrative.length);
  }

  return localities.join(" ") || "관리 지역 비공개";
}

export function toPublicRegion(publicAddress: string): string {
  if (publicAddress === "관리 지역 비공개") return publicAddress;
  const broad = publicAddress
    .split(" ")
    .filter((token) => !/(?:읍|면|동|리|가)$/u.test(token));
  return (broad.length ? broad : publicAddress.split(" ")).join(" ");
}

function isAnonymousName(name: string): boolean {
  const key = normalizeNameKey(name);
  return !key || looksLikePersonName(name) || /^\d+$/u.test(key) || /^(?:호실|건물|관리건물|미상)$/u.test(key);
}

function fallbackName(address: string): string {
  const publicAddress = toPublicAddress(address);
  if (publicAddress === "관리 지역 비공개") return "JNP 관리현장";
  const tokens = publicAddress.split(" ");
  const localities = tokens.length > 1 ? [tokens[0], tokens.at(-1)] : tokens;
  return `${localities.filter(Boolean).join(" ")} 관리현장`;
}

function safeDate(value: string | null | undefined): number {
  const time = Date.parse(value ?? "");
  return Number.isFinite(time) ? time : 0;
}

/** published properties 행을 공개 가능한 건물 카드 단위로 변환한다. */
export function groupPublicProperties(rows: PublicPropertySource[]): PublicPropertyGroup[] {
  const published = rows.filter((row) => row.is_published);
  const byId = new Map(published.map((row) => [row.id, row]));

  const contextual = published.map((row) => {
    const parent = row.parent_building_id ? byId.get(row.parent_building_id) : undefined;
    const basis = parent ?? row;
    const address = compactWhitespace(basis.address || row.address);
    const name = normalizePublicBuildingName(basis.short_alias || basis.name, address);
    return { row, parent, address, name, addressKey: normalizeAddressKey(address) };
  });

  const namesByAddress = new Map<string, Map<string, string>>();
  for (const item of contextual) {
    if (isAnonymousName(item.name)) continue;
    const key = normalizeNameKey(item.name);
    const names = namesByAddress.get(item.addressKey) ?? new Map<string, string>();
    names.set(key, item.name);
    namesByAddress.set(item.addressKey, names);
  }

  const groups = new Map<
    string,
    {
      rows: PublicPropertySource[];
      name: string;
      address: string;
      type: PropertyType;
    }
  >();

  for (const item of contextual) {
    let name = item.name;
    if (isAnonymousName(name)) {
      const candidates = namesByAddress.get(item.addressKey);
      if (candidates?.size === 1) name = [...candidates.values()][0];
    }
    if (isAnonymousName(name)) name = fallbackName(item.address);

    const type = item.parent?.type ?? item.row.type;
    const groupKey = `${item.addressKey}|${normalizeNameKey(name)}`;
    const group = groups.get(groupKey) ?? { rows: [], name, address: item.address, type };
    group.rows.push(item.row);
    groups.set(groupKey, group);
  }

  return [...groups.values()]
    .map((group) => {
      const sortedRows = [...group.rows].sort((a, b) => {
        const buildingOrder = Number(a.unit_type === "unit") - Number(b.unit_type === "unit");
        return buildingOrder || a.display_order - b.display_order || a.id.localeCompare(b.id);
      });
      const representative = sortedRows[0];
      const unitRows = sortedRows.filter(
        (row) =>
          row.unit_type === "unit" ||
          Boolean(row.unit_no || row.ho || extractUnitNumber(row)),
      );
      const uniqueUnits = new Set(unitRows.map(extractUnitNumber).filter((value): value is string => Boolean(value)));
      const trustedTotal = Math.max(
        0,
        ...sortedRows
          .filter((row) => row.unit_type !== "unit")
          .map((row) => Number(row.household_count || row.total_units || 0))
          .filter((value) => Number.isFinite(value) && value > 0),
      );
      const totalUnits = uniqueUnits.size || trustedTotal || unitRows.length || sortedRows.length;
      const updatedAt = sortedRows.reduce(
        (latest, row) => (safeDate(row.updated_at) > safeDate(latest) ? row.updated_at : latest),
        representative.updated_at || representative.created_at,
      );
      const address = toPublicAddress(group.address);

      return {
        id: representative.id,
        sourceIds: sortedRows.map((row) => row.id),
        name: group.name,
        address,
        region: toPublicRegion(address),
        type: group.type,
        totalUnits,
        imagePath: PROPERTY_IMAGE_PATH[group.type],
        updatedAt,
      } satisfies PublicPropertyGroup;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ko-KR"));
}

export function findPublicPropertyGroup(
  rows: PublicPropertySource[],
  sourceId: string,
): PublicPropertyGroup | null {
  return groupPublicProperties(rows).find((group) => group.sourceIds.includes(sourceId)) ?? null;
}
