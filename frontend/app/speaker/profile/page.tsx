"use client";

import { ShieldCheck, UserCircle2 } from "lucide-react";
import { SpeakerShell } from "@/components/speaker/speaker-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { formatDateTime } from "@/lib/utils";

export default function SpeakerProfilePage() {
  const { user } = useAuth();

  return (
    <SpeakerShell title="Speaker profile" subtitle="Keep a clean view of the account details attached to your speaker workspace.">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-panel p-6 md:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-white/10 bg-white/5"><UserCircle2 className="h-8 w-8 text-orange-300" /></div>
            <div>
              <div className="text-2xl font-semibold text-white">{user?.displayName}</div>
              <div className="mt-1 text-sm text-white/60">{user?.email}</div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              ["Username", user?.username || "-"],
              ["Role", user?.roleTitle || "Not set"],
              ["Organization", user?.organization || "Not set"],
              ["Member since", user?.createdAt ? formatDateTime(user.createdAt) : "-"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[22px] border border-white/8 bg-navy-950/60 p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-white/42">{label}</div>
                <div className="mt-3 text-lg font-medium text-white">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6 md:p-8">
          <div className="flex items-center gap-2 text-sm font-medium text-white"><ShieldCheck className="h-4 w-4 text-orange-300" /> Workspace controls</div>
          <p className="mt-4 text-sm leading-7 text-white/66">This page is designed for speaker-facing account details. If you later want editable profile settings, team roles, or password rotation, that can be added on top of the same workspace structure.</p>
        </div>
      </section>
    </SpeakerShell>
  );
}