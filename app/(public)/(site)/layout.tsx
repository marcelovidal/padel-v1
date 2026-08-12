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
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)]">
      <PublicHeader ctaContext={ctaContext} />
      <main>{children}</main>
      <PublicFooter />
    </div>
  );
}
