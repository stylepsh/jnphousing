import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { TodosClient, type TodoRow } from "./todos-client";

export const metadata = { title: "할 일" };

async function fetchTodos(): Promise<{ open: TodoRow[]; done: TodoRow[]; tableMissing: boolean; adminName: string }> {
  if (!isSupabaseConfigured()) return { open: [], done: [], tableMissing: false, adminName: "" };
  const supabase = await createClient();
  const [openRes, doneRes, userRes] = await Promise.all([
    supabase.from("team_todos").select("*").in("status", ["todo", "delayed"])
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase.from("team_todos").select("*").eq("status", "done")
      .order("completed_at", { ascending: false }).limit(50),
    supabase.auth.getUser(),
  ]);
  let adminName = "";
  const uid = userRes.data.user?.id;
  if (uid) {
    const { data: a } = await supabase.from("admin_users").select("name").eq("user_id", uid).maybeSingle();
    adminName = (a as { name: string } | null)?.name ?? "";
  }
  return {
    open: (openRes.data ?? []) as TodoRow[],
    done: (doneRes.data ?? []) as TodoRow[],
    // 마이그레이션 015 미실행 시 안내 (42P01 = relation does not exist)
    tableMissing: openRes.error?.code === "42P01",
    adminName,
  };
}

export default async function TodosPage() {
  const { open, done, tableMissing, adminName } = await fetchTodos();
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">할 일</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          회사에서 해야 할 일을 등록하고, 끝나면 체크하세요. 팀원 모두에게 공유됩니다.
        </p>
      </div>

      {tableMissing ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold mb-1">테이블 준비 필요</p>
          <p>Supabase SQL Editor 에서 <code className="font-mono bg-amber-100 px-1 rounded">supabase/migrations/015_team_todos.sql</code> 을 실행하면 바로 사용할 수 있습니다.</p>
        </div>
      ) : (
        <TodosClient open={open} done={done} todayIso={todayIso} adminName={adminName} />
      )}
    </div>
  );
}
