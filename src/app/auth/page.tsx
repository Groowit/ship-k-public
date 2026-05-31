import { AuthForm } from "@/components/auth-form";
import { getSafeNextPath } from "@/lib/authz";

export default async function AuthPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const nextPath = getSafeNextPath(typeof params.next === "string" ? params.next : null);
  const initialMode = params.mode === "sign-up" ? "sign-up" : "sign-in";

  return (
    <section className="container py-12">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
          shipK account
        </p>
        <h1 className="mt-2 shipk-heading text-5xl">Account access</h1>
        <p className="mt-3 text-muted-foreground">
          Sign in to buy beauty sets, save favorites, and check your orders.
        </p>
      </div>
      <AuthForm nextPath={nextPath} initialMode={initialMode} />
    </section>
  );
}
