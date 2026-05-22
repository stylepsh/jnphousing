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
import { CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  company_name: z.string().max(80).optional().or(z.literal("")),
  contact_name: z.string().min(2, "담당자명을 입력해 주세요.").max(40),
  phone: z
    .string()
    .min(9, "연락처를 정확히 입력해 주세요.")
    .max(20)
    .regex(/^[0-9\-+\s]+$/, "숫자, -, +, 공백만 사용 가능합니다."),
  email: z.string().email("이메일 형식이 올바르지 않습니다.").optional().or(z.literal("")),
  building_address: z.string().min(5, "건물 주소를 입력해 주세요.").max(200),
  building_type: z.string().optional(),
  total_units: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === "" || v == null ? undefined : Number(v)))
    .refine(
      (v) => v === undefined || (Number.isFinite(v) && v >= 0 && v < 100000),
      "세대수는 0 이상 100,000 미만의 숫자로 입력해 주세요.",
    ),
  message: z.string().min(10, "문의 내용을 10자 이상 입력해 주세요.").max(2000),
});

type FormValues = z.input<typeof schema>;

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      company_name: "",
      contact_name: "",
      phone: "",
      email: "",
      building_address: "",
      building_type: "",
      total_units: "",
      message: "",
    },
  });

  async function onSubmit(values: FormValues) {
    const parsed = schema.parse(values);
    const supabase = createClient();
    const { error } = await supabase.from("inquiries").insert({
      company_name: parsed.company_name || null,
      contact_name: parsed.contact_name,
      phone: parsed.phone,
      email: parsed.email || null,
      building_address: parsed.building_address,
      building_type: parsed.building_type || null,
      total_units: parsed.total_units ?? null,
      message: parsed.message,
    });

    if (error) {
      toast.error("문의 접수 중 오류가 발생했습니다.", {
        description: error.message,
      });
      return;
    }

    toast.success("문의가 접수되었습니다.", {
      description: "영업일 기준 24시간 이내 담당자가 연락드립니다.",
    });
    setSubmitted(true);
    form.reset();
  }

  if (submitted) {
    return (
      <div className="py-12 text-center">
        <div className="h-16 w-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold tracking-tight">문의가 접수되었습니다</h3>
        <p className="mt-2 text-muted-foreground">
          영업일 기준 24시간 이내에 담당자가 연락드립니다.
        </p>
        <Button className="mt-6" variant="outline" onClick={() => setSubmitted(false)}>
          새 문의 작성
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-5">
          <FormField
            control={form.control}
            name="company_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>회사명 / 법인명 <span className="text-muted-foreground font-normal">(선택)</span></FormLabel>
                <FormControl>
                  <Input placeholder="예) (주)홍길동건설" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contact_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>담당자명 <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="홍길동" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>연락처 <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="010-1234-5678" type="tel" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이메일 <span className="text-muted-foreground font-normal">(선택)</span></FormLabel>
                <FormControl>
                  <Input placeholder="example@email.com" type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="building_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>건물 주소 <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="서울특별시 강남구 ..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid sm:grid-cols-2 gap-5">
          <FormField
            control={form.control}
            name="building_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>건물 유형 <span className="text-muted-foreground font-normal">(선택)</span></FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="선택해 주세요" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="officetel">오피스텔</SelectItem>
                    <SelectItem value="apartment">아파트</SelectItem>
                    <SelectItem value="villa">빌라/다세대</SelectItem>
                    <SelectItem value="commercial">상가</SelectItem>
                    <SelectItem value="etc">기타</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="total_units"
            render={({ field }) => (
              <FormItem>
                <FormLabel>총 세대수 <span className="text-muted-foreground font-normal">(선택)</span></FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="예) 40"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>문의 내용 <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Textarea
                  placeholder="현재 관리 상황, 검토하시는 서비스, 특별히 궁금하신 점 등을 자유롭게 작성해 주세요."
                  rows={6}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="pt-2">
          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 전송 중
              </>
            ) : (
              "문의 보내기"
            )}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            문의 내용은 안전하게 보관되며, 회신 목적 외에 사용되지 않습니다.
          </p>
        </div>
      </form>
    </Form>
  );
}
