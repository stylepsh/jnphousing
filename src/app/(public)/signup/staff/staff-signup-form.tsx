"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Loader2, CheckCircle2 } from "lucide-react";
import { submitMemberSignup } from "../actions";

const schema = z.object({
  email: z.string().email("이메일 형식이 올바르지 않습니다."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.").max(72),
  password_confirm: z.string(),
  name: z.string().min(2, "성함을 입력해 주세요.").max(40),
  phone: z.string().min(9).max(20).regex(/^[0-9\-+\s]+$/, "숫자, -, +, 공백만 사용 가능합니다."),
  memo: z.string().max(500).optional().or(z.literal("")),
}).refine((d) => d.password === d.password_confirm, {
  message: "비밀번호가 일치하지 않습니다.",
  path: ["password_confirm"],
});

type FormValues = z.input<typeof schema>;

export function StaffSignupForm() {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "", password: "", password_confirm: "",
      name: "", phone: "", memo: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setPending(true);
    try {
      const parsed = schema.parse(values);
      const r = await submitMemberSignup({
        role: "staff",
        email: parsed.email,
        password: parsed.password,
        name: parsed.name,
        phone: parsed.phone,
        memo: parsed.memo || undefined,
      });
      if (!r.ok) throw new Error(r.error);

      setDone(true);
      toast.success("직원 계정 신청이 완료되었습니다.", {
        description: "대표 관리자 승인 후 관리자 화면을 이용할 수 있습니다.",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류";
      toast.error("신청 처리 중 오류", { description: msg });
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground">신청 완료</h2>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          대표 관리자가 확인 후 승인해 드립니다.<br />
          승인이 완료되면 관리자 화면(jnphousing.co.kr/admin)에<br />
          신청한 이메일·비밀번호로 로그인할 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>이메일 <span className="text-destructive">*</span></FormLabel>
            <FormControl><Input type="email" placeholder="staff@example.com" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem>
              <FormLabel>비밀번호 <span className="text-destructive">*</span></FormLabel>
              <FormControl><Input type="password" placeholder="8자 이상" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="password_confirm" render={({ field }) => (
            <FormItem>
              <FormLabel>비밀번호 확인 <span className="text-destructive">*</span></FormLabel>
              <FormControl><Input type="password" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>성함 <span className="text-destructive">*</span></FormLabel>
              <FormControl><Input placeholder="김동혁" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel>연락처 <span className="text-destructive">*</span></FormLabel>
              <FormControl><Input type="tel" placeholder="010-1234-5678" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="memo" render={({ field }) => (
          <FormItem>
            <FormLabel>담당 업무 <span className="text-muted-foreground font-normal">(선택)</span></FormLabel>
            <FormControl><Input placeholder="예: 부천 2지점 현장관리" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 처리 중...</> : "직원 계정 신청"}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          JNP주택관리 소속 직원만 신청해 주세요. 승인 전에는 아무 권한이 없습니다.
        </p>
      </form>
    </Form>
  );
}
