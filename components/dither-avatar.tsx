"use client";

import { useEffect, useRef } from "react";

import { AVATAR_TONES, type AvatarTone } from "@/components/gauntlet-auth";

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function DitherAvatar({ seed, tone = "hazard", size = 36 }: { seed: string; tone?: AvatarTone; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const grid = 8;
    const cell = 4;
    const color = AVATAR_TONES.find((item) => item.id === tone)?.color ?? "#f5ff00";
    let state = hashSeed(seed || "gauntlet") || 1;
    const random = () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
    const pattern = Array.from({ length: grid * (grid / 2) }, () => random() > 0.42);

    canvas.width = grid * cell;
    canvas.height = grid * cell;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = color;

    for (let row = 0; row < grid; row += 1) {
      for (let column = 0; column < grid; column += 1) {
        const source = row * (grid / 2) + Math.min(column, grid - 1 - column);
        if (!pattern[source]) continue;
        for (let y = 0; y < cell; y += 1) {
          for (let x = 0; x < cell; x += 1) {
            if (((x + y * 3 + source) % 5) !== 0) context.fillRect(column * cell + x, row * cell + y, 1, 1);
          }
        }
      }
    }
  }, [seed, tone]);

  return <canvas ref={ref} className="dither-avatar" style={{ width: size, height: size }} role="img" aria-label="Generated player avatar" />;
}
