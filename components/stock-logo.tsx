import {
  siApple,
  siGoogle,
  siMeta,
  siMicrostrategy,
  siNvidia,
  siSpacex,
  siTesla,
} from "simple-icons/icons";

const logoPaths: Record<string, string> = {
  AAPLc: siApple.path,
  GOOGLc: siGoogle.path,
  METAc: siMeta.path,
  MSTRc: siMicrostrategy.path,
  NVDAc: siNvidia.path,
  SPCXc: siSpacex.path,
  TSLAc: siTesla.path,
};

export function StockLogo({ ticker }: { ticker: string }) {
  const path = logoPaths[ticker];

  if (ticker === "MSFTc") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M1 1h10v10H1zm12 0h10v10H13zM1 13h10v10H1zm12 0h10v10H13z" />
      </svg>
    );
  }

  if (ticker === "AMZNc") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.2 14.8c4.85 3.6 11.55 3.85 16.7.58.82-.52 1.6.72.72 1.38-5.84 4.4-13.93 3.83-18.56-.34-.78-.7.03-1.83.88-1.22l.96.98Zm16.03-1.72c1.08-.13 3.46-.4 3.88.14.43.54-.47 2.78-.87 3.8-.12.32.14.45.42.2 1.82-1.54 2.3-4.78 1.92-5.26-.38-.47-3.66-.88-5.6.5-.3.21-.25.5.25.44Z" />
      </svg>
    );
  }

  if (ticker === "SNDKc") {
    return <span className="sandisk-mark" aria-hidden="true">SanDisk</span>;
  }

  return path ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={path} />
    </svg>
  ) : null;
}
