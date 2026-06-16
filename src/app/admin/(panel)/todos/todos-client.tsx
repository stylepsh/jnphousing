"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Trash2, Plus, CalendarDays, User, Clock, MessageSquareWarning, RotateCcw, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { addTodo, setTodoStatus, rescheduleTodo, deleteTodo } from "./actions";

export interface TodoRow {
  id: string;
  title: string;
  detail: string | null;
  recorder: string | null;
  assignee: string | null;
  due_date: string | null;
  status: "todo" | "delayed" | "done";
  completed_at: string | null;
  created_at: string;
  source_type: string | null;
  source_id: string | null;
  source_label: string | null;
}

export function TodosClient({ open, done, todayIso, adminName }: { open: TodoRow[]; done: TodoRow[]; todayIso: string; adminName: string }) {
  const [pending, startTransition] = useTransition();
  const [editId, setEditId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    startTransition(async () => {
      const res = await addTodo(formData);
      if (res.ok) { toast.success("할 일이 등록되었습니다."); formRef.current?.reset(); }
      else toast.error(res.error);
    });
  }
  function status(id: string, s: "todo" | "delayed" | "done") {
    startTransition(async () => {
      const res = await setTodoStatus(id, s);
      if (!res.ok) toast.error(res.error);
      else if (s === "done") toast.success("완료 처리했습니다.");
      else if (s === "delayed") toast.success("지연으로 표시했습니다.");
    });
  }
  function reschedule(id: string) {
    startTransition(async () => {
      const res = await rescheduleTodo(id, editDate);
      if (res.ok) { toast.success("일정을 변경했습니다."); setEditId(null); }
      else toast.error(res.error);
    });
  }
  function remove(id: string) {
    if (!confirm("이 할 일을 삭제할까요?")) return;
    startTransition(async () => {
      const res = await deleteTodo(id);
      if (res.ok) toast.success("삭제했습니다."); else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-6">
      {/* ── 등록 폼: 입력자 → 내용(여러 줄) → 날짜 → 등록 ── */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <form ref={formRef} action={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">입력자</label>
                <Input name="recorder" defaultValue={adminName} placeholder="작성자" maxLength={100} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">기한</label>
                <Input name="due_date" type="date" className="sm:max-w-[200px]" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">할 일 내용 (길면 Enter로 줄 바꿈)</label>
              <Textarea name="title" required maxLength={2000} rows={3} placeholder={"예) 302호 보일러 수리 견적\n- 업체 3곳 비교\n- 임대인 보고"} className="text-base" />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={pending} className="gap-1.5"><Plus className="h-4 w-4" /> 등록</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── 진행 중 (지연 포함) ── */}
      <section>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          진행 중 <span className="text-primary">{open.length}</span>건
        </p>
        {open.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">진행 중인 할 일이 없습니다. 위에서 등록하세요.</CardContent></Card>
        ) : (
          <div className="space-y-2.5">
            {open.map((t) => {
              const overdue = t.due_date !== null && t.due_date < todayIso;
              const dueToday = t.due_date === todayIso;
              const delayed = t.status === "delayed";
              return (
                <Card key={t.id} className={cn(delayed && "border-amber-300")}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          {delayed && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[11px]">지연</Badge>}
                          {t.source_type === "complaint" && (
                            <Link href="/admin/complaints">
                              <Badge variant="outline" className="text-[11px] gap-1 border-rose-200 bg-rose-50 text-rose-700 cursor-pointer">
                                <MessageSquareWarning className="h-3 w-3" /> 민원 연결
                              </Badge>
                            </Link>
                          )}
                          {t.source_label && <span className="text-[11px] text-muted-foreground">{t.source_label}</span>}
                        </div>
                        <p className="text-sm font-medium text-foreground whitespace-pre-wrap break-words">{t.title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {t.recorder && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><User className="h-3 w-3" />{t.recorder}</span>}
                          {t.due_date && (
                            <span className={cn("inline-flex items-center gap-1 text-xs", overdue ? "text-red-600 font-medium" : dueToday ? "text-amber-600 font-medium" : "text-muted-foreground")}>
                              <CalendarDays className="h-3 w-3" />{t.due_date.slice(5).replace("-", ".")}{overdue ? " 지남" : dueToday ? " 오늘" : ""}
                            </span>
                          )}
                        </div>

                        {editId === t.id && (
                          <div className="flex items-center gap-2 mt-3">
                            <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="max-w-[180px] h-9" />
                            <Button size="sm" onClick={() => reschedule(t.id)} disabled={pending}>변경</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>취소</Button>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5 shrink-0">
                        <Button size="sm" className="gap-1 h-8" onClick={() => status(t.id, "done")} disabled={pending}>
                          <Check className="h-3.5 w-3.5" /> 완료
                        </Button>
                        <div className="flex gap-1.5">
                          {delayed ? (
                            <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => status(t.id, "todo")} disabled={pending}>진행중</Button>
                          ) : (
                            <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => status(t.id, "delayed")} disabled={pending}>지연</Button>
                          )}
                          <Button size="sm" variant="outline" className="h-8 px-2 text-xs gap-1" onClick={() => { setEditId(t.id); setEditDate(t.due_date ?? ""); }} disabled={pending}>
                            <Clock className="h-3.5 w-3.5" /> 일정
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2 text-destructive" onClick={() => remove(t.id)} disabled={pending}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 완료 (카드 누적) ── */}
      <section>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          완료 <span className="text-emerald-600">{done.length}</span>건
        </p>
        {done.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">완료된 할 일이 없습니다.</CardContent></Card>
        ) : (
          <div className="space-y-2.5">
            {done.map((t) => (
              <Card key={t.id} className="bg-muted/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {t.source_type === "complaint" && (
                          <Link href="/admin/complaints">
                            <Badge variant="outline" className="text-[11px] gap-1 border-rose-200 bg-rose-50 text-rose-700 cursor-pointer">
                              <MessageSquareWarning className="h-3 w-3" /> 민원 연결
                            </Badge>
                          </Link>
                        )}
                        {t.source_label && <span className="text-[11px] text-muted-foreground">{t.source_label}</span>}
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{t.title}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground/70">
                        {t.recorder && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{t.recorder}</span>}
                        {t.completed_at && <span>{t.completed_at.slice(0, 10)} 완료</span>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="h-8 px-2 text-xs gap-1" onClick={() => status(t.id, "todo")} disabled={pending}>
                        <RotateCcw className="h-3.5 w-3.5" /> 되돌리기
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-destructive" onClick={() => remove(t.id)} disabled={pending}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
