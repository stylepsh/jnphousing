"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Circle, ArrowRight, ListTodo, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { toggleTodo } from "../todos/actions";
import { cn } from "@/lib/utils";

export interface TodoWidgetRow {
  id: string;
  title: string;
  assignee: string | null;
  due_date: string | null;
}

/** 대시보드 할 일 위젯 — 체크하면 완료 처리 */
export function TodoWidget({ rows, totalOpen, todayIso }: { rows: TodoWidgetRow[]; totalOpen: number; todayIso: string }) {
  const [pending, startTransition] = useTransition();

  function done(id: string) {
    startTransition(async () => {
      const res = await toggleTodo(id, true);
      if (res.ok) toast.success("완료 처리했습니다.");
      else toast.error(res.error);
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-primary" />
          할 일 <span className="text-primary">{totalOpen}</span>건
        </CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/todos">전체 <ArrowRight className="h-3 w-3 ml-1" /></Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">진행 중인 할 일이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((t) => {
              const overdue = t.due_date !== null && t.due_date < todayIso;
              return (
                <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                  <button
                    onClick={() => done(t.id)}
                    disabled={pending}
                    className="shrink-0 text-muted-foreground/50 hover:text-primary transition-colors disabled:opacity-40"
                    aria-label="완료 체크"
                  >
                    <Circle className="h-5 w-5" />
                  </button>
                  <p className="flex-1 min-w-0 text-sm font-medium truncate">{t.title}</p>
                  {t.assignee && <span className="text-xs text-muted-foreground shrink-0">{t.assignee}</span>}
                  {t.due_date && (
                    <span className={cn("text-xs shrink-0 flex items-center gap-1", overdue ? "text-red-600 font-semibold" : "text-muted-foreground")}>
                      <CalendarDays className="h-3 w-3" />
                      {t.due_date.slice(5).replace("-", ".")}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
