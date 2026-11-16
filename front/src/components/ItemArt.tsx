import type { ArtKind } from "@/lib/types";

interface Props {
  kind: ArtKind;
  size?: number;
  strokeWidth?: number;
}

const INK = "#1A1633";
const ACCENT = "#5A3BF0";

/** 이미지가 없는 물건에 쓰는 기본 일러스트 (디자인의 도형 그림). */
export default function ItemArt({ kind, size = 132, strokeWidth = 3 }: Props) {
  const line = {
    stroke: INK,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      {kind === "clock" && (
        <>
          <circle cx="50" cy="52" r="30" fill="#FFFFFF" {...line} />
          <path d="M50 52V34M50 52L63 59" fill="none" {...line} />
          <path
            d="M78 20v16M70 28h16"
            fill="none"
            stroke={ACCENT}
            strokeWidth={strokeWidth + 1}
            strokeLinecap="round"
          />
        </>
      )}
      {kind === "umbrella" && (
        <>
          <path d="M16 54a34 34 0 0 1 68 0z" fill="#FFFFFF" {...line} />
          <path d="M50 20v34M50 54v26a7 7 0 0 1-14 0" fill="none" {...line} />
        </>
      )}
      {kind === "jar" && (
        <>
          <rect x="30" y="28" width="40" height="54" rx="10" fill="#FFFFFF" {...line} />
          <rect x="34" y="16" width="32" height="12" rx="3" fill="#FFFFFF" {...line} />
          <circle cx="50" cy="62" r="11" fill="#FF8A5B" {...line} />
        </>
      )}
      {kind === "key" && (
        <>
          <circle cx="34" cy="50" r="16" fill="#FFFFFF" {...line} />
          <path d="M50 50h34M72 50v12M82 50v9" fill="none" {...line} />
        </>
      )}
      {kind === "shoe" && (
        <>
          <path
            d="M18 62c0-12 6-22 14-24l10 8c6 3 14 3 20 0l8 8c6 3 12 5 12 12v6H18z"
            fill="#FFFFFF"
            {...line}
          />
          <path d="M18 74h64" fill="none" {...line} />
        </>
      )}
      {kind === "cloud" && (
        <>
          <path
            d="M30 70a14 14 0 0 1 2-28 20 20 0 0 1 38 4 12 12 0 0 1 0 24z"
            fill="#FFFFFF"
            {...line}
          />
          <path
            d="M38 78v8M52 78v8M66 78v8"
            fill="none"
            stroke={ACCENT}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </>
      )}
      {kind === "book" && (
        <>
          <path
            d="M16 28q17-8 34 0v50q-17-8-34 0zM50 28q17-8 34 0v50q-17-8-34 0z"
            fill="#FFFFFF"
            {...line}
          />
          <path
            d="M60 42h16M60 52h16M60 62h10"
            fill="none"
            stroke={ACCENT}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </>
      )}
      {kind === "lamp" && (
        <>
          <path d="M34 24h32l8 30H26z" fill="#FFFFFF" {...line} />
          <path d="M50 54v22M36 80h28" fill="none" {...line} />
          <path
            d="M50 8v8M24 18l5 5M76 18l-5 5"
            fill="none"
            stroke={ACCENT}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
