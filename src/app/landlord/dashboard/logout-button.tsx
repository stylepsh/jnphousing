"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LandlordLogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/landlord/login");
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={pending}>
      <LogOut className="h-3.5 w-3.5 mr-1" /> 로그아웃
    </Button>
  );
}
