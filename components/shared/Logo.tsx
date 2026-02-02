import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { container: "w-12 h-12", image: 48 },
  md: { container: "w-14 h-14", image: 56 },
  lg: { container: "w-16 h-16", image: 64 },
};

export function Logo({ href = "/", size = "md", showText = true, className = "" }: LogoProps) {
  const sizeConfig = sizes[size];

  const content = (
    <div className={`flex items-center gap-2.5 group ${className}`}>
      <div className={`${sizeConfig.container} rounded-xl flex-shrink-0`}>
        <Image
          src="/logo.png"
          alt="Hirvo.Ai Logo"
          width={sizeConfig.image}
          height={sizeConfig.image}
          className="w-full h-full object-contain"
          priority
        />
      </div>
      {showText && (
        <span className="font-display font-semibold text-xl text-foreground">
          Hirvo<span className="text-accent">.Ai</span>
        </span>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
