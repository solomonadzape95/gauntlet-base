import Link from "next/link";
import { Activity, BarChart3, Swords } from "lucide-react";

import { Logo } from "@/components/logo";

const links = [
  { href: "/draft", label: "Draft", icon: Swords },
  { href: "/battle/demo", label: "Battle", icon: Activity },
  { href: "/impact", label: "Impact", icon: BarChart3 },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label="Gauntlet home">
          <Logo />
          <span>GAUNTLET</span>
        </Link>

        <nav aria-label="Primary navigation">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="nav-link">
              <Icon size={14} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>

        <Link className="wallet-stub" href="/draft">
          PLAY FREE
        </Link>
      </div>
    </header>
  );
}
