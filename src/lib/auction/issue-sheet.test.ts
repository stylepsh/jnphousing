import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import { recordSheetIssueWithClient, requireSheetTeamName } from "./issue-sheet";

type Client = Parameters<typeof recordSheetIssueWithClient>[0];

type FakeOptions = {
  propertyIds: string[];
  itemFailureAt?: number;
  propertyFailureAt?: number;
};

function makeClient({ propertyIds, itemFailureAt, propertyFailureAt }: FakeOptions) {
  const calls = {
    headerDeleted: false,
    itemUpserts: 0,
    propertyUpdates: 0,
    restoredIds: [] as string[],
  };
  const previousRows = propertyIds.map((id) => ({
    id,
    sheet_id: "previous-sheet",
    last_issued_at: "2026-08-01T00:00:00.000Z",
    last_issued_team: "기존 팀",
  }));

  const client = {
    from(table: string) {
      if (table === "auction_property") {
        return {
          select() {
            return {
              in: async (_column: string, ids: string[]) => ({
                data: previousRows.filter((row) => ids.includes(row.id)),
                error: null,
              }),
            };
          },
          update() {
            return {
              in: async () => {
                calls.propertyUpdates += 1;
                return {
                  data: null,
                  error: calls.propertyUpdates === propertyFailureAt
                    ? { message: "property update failed" }
                    : null,
                };
              },
              eq: () => ({
                in: async (_column: string, ids: string[]) => {
                  calls.restoredIds.push(...ids);
                  return { data: null, error: null };
                },
              }),
            };
          },
        };
      }

      if (table === "auction_survey_sheet") {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: "new-sheet" }, error: null }),
            }),
          }),
          delete: () => ({
            eq: async () => {
              calls.headerDeleted = true;
              return { data: null, error: null };
            },
          }),
        };
      }

      if (table === "auction_sheet_item") {
        return {
          upsert: async () => {
            calls.itemUpserts += 1;
            return {
              data: null,
              error: calls.itemUpserts === itemFailureAt ? { message: "item upsert failed" } : null,
            };
          },
        };
      }

      throw new Error(`unexpected table: ${table}`);
    },
  };

  return { client: client as unknown as Client, calls };
}

describe("recordSheetIssue", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns a sheet id only after item and property writes succeed", async () => {
    const { client, calls } = makeClient({ propertyIds: ["p1", "p2"] });

    await expect(recordSheetIssueWithClient(client, {
      propertyIds: ["p1", "p2", "p2"],
      regionLabel: "수원 팔달구",
      teamName: "답사팀 A",
      kind: "pdf",
    })).resolves.toEqual({ sheetId: "new-sheet" });

    expect(calls.itemUpserts).toBe(1);
    expect(calls.propertyUpdates).toBe(1);
    expect(calls.headerDeleted).toBe(false);
  });

  it("propagates an item write failure and removes the incomplete header", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { client, calls } = makeClient({ propertyIds: ["p1"], itemFailureAt: 1 });

    await expect(recordSheetIssueWithClient(client, {
      propertyIds: ["p1"],
      regionLabel: "수원 팔달구",
      kind: "xlsx",
    })).rejects.toBeInstanceOf(AppError);

    expect(calls.propertyUpdates).toBe(0);
    expect(calls.headerDeleted).toBe(true);
  });

  it("restores earlier chunks when a later item write fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const ids = Array.from({ length: 301 }, (_, index) => `p${index + 1}`);
    const { client, calls } = makeClient({ propertyIds: ids, itemFailureAt: 2 });

    await expect(recordSheetIssueWithClient(client, {
      propertyIds: ids,
      regionLabel: "수원 팔달구",
      kind: "pdf",
    })).rejects.toBeInstanceOf(AppError);

    expect(calls.propertyUpdates).toBe(1);
    expect(calls.restoredIds).toEqual(ids.slice(0, 300));
    expect(calls.headerDeleted).toBe(true);
  });

  it("never reports success when an auction_property update fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { client, calls } = makeClient({ propertyIds: ["p1"], propertyFailureAt: 1 });

    await expect(recordSheetIssueWithClient(client, {
      propertyIds: ["p1"],
      regionLabel: "수원 팔달구",
      kind: "pdf",
    })).rejects.toBeInstanceOf(AppError);

    expect(calls.headerDeleted).toBe(true);
  });
});

describe("requireSheetTeamName", () => {
  it("trims a valid team name", () => {
    expect(requireSheetTeamName("  답사팀 A  ")).toBe("답사팀 A");
  });

  it.each([undefined, null, "", "   "])("rejects a missing team name: %s", (value) => {
    expect(() => requireSheetTeamName(value)).toThrowError("받는 답사팀을 입력해 주세요.");
  });
});
