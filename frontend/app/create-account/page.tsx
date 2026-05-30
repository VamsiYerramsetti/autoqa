"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Mail, ShieldCheck, UserCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/sections/site-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";

export default function CreateAccountPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError("");
      await register({ displayName, email, username, password, roleTitle, organization });
      router.push("/speaker");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Couldn't create the account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-white">
      <SiteHeader />
      <div className="container-shell grid gap-8 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
        <section className="glass-panel p-8 md:p-10">
          <div className="eyebrow">Speaker onboarding</div>
          <h1 className="mt-6 text-4xl font-semibold text-white md:text-5xl">Create your speaker account</h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-white/72">Build a speaker-facing workspace for presentations, grounded Q&A sessions, QR links, and audience question review.</p>

          <div className="mt-8 space-y-4">
            {[
              { icon: UserCircle2, title: "Workspace profile", copy: "Store your display name, role, and organization for a clean speaker view." },
              { icon: ShieldCheck, title: "Protected sessions", copy: "Keep presentation setup and Q&A review behind a dedicated speaker login." },
              { icon: Building2, title: "Audience visibility", copy: "Track incoming questions and QR activity presentation by presentation." },
            ].map(({ icon: ItemIcon, title, copy }) => {
              return (
                <div key={title} className="rounded-[24px] border border-white/8 bg-white/5 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5"><ItemIcon className="h-5 w-5 text-orange-300" /></div>
                    <div>
                      <div className="text-lg font-semibold text-white">{title}</div>
                      <div className="mt-2 text-sm leading-7 text-white/66">{copy}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="glass-panel p-8 md:p-10">
          <div className="text-xs uppercase tracking-[0.28em] text-orange-300">Create account</div>
          <form className="mt-6 space-y-5" onSubmit={submit}>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-white">Display name</span>
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required className="w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-orange-400/30" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-white">Email</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-orange-400/30" />
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-white">Username</span>
                <input value={username} onChange={(event) => setUsername(event.target.value)} required className="w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-orange-400/30" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-white">Password</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-orange-400/30" />
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-white">Role title</span>
                <input value={roleTitle} onChange={(event) => setRoleTitle(event.target.value)} className="w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-orange-400/30" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-white">Organization</span>
                <input value={organization} onChange={(event) => setOrganization(event.target.value)} className="w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-orange-400/30" />
              </label>
            </div>

            {error ? <div className="rounded-[20px] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

            <div className="flex flex-col gap-3 pt-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-sm text-white/58"><Mail className="h-4 w-4 text-orange-300" /> Your account opens directly into the speaker workspace.</div>
              <div className="flex gap-3">
                <Link href="/"><Button type="button" variant="secondary">Back</Button></Link>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create account"}</Button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}