"use client";

import Link from "next/link";
import { Activity, BarChart3, Shield, Swords, Trophy, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/logo";
import { WalletButton } from "@/components/wallet-button";

const links = [
  { href: "/draft", label: "Draft", icon: Swords },
  { href: "/me", label: "Player", icon: UserRound },
  { href: "/battle", label: "Battle", icon: Activity },
  { href: "/leaderboard", label: "Ranks", icon: Trophy },
  { href: "/leagues", label: "Leagues", icon: Shield },
  { href: "/impact", label: "Impact", icon: BarChart3 },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label="Gauntlet home">
          <Logo />
          <span>Gauntlet</span>
        </Link>

        <nav aria-label="Primary navigation">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`nav-link ${pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)) ? "active" : ""}`} aria-current={pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)) ? "page" : undefined}>
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
