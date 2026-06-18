import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  variant: "black" | "white";
};

export function BrandLogo({
  className = "",
  priority = false,
  variant,
}: BrandLogoProps) {
  return (
    <Image
      src={variant === "white" ? "/logo_white.png" : "/logo_black.png"}
      alt="Huntfields"
      width={7500}
      height={1875}
      priority={priority}
      sizes="(min-width: 1024px) 220px, 160px"
      className={`h-auto ${className}`}
    />
  );
}

type BrandIconProps = {
  className?: string;
  priority?: boolean;
};

export function BrandIcon({
  className = "size-9",
  priority = false,
}: BrandIconProps) {
  return (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-md bg-[#183326] shadow-[0_12px_26px_rgba(24,51,38,0.2)] ${className}`}
      aria-hidden="true"
    >
      <Image
        src="/Favicon.png"
        alt=""
        fill
        priority={priority}
        sizes="48px"
        className="object-cover"
      />
    </span>
  );
}
