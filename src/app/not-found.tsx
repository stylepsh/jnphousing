import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-7xl font-bold text-primary/30">404</p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">페이지를 찾을 수 없습니다</h1>
        <p className="mt-3 text-muted-foreground">
          주소가 잘못되었거나, 페이지가 이동되었을 수 있습니다.
        </p>
        <Button asChild className="mt-8">
          <Link href="/">
            <Home className="h-4 w-4 mr-2" /> 홈으로
          </Link>
        </Button>
      </div>
    </div>
  );
}
