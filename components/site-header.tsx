import Link from "next/link";
import { Activity, BarChart3, LayoutDashboard, Swords } from "lucide-react";

import { Logo } from "@/components/logo";
import { WalletButton } from "@/components/wallet-button";

const links = [
  { href: "/draft", label: "Draft", icon: Swords },
  { href: "/me", label: "Desk", icon: LayoutDashboard },
  { href: "/battle/demo", label: "Battle", icon: Activity },
  { href: "/impact", label: "Impact", icon: BarChart3 },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label="Gauntlet home">
          <Logo />
        </Link>

        <nav aria-label="Primary navigation">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="nav-link">
              <Icon size={14} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>

        <WalletButton compact />
      </div>
    </header>
  );
}
