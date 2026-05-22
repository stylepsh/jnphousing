import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-4rem)] bg-slate-50">{children}</main>
      <Footer />
    </>
  );
}
