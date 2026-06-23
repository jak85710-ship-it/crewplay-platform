import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  showWordmark?: boolean;
  wordmark?: "full" | "en";
  layout?: "inline" | "stacked";
  size?: "sm" | "nav" | "md" | "lg" | "hero";
  href?: string;
  className?: string;
};

const sizes = {
  sm: { img: 40, text: "text-sm", sub: "text-[0.62em]" },
  nav: { img: 56, text: "text-xl", sub: "text-[0.62em]" },
  md: { img: 48, text: "text-base", sub: "text-[0.62em]" },
  lg: { img: 80, text: "text-2xl", sub: "text-[0.55em]" },
  hero: { img: 120, text: "text-3xl sm:text-4xl", sub: "text-[0.55em]" },
};

export function BrandLogo({
  showWordmark = true,
  wordmark = "full",
  layout = "inline",
  size = "md",
  href = "/",
  className = "",
}: BrandLogoProps) {
  const s = sizes[size];
  const stacked = layout === "stacked";
  const content = (
    <>
      <Image
        src="/brand/logo.png"
        alt="CrewPlay"
        width={s.img}
        height={s.img}
        className="h-auto w-auto shrink-0 object-contain"
        style={{ width: s.img, height: s.img }}
        priority
      />
      {showWordmark && (
        <span
          className={`font-bold leading-tight text-brand-900 ${s.text} ${stacked ? "mt-3 text-center" : ""}`}
        >
          CrewPlay
          {wordmark === "full" && (
            <span className={`block font-semibold tracking-wide text-brand-600 ${s.sub}`}>
              運動媒合平台
            </span>
          )}
        </span>
      )}
    </>
  );

  const wrapClass = stacked
    ? `flex flex-col items-center ${className}`
    : `flex items-center gap-2.5 ${className}`;

  if (!href) {
    return <div className={wrapClass}>{content}</div>;
  }

  return (
    <Link href={href} className={wrapClass}>
      {content}
    </Link>
  );
}

export function BrandLogoMark({ size = 64 }: { size?: number }) {
  return (
    <Image
      src="/brand/logo.png"
      alt="CrewPlay"
      width={size}
      height={size}
      className="object-contain"
      style={{ width: size, height: size }}
      priority
    />
  );
}
