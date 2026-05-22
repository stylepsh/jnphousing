"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle2, Loader2, ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

const schema = z.object({
  property_id: z.string().min(1, "건물을 선택해 주세요."),
  unit_number: z.string().min(1, "호수를 입력해 주세요.").max(20),
  tenant_name: z.string().min(2, "이름을 입력해 주세요.").max(40),
  tenant_phone: z
    .string()
    .min(9, "연락처를 정확히 입력해 주세요.")
    .max(20)
    .regex(/^[0-9\-+\s]+$/, "숫자, -, +, 공백만 사용 가능합니다."),
  category: z.enum(["as", "facility", "noise", "complaint", "etc"]),
  title: z.string().min(2, "제목을 입력해 주세요.").max(100),
  content: z.string().min(10, "내용을 10자 이상 입력해 주세요.").max(2000),
  consent: z
    .boolean()
    .refine((v) => v === true, "개인정보 수집에 동의해 주세요."),
});

type FormValues = z.input<typeof schema>;

interface Props {
  properties: { id: string; name: string }[];
  defaultPropertyId?: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  as: "AS 요청",
  facility: "시설 고장",
  noise: "소음 민원",
  complaint: "기타 민원",
  etc: "기타",
};

export function ComplaintForm({ properties, defaultPropertyId }: Props) {
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      property_id: defaultPropertyId ?? "",
      unit_number: "",
      tenant_name: "",
      tenant_phone: "",
      category: "as",
      title: "",
      content: "",
      consent: false,
    },
  });

  function handleImageAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const accepted: File[] = [];
    for (const f of files) {
      if (f.size > MAX_IMAGE_SIZE) {
        toast.error(`${f.name}: 5MB 초과는 첨부할 수 없습니다.`);
        continue;
      }
      accepted.push(f);
    }

    setImages((prev) => {
      const combined = [...prev, ...accepted].slice(0, MAX_IMAGES);
      if (prev.length + accepted.length > MAX_IMAGES) {
        toast.warning(`이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.`);
      }
      return combined;
    });
    e.target.value = "";
  }

  function removeImage(i: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function uploadImages(): Promise<string[]> {
    if (!images.length) return [];
    const supabase = createClient();
    const urls: string[] = [];

    for (const file of images) {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `${crypto.randomUUID()}-${safeName}`;
      const { data, error } = await supabase.storage
        .from("complaints-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) {
        throw new Error(`이미지 업로드 실패: ${error.message}`);
      }
      const { data: pub } = supabase.storage.from("complaints-images").getPublicUrl(data.path);
      urls.push(pub.publicUrl);
    }
    return urls;
  }

  async function onSubmit(values: FormValues) {
    const parsed = schema.parse(values);
    setUploading(true);
    try {
      const imageUrls = await uploadImages();

      const supabase = createClient();
      const property = properties.find((p) => p.id === parsed.property_id);
      const { data, error } = await supabase
        .from("complaints")
        .insert({
          property_id: parsed.property_id,
          building_name: property?.name ?? null,
          unit_number: parsed.unit_number,
          tenant_name: parsed.tenant_name,
          tenant_phone: parsed.tenant_phone,
          category: parsed.category,
          title: parsed.title,
          content: parsed.content,
          images: imageUrls,
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      const insertedId = (data as { id: string } | null)?.id;
      if (!insertedId) throw new Error("접수 ID를 받지 못했습니다.");

      setSuccessId(insertedId);
      form.reset();
      setImages([]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "오류가 발생했습니다.";
      toast.error("접수 중 오류가 발생했습니다.", { description: msg });
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="property_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">건물 선택 <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="건물을 선택하세요" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {properties.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">
                        등록된 건물이 없습니다.
                      </div>
                    ) : (
                      properties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid sm:grid-cols-2 gap-5">
            <FormField
              control={form.control}
              name="unit_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">호수 <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input className="h-12 text-base" placeholder="예) 502" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tenant_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">입주자명 <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input className="h-12 text-base" placeholder="홍길동" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="tenant_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">연락처 <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input className="h-12 text-base" type="tel" placeholder="010-1234-5678" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">카테고리 <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">제목 <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input className="h-12 text-base" placeholder="예) 욕실 변기 물이 안 내려갑니다" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">내용 <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Textarea
                    className="text-base min-h-[140px]"
                    placeholder="상황을 자세히 적어주시면 빠르게 처리할 수 있습니다."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <label className="text-base font-medium">
              사진 첨부 <span className="text-sm text-muted-foreground font-normal">(선택, 최대 {MAX_IMAGES}장 / 5MB)</span>
            </label>
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
              {images.map((file, i) => (
                <div key={i} className="relative aspect-square rounded-lg border border-border overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                    aria-label="삭제"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition">
                  <ImagePlus className="h-6 w-6" />
                  <span className="text-xs mt-1">사진 추가</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageAdd}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <FormField
            control={form.control}
            name="consent"
            render={({ field }) => (
              <FormItem>
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="mt-0.5 h-5 w-5 rounded border-border"
                    />
                    <div className="text-sm">
                      <div className="font-medium">개인정보 수집·이용 동의 <span className="text-destructive">*</span></div>
                      <div className="text-muted-foreground mt-1 leading-relaxed">
                        민원 처리를 위해 이름·연락처·호수 정보를 수집합니다.
                        처리 완료 후 1년간 보관 후 파기됩니다.
                      </div>
                    </div>
                  </label>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            size="lg"
            className="w-full h-14 text-base"
            disabled={form.formState.isSubmitting || uploading}
          >
            {form.formState.isSubmitting || uploading ? (
              <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> 접수 중...</>
            ) : (
              "민원 접수하기"
            )}
          </Button>
        </form>
      </Form>

      {/* 접수 완료 다이얼로그 */}
      <Dialog open={!!successId} onOpenChange={(o) => !o && setSuccessId(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mb-2">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            </div>
            <DialogTitle className="text-center text-xl">민원이 접수되었습니다</DialogTitle>
            <DialogDescription className="text-center">
              관리자가 확인 후 연락드립니다.
            </DialogDescription>
          </DialogHeader>
          {successId && (
            <div className="my-2 rounded-lg bg-muted p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">접수번호</p>
              <p className="font-mono text-lg font-bold tracking-wider">
                {successId.slice(0, 8).toUpperCase()}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                접수번호로 처리 상태를 조회할 수 있습니다.
              </p>
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button asChild className="w-full">
              <Link href="/tenant/complaint/lookup">내 민원 조회</Link>
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setSuccessId(null)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
