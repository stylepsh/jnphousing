"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email("이메일 형식이 올바르지 않습니다."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.").max(72),
  password_confirm: z.string(),
  company_name: z.string().min(2, "회사명을 입력해 주세요.").max(80),
  business_number: z
    .string()
    .regex(/^[0-9\-]+$/, "숫자와 하이픈만 가능합니다.")
    .transform((v) => v.replace(/-/g, ""))
    .refine((v) => v.length === 10, "사업자번호는 10자리입니다."),
  representative: z.string().min(2, "대표자명을 입력해 주세요.").max(40),
  phone: z
    .string()
    .min(9)
    .max(20)
    .regex(/^[0-9\-+\s]+$/, "숫자, -, +, 공백만 사용 가능합니다."),
  address: z.string().max(200).optional().or(z.literal("")),
}).refine((d) => d.password === d.password_confirm, {
  message: "비밀번호가 일치하지 않습니다.",
  path: ["password_confirm"],
});

type FormValues = z.input<typeof schema>;

export function SignupForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      password_confirm: "",
      company_name: "",
      business_number: "",
      representative: "",
      phone: "",
      address: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setPending(true);
    try {
      const parsed = schema.parse(values);
      const supabase = createClient();

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: parsed.email,
        password: parsed.password,
      });
      if (signUpError) throw new Error(signUpError.message);
      if (!authData.user) throw new Error("계정 생성에 실패했습니다.");

      const { error: insertError } = await supabase.from("agencies").insert({
        user_id: authData.user.id,
        company_name: parsed.company_name,
        business_number: parsed.business_number,
        representative: parsed.representative,
        phone: parsed.phone,
        address: parsed.address || null,
      });
      if (insertError) throw new Error(insertError.message);

      toast.success("가입 신청이 완료되었습니다.", {
        description: "관리자 승인 후 공실 매물을 열람할 수 있습니다.",
      });
      router.push("/agency/pending");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류";
      toast.error("가입 처리 중 오류", { description: msg });
    } finally {
      setPending(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">계정 정보</h3>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이메일 <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input type="email" placeholder="agency@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>비밀번호 <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input type="password" placeholder="8자 이상" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password_confirm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>비밀번호 확인 <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide pt-4">사업자 정보</h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="company_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>회사명 <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="(주)홍길동공인중개사" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="business_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>사업자번호 <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="123-45-67890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="representative"
            render={({ field }) => (
              <FormItem>
                <FormLabel>대표자명 <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="홍길동" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>대표 전화 <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="010-1234-5678" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>회사 주소 <span className="text-muted-foreground font-normal">(선택)</span></FormLabel>
              <FormControl>
                <Input placeholder="서울 강남구 ..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 처리 중...</> : "가입 신청"}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          가입 시 개인정보처리방침 및 이용약관에 동의하는 것으로 간주됩니다.
        </p>
      </form>
    </Form>
  );
}
