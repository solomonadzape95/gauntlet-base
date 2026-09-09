"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { Activity, BarChart3, ChevronRight, Menu, Shield, Swords, Trophy, UserRound, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [openPath, setOpenPath] = useState<string | null>(null);
  const menuOpen = openPath === pathname;
  const activeLink = links.find(({ href }) => pathname === href || pathname.startsWith(`${href}/`));
  const ActiveIcon = activeLink?.icon ?? Menu;

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenPath(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label="Gauntlet home">
          <Logo />
          <span>Gauntlet</span>
        </Link>

        <div className="nav-menu-control">
          <button className={`nav-menu-trigger ${menuOpen ? "open" : ""}`} type="button" onClick={() => setOpenPath(menuOpen ? null : pathname)} aria-expanded={menuOpen} aria-controls="gauntlet-navigation">
            <span className="nav-menu-trigger-icon"><ActiveIcon size={15} aria-hidden /></span>
            <span><small>CURRENT</small><strong>{activeLink?.label ?? "MENU"}</strong></span>
            {menuOpen ? <X size={16} aria-hidden /> : <Menu size={16} aria-hidden />}
          </button>

          <AnimatePresence>
            {menuOpen && <>
              <motion.button className="nav-menu-scrim" type="button" aria-label="Close navigation menu" onClick={() => setOpenPath(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
              <motion.div id="gauntlet-navigation" className="nav-menu-panel" initial={{ opacity: 0, y: 14, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: .985 }} transition={{ duration: .16 }}>
                <span className="nav-menu-watermark" aria-hidden><Logo size={210} /></span>
                <div className="nav-menu-heading"><span><small>GAUNTLET SYSTEM</small><strong>SELECT A VIEW</strong></span><button type="button" onClick={() => setOpenPath(null)} aria-label="Close navigation"><X size={17} /></button></div>
                <nav className="nav-menu-grid" aria-label="Primary navigation">
                  {links.map(({ href, label, icon: Icon }, index) => {
                    const active = pathname === href || pathname.startsWith(`${href}/`);
                    return <Link key={href} href={href} className={`nav-menu-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined} onClick={() => setOpenPath(null)}>
                      <span className="nav-menu-index">0{index + 1}</span>
                      <span className="nav-menu-link-icon"><Icon size={19} aria-hidden /></span>
                      <span><small>{active ? "ACTIVE VIEW" : "OPEN VIEW"}</small><strong>{label}</strong></span>
                      <ChevronRight size={16} aria-hidden />
                    </Link>;
                  })}
                </nav>
              </motion.div>
            </>}
          </AnimatePresence>
        </div>

        <WalletButton compact />
      </div>
    </header>
  );
}
