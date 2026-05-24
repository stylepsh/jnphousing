"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { addVacancyImages } from "./actions";

const MAX_FILES_PER_UPLOAD = 30;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function ImageUploader({ vacancyId, currentCount }: { vacancyId: string; currentCount: number }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [, startTransition] = useTransition();

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    if (files.length > MAX_FILES_PER_UPLOAD) {
      toast.error(`한 번에 ${MAX_FILES_PER_UPLOAD}장까지만 업로드 가능합니다.`);
      e.target.value = "";
      return;
    }

    const accepted: File[] = [];
    for (const f of files) {
      if (!ACCEPTED.includes(f.type)) {
        toast.error(`${f.name}: JPG/PNG/WebP 만 가능합니다.`);
        continue;
      }
      if (f.size > MAX_SIZE) {
        toast.error(`${f.name}: 10MB 초과는 업로드할 수 없습니다.`);
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length === 0) {
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const uploaded: { url: string }[] = [];

      for (const file of accepted) {
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const path = `${vacancyId}/${crypto.randomUUID()}-${safeName}`;
        const { data, error } = await supabase.storage
          .from("vacancy-images")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (error) {
          toast.error(`업로드 실패: ${file.name}`, { description: error.message });
          continue;
        }
        const { data: pub } = supabase.storage.from("vacancy-images").getPublicUrl(data.path);
        uploaded.push({ url: pub.publicUrl });
      }

      if (uploaded.length === 0) {
        toast.error("업로드된 파일이 없습니다.");
        return;
      }

      startTransition(async () => {
        const r = await addVacancyImages(vacancyId, uploaded);
        if (r.ok) {
          toast.success(`${r.added}장 추가되었습니다.`);
          router.refresh();
        } else {
          toast.error("등록 실패", { description: r.error });
        }
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <label>
      <input
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        onChange={onChange}
        disabled={uploading}
        className="hidden"
        id={`up-${vacancyId}`}
      />
      <Button asChild size="sm" disabled={uploading}>
        <span>
          {uploading ? (
            <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> 업로드 중...</>
          ) : (
            <><Upload className="h-4 w-4 mr-1.5" /> 사진 추가 ({MAX_FILES_PER_UPLOAD}장까지)</>
          )}
        </span>
      </Button>
    </label>
  );
}
