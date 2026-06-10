"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Circle, CheckCircle2, Trash2, Plus, ChevronDown, CalendarDays, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { addTodo, toggleTodo, deleteTodo } from "./actions";

export interface TodoRow {
  id: string;
  title: string;
  detail: string | null;
  assignee: string | null;
  due_date: string | null;
  status: "todo" | "done";
  completed_at: string | null;
  created_at: string;
}

export function TodosClient({ open, done, todayIso }: { open: TodoRow[]; done: TodoRow[]; todayIso: string }) {
  const [pending, startTransition] = useTransition();
  const [showDone, setShowDone] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    startTransition(async () => {
      const res = await addTodo(formData);
      if (res.ok) {
        toast.success("할 일이 등록되었습니다.");
        formRef.current?.reset();
      } else {
        toast.error(res.error);
      }
    });
  }

  function toggle(id: string, next: boolean) {
    startTransition(async () => {
      const res = await toggleTodo(id, next);
      if (!res.ok) toast.error(res.error);
      else if (next) toast.success("완료 처리했습니다.");
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteTodo(id);
      if (res.ok) toast.success("삭제했습니다.");
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-6">
      {/* 등록 폼 — 한 줄 입력 */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <form ref={formRef} action={submit} className="grid gap-2.5 sm:grid-cols-[1fr_140px_150px_auto]">
            <Input name="title" placeholder="할 일 내용 (예: 302호 보일러 수리 견적)" required maxLength={300} />
            <Input name="assignee" placeholder="담당자" maxLength={100} />
            <Input name="due_date" type="date" />
            <Button type="submit" disabled={pending} className="gap-1.5">
              <Plus className="h-4 w-4" /> 등록
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 진행 중 */}
      <section>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          진행 중 <span className="text-primary">{open.length}</span>건
        </p>
        <Card>
          <CardContent className="p-0">
            {open.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">진행 중인 할 일이 없습니다. 위에서 등록하세요.</p>
            ) : (
              <ul className="divide-y divide-border">
                {open.map((t) => {
                  const overdue = t.due_date !== null && t.due_date < todayIso;
                  const dueToday = t.due_date === todayIso;
                  return (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-3 group">
                      <button
                        onClick={() => toggle(t.id, true)}
                        disabled={pending}
                        className="shrink-0 text-muted-foreground/50 hover:text-primary transition-colors"
                        aria-label="완료 체크"
                      >
                        <Circle className="h-5 w-5" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                        {t.detail && <p className="text-xs text-muted-foreground truncate mt-0.5">{t.detail}</p>}
                      </div>
                      {t.assignee && (
                        <Badge variant="outline" className="text-xs gap-1 shrink-0">
                          <User className="h-3 w-3" /> {t.assignee}
                        </Badge>
                      )}
                      {t.due_date && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs gap-1 shrink-0",
                            overdue && "border-red-300 bg-red-50 text-red-700",
                            dueToday && "border-amber-300 bg-amber-50 text-amber-700",
                          )}
                        >
                          <CalendarDays className="h-3 w-3" />
                          {t.due_date.slice(5).replace("-", ".")}
                          {overdue && " 지남"}
                          {dueToday && " 오늘"}
                        </Badge>
                      )}
                      <button
                        onClick={() => remove(t.id)}
                        disabled={pending}
                        className="shrink-0 text-muted-foreground/30 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        aria-label="삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 완료 — 접힘 */}
      <section>
        <button
          onClick={() => setShowDone((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 hover:text-foreground transition-colors"
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !showDone && "-rotate-90")} />
          완료 {done.length}건
        </button>
        {showDone && (
          <Card>
            <CardContent className="p-0">
              {done.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">완료된 할 일이 없습니다.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {done.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-2.5 group">
                      <button
                        onClick={() => toggle(t.id, false)}
                        disabled={pending}
                        className="shrink-0 text-emerald-600 hover:text-muted-foreground transition-colors"
                        aria-label="완료 해제"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </button>
                      <p className="flex-1 min-w-0 text-sm text-muted-foreground line-through truncate">{t.title}</p>
                      {t.assignee && <span className="text-xs text-muted-foreground shrink-0">{t.assignee}</span>}
                      {t.completed_at && (
                        <span className="text-xs text-muted-foreground/60 shrink-0">
                          {t.completed_at.slice(5, 10).replace("-", ".")} 완료
                        </span>
                      )}
                      <button
                        onClick={() => remove(t.id)}
                        disabled={pending}
                        className="shrink-0 text-muted-foreground/30 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        aria-label="삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
