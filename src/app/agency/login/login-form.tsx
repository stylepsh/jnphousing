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
  password: z.string().min(1, "비밀번호를 입력해 주세요."),
});

type FormValues = z.input<typeof schema>;

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    setPending(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("로그인 실패");

      // agencies 테이블에서 상태 확인
      const { data: agencyRows } = await supabase
        .from("agencies")
        .select("status, reject_reason")
        .eq("user_id", data.user.id)
        .limit(1);

      const agency = (agencyRows as { status: string; reject_reason: string | null }[] | null)?.[0];

      if (!agency) {
        // admin_users 인지 체크
        const { data: adminRows } = await supabase
          .from("admin_users")
          .select("id")
          .eq("user_id", data.user.id)
          .limit(1);
        if (adminRows && adminRows.length > 0) {
          router.push("/admin/dashboard");
          return;
        }
        toast.error("등록된 부동산 회원 정보가 없습니다.");
        await supabase.auth.signOut();
        return;
      }

      if (agency.status === "approved") {
        router.push(next ?? "/agency/vacancies");
        return;
      }
      if (agency.status === "rejected") {
        router.push("/agency/rejected");
        return;
      }
      router.push("/agency/pending");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류";
      toast.error("로그인 실패", { description: msg });
    } finally {
      setPending(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이메일</FormLabel>
              <FormControl>
                <Input type="email" placeholder="agency@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>비밀번호</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 로그인 중...</> : "로그인"}
        </Button>
      </form>
    </Form>
  );
}
