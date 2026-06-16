/** admin 패널 공통 로딩 스켈레톤 — 페이지 데이터 도착 전 즉시 표시(체감속도). */
export default function AdminLoading() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl animate-pulse">
      <div className="h-8 w-52 rounded-md bg-muted mb-2" />
      <div className="h-4 w-80 max-w-full rounded bg-muted/60 mb-6" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border bg-muted/40" />
        ))}
      </div>
      <div className="rounded-xl border overflow-hidden">
        <div className="h-11 bg-muted/50" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 border-t bg-muted/20" />
        ))}
      </div>
    </div>
  );
}
