import Link from "next/link";
import LogoutButton from "./logout-button";
import Logo from "../_components/logo";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" aria-label="Sinistria Vv — tableau de bord">
            <Logo />
          </Link>
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
