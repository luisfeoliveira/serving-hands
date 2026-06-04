import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** "mark" = icon only; "full" = icon + wordmark (default) */
  variant?: "mark" | "full";
  className?: string;
}

export function Logo({ variant = "full", className }: LogoProps) {
  const mark = (
    <Image
      src="/logo.png"
      alt="Mãos que Servem"
      width={120}
      height={40}
      className="shrink-0 object-contain"
      priority
    />
  );

  if (variant === "mark") {
    return <span className={cn("inline-flex", className)}>{mark}</span>;
  }

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {mark}
      <span className="flex flex-col leading-none">
        <span className="text-[10px] font-medium uppercase tracking-widest text-primary-foreground/60">
          Congregação Betel
        </span>
        <span className="text-sm font-semibold text-primary-foreground">
          Ação Social IV
        </span>
      </span>
    </span>
  );
}
