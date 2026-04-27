import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { getPublicCtaContext } from "@/lib/auth/public-cta";

export default async function PublicSiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctaContext = await getPublicCtaContext();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PublicHeader ctaContext={ctaContext} />
      <main>{children}</main>
      <PublicFooter />
    </div>
  );
}
