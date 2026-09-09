"use client";

import { Type } from "lucide-react";
import { useEffect, useState } from "react";

type Typeface = "maple" | "satoshi";

export function TypefaceToggle() {
  const [typeface, setTypeface] = useState<Typeface>("maple");

  useEffect(() => {
    const saved = window.localStorage.getItem("gauntlet:typeface");
    const initial: Typeface = saved === "satoshi" ? "satoshi" : "maple";
    document.body.dataset.typeface = initial;
    const frame = window.requestAnimationFrame(() => setTypeface(initial));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function toggleTypeface() {
    const next: Typeface = typeface === "maple" ? "satoshi" : "maple";
    document.body.dataset.typeface = next;
    window.localStorage.setItem("gauntlet:typeface", next);
    setTypeface(next);
  }

  return <button className="typeface-toggle" type="button" onClick={toggleTypeface} aria-label={`Use ${typeface === "maple" ? "Satoshi" : "Maple Mono"} typeface`}><Type size={16} aria-hidden /><span>{typeface === "maple" ? "MAPLE" : "SATOSHI"}</span></button>;
}
