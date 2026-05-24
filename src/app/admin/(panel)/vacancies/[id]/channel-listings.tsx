"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Loader2, Trash2, ExternalLink } from "lucide-react";
import { upsertListing, deleteListing } from "./actions";

interface Channel { id: string; code: string; name: string }
interface Listing {
  id: string;
  vacancy_id: string;
  channel_id: string;
  listing_url: string | null;
  listed_at: string;
  unlisted_at: string | null;
  inquiry_count: number;
  status: string;
  notes: string | null;
}

const STATUS_LABEL: Record<string, { l: string; c: string }> = {
  active: { l: "노출중", c: "bg-green-100 text-green-800" },
  closed: { l: "내림", c: "bg-slate-100 text-slate-700" },
  contracted: { l: "계약성사", c: "bg-blue-100 text-blue-800" },
};

export function ChannelListings({
  vacancyId,
  channels,
  listings,
}: {
  vacancyId: string;
  channels: Channel[];
  listings: Listing[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [channelId, setChannelId] = useState("");
  const [status, setStatus] = useState<"active" | "closed" | "contracted">("active");
  const [pending, startTransition] = useTransition();

  const chMap = new Map(channels.map((c) => [c.id, c.name]));

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("vacancy_id", vacancyId);
    fd.set("channel_id", channelId);
    fd.set("status", status);
    startTransition(async () => {
      const r = await upsertListing(null, fd);
      if (r.ok) {
        toast.success("등록되었습니다.");
        setOpen(false);
        setChannelId("");
        router.refresh();
      } else {
        toast.error("실패", { description: r.error });
      }
    });
  }

  function onDelete(id: string) {
    if (!confirm("이 채널 등록을 삭제하시겠습니까?")) return;
    startTransition(async () => {
      const r = await deleteListing(id, vacancyId);
      if (r.ok) {
        toast.success("삭제되었습니다.");
        router.refresh();
      } else {
        toast.error("실패", { description: r.error });
      }
    });
  }

  return (
    <>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> 채널 등록
        </Button>
      </div>

      {listings.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          아직 광고 채널 등록 이력이 없습니다.<br />
          <span className="text-xs">피터팬·삼삼엠투·직방·다방·네이버부동산 등에 매물 올린 일자와 문의 수를 기록하세요.</span>
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>채널</TableHead>
              <TableHead>등록일</TableHead>
              <TableHead className="text-right">문의수</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>링크</TableHead>
              <TableHead className="text-right w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listings.map((l) => {
              const cfg = STATUS_LABEL[l.status] ?? STATUS_LABEL.active;
              return (
                <TableRow key={l.id}>
                  <TableCell className="font-medium text-sm">{chMap.get(l.channel_id) ?? "—"}</TableCell>
                  <TableCell className="text-xs">{l.listed_at}</TableCell>
                  <TableCell className="text-right tabular-nums font-bold">{l.inquiry_count}</TableCell>
                  <TableCell><Badge className={`${cfg.c} hover:${cfg.c} text-xs`}>{cfg.l}</Badge></TableCell>
                  <TableCell>
                    {l.listing_url ? (
                      <a href={l.listing_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                        열기 <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => onDelete(l.id)} disabled={pending}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>광고 채널 등록</DialogTitle>
            <DialogDescription>이 매물을 어느 플랫폼에 올렸는지 기록합니다.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <Label>채널 *</Label>
              <Select value={channelId} onValueChange={(v) => v && setChannelId(v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="채널을 선택하세요" /></SelectTrigger>
                <SelectContent>
                  {channels.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>등록일 *</Label>
                <Input type="date" name="listed_at" required defaultValue={new Date().toISOString().slice(0, 10)} className="mt-1.5" />
              </div>
              <div>
                <Label>누적 문의 수</Label>
                <Input type="number" name="inquiry_count" min={0} defaultValue={0} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>매물 링크 (URL)</Label>
              <Input type="url" name="listing_url" placeholder="https://..." className="mt-1.5" />
            </div>
            <div>
              <Label>상태</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v as "active" | "closed" | "contracted")}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">노출중</SelectItem>
                  <SelectItem value="closed">내림</SelectItem>
                  <SelectItem value="contracted">계약 성사</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>메모</Label>
              <Textarea name="notes" rows={2} className="mt-1.5" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>취소</Button>
              <Button type="submit" disabled={pending || !channelId}>
                {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                등록
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
