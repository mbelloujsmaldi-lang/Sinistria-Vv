import Link from "next/link";
import LogoutButton from "./logout-button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-baseline gap-2">
            <span className="text-xl font-semibold tracking-tight text-ink">
              Sinistria
            </span>
            <span className="rounded bg-signal-bg px-1.5 py-0.5 text-xs font-medium text-signal">
              VV
            </span>
          </Link>
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
