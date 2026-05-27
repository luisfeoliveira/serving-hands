import { cn } from "@/lib/utils";

interface HashtagProps {
  className?: string;
  size?: "sm" | "md";
}

/**
 * #IGREJAUNIDA / MISSÃOCUMPRIDA brand hashtag.
 * Rendered inline — no image dependency.
 */
export function Hashtag({ className, size = "sm" }: HashtagProps) {
  const baseSize = size === "md" ? "text-base" : "text-[11px]";
  const hashSize = size === "md" ? "text-3xl" : "text-xl";

  return (
    <div
      className={cn("inline-flex items-center gap-1.5 select-none", className)}
      style={{ color: "#286291" }}
    >
      <span className={cn(hashSize, "font-black leading-none")}>#</span>
      <div className={cn("flex flex-col leading-[1.15]", baseSize)}>
        <div>
          <span className="font-light tracking-wide">IGREJA</span>
          <span className="font-black tracking-wide">UNIDA</span>
        </div>
        <div>
          <span className="font-light tracking-wide">MISSÃO</span>
          <span className="font-black tracking-wide">CUMPRIDA</span>
        </div>
      </div>
    </div>
  );
}
