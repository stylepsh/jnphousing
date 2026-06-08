"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Trash2,
  MapPin,
  Filter,
  Search,
  X,
  Shuffle,
  ShieldCheck,
  Printer,
  Workflow,
  CheckSquare,
  Square,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatWon } from "@/lib/money";
import { rejectAuctionProperties } from "./actions";
import { selectForSurvey } from "../pipeline/actions";
import { cn } from "@/lib/utils";

export interface PoolItem {
  id: string;
  case_number: string;
  court: string | null;
  address: string;
  owner_name: string;
  creditor: string | null;
  creditor_type: "HUG" | "SGI" | "OTHER" | null;
  category: string | null;
  appraisal_value: number | null;
  minimum_bid: number | null;
  auction_date: string | null;
  dividend_deadline: string | null;
}

const CREDITOR_BADGE: Record<string, string> = {
  HUG: "bg-blue-100 text-blue-700",
  SGI: "bg-purple-100 text-purple-700",
  OTHER: "bg-slate-100 text-slate-600",
};

const OWNER_FALLBACK = "(소유자 미상)";

export function PoolList({ items }: { items: PoolItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // 물건 선택
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // 단일 임대인 상세 필터
  const [filterOwner, setFilterOwner] = useState<string | null>(null);
  // 검색
  const [ownerSearch, setOwnerSearch] = useState("");
  const [regionSearch, setRegionSearch] = useState("");
  // 최소 N건 이상 임대인만 (잡건 배제, 기본 3)
  const [minPerOwner, setMinPerOwner] = useState(3);
  // 샘플 기준: 임대인별 / 지역별
  const [sampleMode, setSampleMode] = useState<"owner" | "region">("owner");
  // 임대인 카드 다중 선택 (샘플링 대상 한정)
  const [selectedOwners, setSelectedOwners] = useState<Set<string>>(new Set());
  // 드래그 박스
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const ownerKey = (p: PoolItem) => p.owner_name || OWNER_FALLBACK;
  // 지역 키 = 주소 앞 3토큰 (시 구 동)
  const regionKey = (p: PoolItem) => {
    const parts = (p.address || "").trim().split(/\s+/);
    return parts.slice(0, 3).join(" ") || "(지역 미상)";
  };

  // 1) 검색 (소유주명 AND 지역)
  const searchedItems = useMemo(() => {
    const oq = ownerSearch.trim().toLowerCase();
    const rq = regionSearch.trim().toLowerCase();
    if (!oq && !rq) return items;
    return items.filter((p) => {
      if (oq && !(p.owner_name ?? "").toLowerCase().includes(oq)) return false;
      if (rq && !(p.address ?? "").toLowerCase().includes(rq)) return false;
      return true;
    });
  }, [items, ownerSearch, regionSearch]);

  // 2) 소유자별 그룹화
  const allGroups = useMemo(() => {
    const m = new Map<string, PoolItem[]>();
    for (const p of searchedItems) {
      const k = ownerKey(p);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [searchedItems]);

  // 3) 최소 N건 필터
  const filteredGroups = useMemo(
    () => allGroups.filter(([, list]) => list.length >= minPerOwner),
    [allGroups, minPerOwner],
  );
  const filteredItems = useMemo(() => filteredGroups.flatMap(([, l]) => l), [filteredGroups]);

  // 지역별 그룹 (칩 + 지역별 샘플링용) — 현재 표시 풀 기준
  const regionGroups = useMemo(() => {
    const m = new Map<string, PoolItem[]>();
    for (const p of filteredItems) {
      const k = regionKey(p);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filteredItems]);

  // 4) 단일 임대인 필터
  const groups = useMemo(() => {
    if (!filterOwner) return filteredGroups;
    return filteredGroups.filter(([owner]) => owner === filterOwner);
  }, [filteredGroups, filterOwner]);

  const visibleItems = filterOwner
    ? searchedItems.filter((i) => ownerKey(i) === filterOwner)
    : filteredItems;
  const allSelected = visibleItems.length > 0 && visibleItems.every((i) => selected.has(i.id));
  const partiallySelected = !allSelected && visibleItems.some((i) => selected.has(i.id));

  // ===== 선택 =====
  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function toggleGroup(group: PoolItem[]) {
    const all = group.every((i) => selected.has(i.id));
    setSelected((s) => {
      const n = new Set(s);
      group.forEach((i) => (all ? n.delete(i.id) : n.add(i.id)));
      return n;
    });
  }
  function clearAll() {
    setSelected(new Set());
  }
  function selectAll() {
    setSelected(new Set(visibleItems.map((i) => i.id)));
  }

  // ===== 탐색답사: N건 샘플링 (임대인별 / 지역별) =====
  function sampleN(arr: PoolItem[], n: number, into: Set<string>) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    shuffled.slice(0, Math.min(n, arr.length)).forEach((p) => into.add(p.id));
  }

  function doSample(n: number) {
    if (sampleMode === "region") return sampleByRegion(n);
    return samplePerOwner(n);
  }

  function samplePerOwner(n: number) {
    const source =
      selectedOwners.size > 0
        ? filteredGroups.filter(([owner]) => selectedOwners.has(owner))
        : filteredGroups;
    if (source.length === 0) {
      toast.error("샘플링할 임대인이 없습니다. 최소건수·검색 조건을 확인하세요.");
      return;
    }
    const sampled = new Set<string>();
    for (const [, list] of source) sampleN(list, n, sampled);
    setSelected(sampled);
    toast.success(
      `임대인 ${source.length}명${selectedOwners.size > 0 ? " (선택분)" : ""} × 최대 ${n}건 = ${sampled.size}건 샘플링`,
    );
  }

  function sampleByRegion(n: number) {
    const source = regionGroups;
    if (source.length === 0) {
      toast.error("샘플링할 지역이 없습니다. 최소건수·검색 조건을 확인하세요.");
      return;
    }
    const sampled = new Set<string>();
    for (const [, list] of source) sampleN(list, n, sampled);
    setSelected(sampled);
    toast.success(`지역 ${source.length}곳 × 최대 ${n}건 = ${sampled.size}건 샘플링`);
  }

  // ===== 임대인 카드 다중 선택 =====
  function toggleOwner(owner: string) {
    setSelectedOwners((s) => {
      const n = new Set(s);
      if (n.has(owner)) n.delete(owner);
      else n.add(owner);
      return n;
    });
  }
  function clearOwnerSelection() {
    setSelectedOwners(new Set());
  }
  function selectAllVisibleOwners() {
    setSelectedOwners(new Set(filteredGroups.map(([owner]) => owner)));
  }

  // ===== 드래그 박스 선택 =====
  function handleGridMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest("button, input, a, [data-no-drag]")) return;
    if (!gridRef.current || e.button !== 0) return;
    const rect = gridRef.current.getBoundingClientRect();
    setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragCurrent({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }
  function handleGridMouseMove(e: React.MouseEvent) {
    if (!dragStart || !gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    setDragCurrent({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }
  function handleGridMouseUp(e: React.MouseEvent) {
    if (!dragStart || !dragCurrent || !gridRef.current) {
      setDragStart(null);
      setDragCurrent(null);
      return;
    }
    const dist = Math.hypot(dragCurrent.x - dragStart.x, dragCurrent.y - dragStart.y);
    if (dist < 5) {
      setDragStart(null);
      setDragCurrent(null);
      return;
    }
    const containerRect = gridRef.current.getBoundingClientRect();
    const dragRect = {
      left: Math.min(dragStart.x, dragCurrent.x),
      top: Math.min(dragStart.y, dragCurrent.y),
      right: Math.max(dragStart.x, dragCurrent.x),
      bottom: Math.max(dragStart.y, dragCurrent.y),
    };
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    const next = new Set<string>(additive ? selectedOwners : []);
    cardRefs.current.forEach((el, owner) => {
      const r = el.getBoundingClientRect();
      const rel = {
        left: r.left - containerRect.left,
        top: r.top - containerRect.top,
        right: r.right - containerRect.left,
        bottom: r.bottom - containerRect.top,
      };
      if (rel.left < dragRect.right && rel.right > dragRect.left && rel.top < dragRect.bottom && rel.bottom > dragRect.top) {
        next.add(owner);
      }
    });
    setSelectedOwners(next);
    setDragStart(null);
    setDragCurrent(null);
  }

  // ===== 답사 선정 (파이프라인) =====
  function handleSelectForPipeline(ids: string[]) {
    if (ids.length === 0) return;
    startTransition(async () => {
      const res = await selectForSurvey(ids);
      if (!res.ok) {
        toast.error(res.error ?? "선정 실패");
        return;
      }
      toast.success(`${res.count}건 답사 선정 — 파이프라인 배정 대기로 이동`);
      setSelected(new Set());
      router.refresh();
    });
  }

  // ===== 삭제(후보 풀 제외) =====
  function deleteIds(ids: string[], label: string) {
    if (ids.length === 0) return;
    if (!confirm(`${label} ${ids.length}건을 후보 풀에서 제외할까요? (데이터는 보존됩니다)`)) return;
    startTransition(async () => {
      const res = await rejectAuctionProperties(ids);
      if (!res.ok) {
        toast.error(res.error ?? "제외 실패");
        return;
      }
      toast.success(`${res.rejected}건 제외 완료`);
      setSelected(new Set());
      router.refresh();
    });
  }

  // ===== 답사지 PDF (부작용 없음) =====
  async function printPdf() {
    if (selected.size === 0) {
      toast.error("선택된 물건이 없습니다.");
      return;
    }
    try {
      const res = await fetch("/admin/auction/pipeline/survey-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "PDF 생성 실패");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `답사지_${dateStr}_${selected.size}건.pdf`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success(`답사지 PDF ${selected.size}건 생성`);
    } catch {
      toast.error("PDF 발급 실패");
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card px-4 py-12 text-center text-muted-foreground">
        수집된 미답사 경매 물건이 없습니다. 위에서 텍스트를 붙여넣어 수집하세요.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── 검색 바 ── */}
      <div className="rounded-xl border bg-card p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              value={ownerSearch}
              onChange={(e) => setOwnerSearch(e.target.value)}
              placeholder="소유주명 검색 (예: 김민영)"
              className="w-full pl-9 pr-8 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {ownerSearch && (
              <button onClick={() => setOwnerSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              value={regionSearch}
              onChange={(e) => setRegionSearch(e.target.value)}
              placeholder="지역(주소) 검색 (예: 인천, 부평구, 갈현동)"
              className="w-full pl-9 pr-8 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {regionSearch && (
              <button onClick={() => setRegionSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        {(ownerSearch || regionSearch) && (
          <p className="text-xs text-muted-foreground mt-2">
            검색 결과: 임대인 <strong className="text-foreground">{allGroups.length}명</strong> · 물건{" "}
            <strong className="text-foreground">{searchedItems.length}건</strong> (전체 {items.length}건 중)
            <button onClick={() => { setOwnerSearch(""); setRegionSearch(""); }} className="ml-2 underline text-blue-700 hover:text-blue-900">전체보기</button>
          </p>
        )}
      </div>

      {/* ── 컨트롤 바 ── */}
      <div className="sticky top-0 z-20 rounded-xl border border-blue-200 bg-blue-50 p-3 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={allSelected ? clearAll : selectAll}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border-2 border-blue-500 hover:bg-blue-50 text-sm font-bold text-blue-700"
          >
            {allSelected ? <CheckSquare className="w-4 h-4" /> : partiallySelected ? <div className="w-4 h-4 flex items-center justify-center"><div className="w-2.5 h-2.5 bg-blue-600 rounded-sm" /></div> : <Square className="w-4 h-4" />}
            {allSelected ? "전체 해제" : "전체 선택"}
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-blue-900">
              {selected.size > 0 ? (
                <>
                  {selected.size}건 선택됨
                  <span className="text-xs font-normal text-blue-700 ml-2">/ 표시 {filteredItems.length}건 / 전체 {items.length}건</span>
                </>
              ) : (
                <span className="text-blue-700">
                  표시 {filteredItems.length}건 · 임대인 {filteredGroups.length}명
                  <span className="text-xs font-normal ml-2">(최소 {minPerOwner}건 이상 / 전체 {items.length}건 중)</span>
                </span>
              )}
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {/* 샘플 기준 토글 */}
              <div className="inline-flex items-center rounded-md border border-indigo-200 overflow-hidden text-[11px] font-bold">
                <button
                  onClick={() => setSampleMode("owner")}
                  className={cn("px-2 py-0.5", sampleMode === "owner" ? "bg-indigo-600 text-white" : "bg-white text-indigo-700 hover:bg-indigo-50")}
                >
                  임대인별
                </button>
                <button
                  onClick={() => setSampleMode("region")}
                  className={cn("px-2 py-0.5 border-l border-indigo-200", sampleMode === "region" ? "bg-indigo-600 text-white" : "bg-white text-indigo-700 hover:bg-indigo-50")}
                >
                  지역별
                </button>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700">
                <Shuffle className="w-3 h-3" /> 탐색답사
              </span>
              {[2, 3, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => doSample(n)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[11px] font-bold hover:bg-indigo-200"
                  title={`${sampleMode === "region" ? "지역" : "임대인"}별 최대 ${n}건 샘플링`}
                >
                  {n}건씩
                </button>
              ))}
              <div className="inline-flex items-center gap-1 text-[11px] bg-white px-1.5 py-0.5 rounded-md border border-blue-200">
                <Filter className="w-3 h-3 text-blue-700" />
                <span className="text-blue-700 font-bold">최소</span>
                <select value={minPerOwner} onChange={(e) => setMinPerOwner(Number(e.target.value))} className="bg-transparent text-xs font-bold text-blue-700 focus:outline-none cursor-pointer">
                  <option value={1}>1건</option>
                  <option value={2}>2건</option>
                  <option value={3}>3건</option>
                  <option value={5}>5건</option>
                  <option value={10}>10건</option>
                </select>
                <span className="text-blue-700">이상만</span>
              </div>
              {selectedOwners.size > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[11px] font-bold">
                  <ShieldCheck className="w-3 h-3" /> 임대인 {selectedOwners.size}명 선택 · 샘플링 시 이 임대인만
                  <button onClick={clearOwnerSelection} className="ml-1 hover:text-purple-900"><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          </div>

          {selected.size > 0 && (
            <Button size="sm" disabled={pending} onClick={() => handleSelectForPipeline(Array.from(selected))} className="gap-1">
              <Workflow className="w-3.5 h-3.5" /> 답사 선정 ({selected.size})
            </Button>
          )}
          {selected.size > 0 && (
            <Button size="sm" variant="destructive" disabled={pending} onClick={() => deleteIds(Array.from(selected), "선택한")} className="gap-1">
              <Trash2 className="w-3.5 h-3.5" /> 제외
            </Button>
          )}
          <Button size="sm" variant="outline" disabled={pending || selected.size === 0} onClick={printPdf} className="gap-1.5">
            <Printer className="w-4 h-4" />
            {selected.size > 0 ? `답사지 인쇄 (${selected.size})` : "답사지 인쇄"}
          </Button>
        </div>

        {filterOwner && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-blue-200">
            <Filter className="w-3.5 h-3.5 text-blue-700" />
            <span className="text-xs font-bold text-blue-900">임대인 상세: <strong>{filterOwner}</strong></span>
            <button onClick={() => setFilterOwner(null)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-blue-300 text-xs font-bold text-blue-700 hover:bg-blue-50">
              <X className="w-3 h-3" /> 전체 보기
            </button>
          </div>
        )}
      </div>

      {/* ── 지역 빠른 필터 칩 ── */}
      {regionGroups.length > 1 && (
        <div className="rounded-xl border bg-card p-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <MapPin className="w-3.5 h-3.5 text-teal-600" />
            <span className="text-[11px] font-bold text-muted-foreground">
              지역 {regionGroups.length}곳 · 칩을 누르면 그 지역만 (지역별 샘플과 함께 쓰면 동선 답사에 편리)
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {regionGroups.slice(0, 18).map(([region, list]) => {
              const active = regionSearch.trim() === region;
              return (
                <button
                  key={region}
                  onClick={() => setRegionSearch(active ? "" : region)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition",
                    active ? "bg-teal-600 text-white border-teal-600" : "bg-background hover:bg-muted border-border",
                  )}
                >
                  {region}
                  <span className={cn("font-bold", active ? "text-teal-100" : "text-muted-foreground")}>{list.length}</span>
                </button>
              );
            })}
            {regionGroups.length > 18 && (
              <span className="text-[11px] text-muted-foreground self-center">외 {regionGroups.length - 18}곳…(검색으로 좁히기)</span>
            )}
          </div>
        </div>
      )}

      {/* ── 임대인 카드 그리드 + 드래그 선택 ── */}
      {filteredGroups.length > 1 && (
        <div>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
            <p className="text-[11px] text-muted-foreground">
              💡 임대인 카드 체크박스(우상단) 또는 카드 위 드래그 → 다중 선택 (Shift/Ctrl+드래그=누적) → <strong>탐색답사</strong>
            </p>
            <div className="flex items-center gap-2">
              <button onClick={selectAllVisibleOwners} className="text-[11px] text-purple-700 hover:underline font-bold">표시중 임대인 전체 선택</button>
              {selectedOwners.size > 0 && (
                <>
                  <span className="text-slate-300">|</span>
                  <button onClick={clearOwnerSelection} className="text-[11px] text-purple-700 hover:underline font-bold">선택 해제</button>
                </>
              )}
            </div>
          </div>
          <div
            ref={gridRef}
            onMouseDown={handleGridMouseDown}
            onMouseMove={handleGridMouseMove}
            onMouseUp={handleGridMouseUp}
            onMouseLeave={handleGridMouseUp}
            className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 select-none"
          >
            {filteredGroups.map(([owner, list]) => {
              const someSel = list.some((i) => selected.has(i.id));
              const isFiltered = filterOwner === owner;
              const isOwnerSelected = selectedOwners.has(owner);
              const totalAppraisal = list.reduce((s, p) => s + (p.appraisal_value ?? 0), 0);
              return (
                <div
                  key={`card-${owner}`}
                  ref={(el) => { if (el) cardRefs.current.set(owner, el); else cardRefs.current.delete(owner); }}
                  className={cn(
                    "rounded-xl border bg-card p-3 text-left transition-all hover:shadow-md relative",
                    isOwnerSelected ? "ring-2 ring-purple-500 bg-purple-50" : isFiltered ? "ring-2 ring-blue-600 bg-blue-50" : someSel ? "ring-1 ring-blue-300 bg-blue-50/50" : "",
                  )}
                >
                  <input
                    type="checkbox"
                    data-no-drag
                    checked={isOwnerSelected}
                    onChange={() => toggleOwner(owner)}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute top-2 right-2 w-4 h-4 z-10 accent-purple-600 cursor-pointer"
                    title="이 임대인을 탐색답사 대상에 추가/제거"
                  />
                  <button onClick={() => setFilterOwner(isFiltered ? null : owner)} className="w-full text-left pr-6" title={isFiltered ? "필터 해제" : "이 임대인 물건만 보기"}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0">{(owner[0] ?? "?").toUpperCase()}</div>
                      <span className="font-bold text-sm truncate flex-1">{owner}</span>
                      {isFiltered && <Filter className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                    </div>
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-xl font-black text-blue-700">{list.length}<span className="text-[10px] font-bold text-muted-foreground ml-0.5">건</span></span>
                      {someSel && (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">{list.filter((i) => selected.has(i.id)).length} 선택</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">감정가 {formatWon(totalAppraisal)}</p>
                  </button>
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                    <button onClick={() => toggleGroup(list)} className="flex-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100 px-1.5 py-1 rounded">
                      {list.every((i) => selected.has(i.id)) ? "전체 해제" : "전체 선택"}
                    </button>
                    <button onClick={() => deleteIds(list.map((i) => i.id), `${owner}의`)} disabled={pending} className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 hover:bg-rose-100 px-1.5 py-1 rounded" title="이 임대인 전체 제외">
                      <Trash2 className="w-3 h-3" /> 전체제외
                    </button>
                  </div>
                </div>
              );
            })}
            {dragStart && dragCurrent && Math.hypot(dragCurrent.x - dragStart.x, dragCurrent.y - dragStart.y) >= 5 && (
              <div
                className="absolute border-2 border-purple-500 bg-purple-200/30 pointer-events-none rounded"
                style={{
                  left: Math.min(dragStart.x, dragCurrent.x),
                  top: Math.min(dragStart.y, dragCurrent.y),
                  width: Math.abs(dragCurrent.x - dragStart.x),
                  height: Math.abs(dragCurrent.y - dragStart.y),
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* ── 소유자별 상세 그룹 ── */}
      {groups.length === 0 && (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
          {ownerSearch || regionSearch
            ? "검색 조건에 맞는 임대인이 없습니다. 검색어 또는 최소건수 필터를 조정하세요."
            : `최소 ${minPerOwner}건 이상의 임대인이 없습니다. 최소건수를 낮춰보세요.`}
        </div>
      )}
      {groups.map(([owner, list]) => {
        const groupAll = list.every((i) => selected.has(i.id));
        const groupSome = list.some((i) => selected.has(i.id));
        return (
          <div key={owner} className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border-b border-blue-200">
              <button onClick={() => toggleGroup(list)} className="inline-flex items-center justify-center w-6 h-6 rounded border-2 border-blue-600 bg-white shrink-0">
                {groupAll ? <CheckSquare className="w-4 h-4 text-blue-700" /> : groupSome ? <div className="w-3 h-3 bg-blue-600 rounded-sm" /> : <Square className="w-4 h-4 text-blue-300" />}
              </button>
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 font-black">{(owner[0] ?? "?").toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-lg font-black truncate">{owner}</span>
                  <span className="text-sm font-bold text-blue-700 bg-white px-2.5 py-0.5 rounded-full">{list.length}건</span>
                  {list.filter((i) => selected.has(i.id)).length > 0 && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{list.filter((i) => selected.has(i.id)).length}건 선택</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <User className="w-3 h-3" /> 임대인(소유자) · 합계 감정가 {formatWon(list.reduce((s, p) => s + (p.appraisal_value ?? 0), 0))}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 w-8"></th>
                    <th className="px-3 py-2">사건번호</th>
                    <th className="px-3 py-2">주소</th>
                    <th className="px-3 py-2">채권자</th>
                    <th className="px-3 py-2 text-right">감정가</th>
                    <th className="px-3 py-2 text-right">최저가</th>
                    <th className="px-3 py-2">매각기일</th>
                    <th className="px-3 py-2">배당종기일</th>
                    <th className="px-3 py-2 w-12 text-center">제외</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => toggle(p.id)}
                      className={cn("border-b cursor-pointer", selected.has(p.id) ? "bg-blue-50" : "hover:bg-muted/40")}
                    >
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} onClick={(e) => e.stopPropagation()} className="w-4 h-4" />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-blue-700">
                        {p.court && <div className="text-[10px] text-muted-foreground">{p.court}</div>}
                        {p.case_number}
                      </td>
                      <td className="px-3 py-2 text-sm">{p.address}</td>
                      <td className="px-3 py-2 text-xs">
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", CREDITOR_BADGE[p.creditor_type ?? "OTHER"])}>
                          {p.creditor_type ?? "OTHER"}{p.creditor ? ` · ${p.creditor}` : ""}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-sm">{p.appraisal_value != null ? formatWon(p.appraisal_value) : "-"}</td>
                      <td className="px-3 py-2 text-right text-sm">{p.minimum_bid != null ? formatWon(p.minimum_bid) : "-"}</td>
                      <td className="px-3 py-2 text-xs">{p.auction_date ?? "-"}</td>
                      <td className="px-3 py-2 text-xs text-rose-600 font-medium">{p.dividend_deadline ?? "-"}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteIds([p.id], `${p.case_number}`); }}
                          disabled={pending}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                          title="개별 제외"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
