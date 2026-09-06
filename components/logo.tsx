export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span
      role="img"
      aria-label="Gauntlet"
      className="logo-mark"
      style={{ width: size, height: size }}
    />
  );
}
