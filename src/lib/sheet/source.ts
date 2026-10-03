import "server-only";
import { importPKCS8, SignJWT } from "jose";
import { unstable_cache } from "next/cache";
import { parseAllSheet, type Cell, type SheetSnapshot } from "./all-parser";

/**
 * ALL 탭을 읽어 판정까지 끝낸 스냅샷. 5분 캐시, "지금 새로고침"은 revalidateTag(SHEET_TAG).
 *
 * 운영: 구글 서비스 계정(읽기 전용)으로 Sheets API 호출 — 셀 배경색까지 받아야 해서 CSV 내보내기는 못 쓴다.
 *   GOOGLE_SA_EMAIL, GOOGLE_SA_PRIVATE_KEY(PEM, \n 이스케이프 허용), DM_SHEET_ID
 * 개발: DM_SHEET_XLSX_PATH 에 내려받은 엑셀 경로를 주면 그 파일을 읽는다(운영에선 무시).
 */

export const SHEET_TAG = "dm-sheet";
const rangeOf = (tab: string) => `'${tab.replace(/'/g, "''")}'!A1:DZ3000`;

function devXlsxPath(): string | null {
  return process.env.NODE_ENV !== "production" && process.env.DM_SHEET_XLSX_PATH ? process.env.DM_SHEET_XLSX_PATH : null;
}

const scriptConfigured = () => !!(process.env.DM_SHEET_SCRIPT_URL && process.env.DM_SHEET_SCRIPT_TOKEN);

export function sheetConfigured(): boolean {
  return scriptConfigured() || !!(process.env.GOOGLE_SA_EMAIL && process.env.GOOGLE_SA_PRIVATE_KEY && process.env.DM_SHEET_ID) || devXlsxPath() !== null;
}

export function todayKst(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

const hex = (n: number | undefined) => Math.round((n ?? 0) * 255).toString(16).padStart(2, "0").toUpperCase();

function toBg(c: { red?: number; green?: number; blue?: number } | undefined): string | null {
  if (!c) return null;
  const h = hex(c.red) + hex(c.green) + hex(c.blue);
  return h === "FFFFFF" ? null : h;
}

// 시트 날짜 일련번호(1899-12-30 기준) → ISO
const serialToIso = (n: number) => new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400_000).toISOString().slice(0, 10);

async function googleToken(): Promise<string> {
  const email = process.env.GOOGLE_SA_EMAIL!;
  const key = await importPKCS8(process.env.GOOGLE_SA_PRIVATE_KEY!.replace(/\\n/g, "\n"), "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/spreadsheets.readonly" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`구글 인증 실패 (${res.status}) — 서비스 계정 키를 확인하세요.`);
  return ((await res.json()) as { access_token: string }).access_token;
}

type GCell = {
  formattedValue?: string;
  effectiveValue?: { numberValue?: number };
  effectiveFormat?: { backgroundColor?: { red?: number; green?: number; blue?: number }; numberFormat?: { type?: string } };
};

async function gridFromGoogle(tab: string): Promise<Cell[][]> {
  const token = await googleToken();
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${process.env.DM_SHEET_ID}` +
    `?ranges=${encodeURIComponent(rangeOf(tab))}&includeGridData=true` +
    `&fields=${encodeURIComponent("sheets.data.rowData.values(formattedValue,effectiveValue.numberValue,effectiveFormat(backgroundColor,numberFormat.type))")}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (res.status === 403) throw new Error("시트 접근 권한이 없습니다 — 시트를 서비스 계정 이메일에 '뷰어'로 공유하세요.");
  if (!res.ok) throw new Error(`시트 읽기 실패 (${res.status})`);
  const body = (await res.json()) as { sheets?: { data?: { rowData?: { values?: GCell[] }[] }[] }[] };
  const rows = body.sheets?.[0]?.data?.[0]?.rowData ?? [];
  return rows.map((r) =>
    (r.values ?? []).map((c) => {
      const t = c.effectiveFormat?.numberFormat?.type;
      const n = c.effectiveValue?.numberValue;
      const v = (t === "DATE" || t === "DATE_TIME") && n !== undefined ? serialToIso(n) : (c.formattedValue ?? "");
      return { v, bg: toBg(c.effectiveFormat?.backgroundColor) };
    }),
  );
}

async function gridFromScript(tab: string): Promise<Cell[][]> {
  const url = `${process.env.DM_SHEET_SCRIPT_URL}?token=${encodeURIComponent(process.env.DM_SHEET_SCRIPT_TOKEN!)}&tab=${encodeURIComponent(tab)}`;
  const res = await fetch(url, { cache: "no-store", redirect: "follow" });
  if (!res.ok) throw new Error(`시트 스크립트 호출 실패 (${res.status}) — 웹앱 배포 주소를 확인하세요.`);
  const body = (await res.json().catch(() => null)) as { values?: string[][]; bgs?: string[][]; error?: string } | null;
  if (body?.error === "no_tab") throw new Error(`시트에 '${tab}' 탭이 없습니다.`);
  if (!body?.values) throw new Error(body?.error === "forbidden" ? "시트 스크립트 토큰이 맞지 않습니다." : "시트 스크립트 응답 형식이 올바르지 않습니다.");
  return body.values.map((row, i) =>
    row.map((v, j) => {
      const bg = (body.bgs?.[i]?.[j] ?? "").replace("#", "").toUpperCase();
      return { v: String(v ?? ""), bg: bg && bg !== "FFFFFF" ? bg : null };
    }),
  );
}

async function gridFromXlsx(path: string, tab: string): Promise<Cell[][]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const ws = wb.getWorksheet(tab);
  if (!ws) throw new Error(`엑셀에 '${tab}' 탭이 없습니다.`);
  const grid: Cell[][] = [];
  ws.eachRow({ includeEmpty: true }, (row, n) => {
    const cells: Cell[] = [];
    row.eachCell({ includeEmpty: true }, (c, i) => {
      let x: unknown = c.value;
      if (x && typeof x === "object" && "result" in x) x = (x as { result: unknown }).result;
      if (x && typeof x === "object" && "richText" in x) x = (x as { richText: { text: string }[] }).richText.map((t) => t.text).join("");
      const v = x instanceof Date ? x.toISOString().slice(0, 10) : x == null || typeof x === "object" ? "" : String(x);
      const argb = c.fill && c.fill.type === "pattern" && c.fill.pattern === "solid" ? c.fill.fgColor?.argb : undefined;
      cells[i - 1] = { v, bg: argb && argb.slice(2).toUpperCase() !== "FFFFFF" ? argb.slice(2).toUpperCase() : null };
    });
    grid[n - 1] = Array.from(cells, (c) => c ?? { v: "", bg: null });
  });
  return Array.from(grid, (r) => r ?? []);
}

/** 탭 하나를 셀 격자로 읽는다(캐시 없음). 격자는 2MB 캐시 한도를 넘을 수 있어 각 로더가 파싱 결과를 캐시한다. */
export async function fetchGrid(tab: string): Promise<Cell[][]> {
  const xlsx = devXlsxPath();
  if (xlsx) return gridFromXlsx(xlsx, tab);
  return scriptConfigured() ? gridFromScript(tab) : gridFromGoogle(tab);
}

export const loadSheetSnapshot = unstable_cache(
  async (): Promise<SheetSnapshot & { fetchedAt: string }> => {
    return { ...parseAllSheet(await fetchGrid("ALL"), todayKst()), fetchedAt: new Date().toISOString() };
  },
  ["dm-sheet-all-v2"],
  { revalidate: 300, tags: [SHEET_TAG] },
);
