import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { OrganizationJsonLd } from "@/components/shared/JsonLd";
import { PopupBanner } from "@/components/shared/PopupBanner";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <OrganizationJsonLd />
      <PopupBanner />
      <Header />
      {children}
      <Footer />
    </>
  );
}
