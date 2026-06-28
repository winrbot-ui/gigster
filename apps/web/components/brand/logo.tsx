import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2 text-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className="grid size-7 place-items-center rounded-md border border-border-strong bg-surface-2 text-accent"
      >
        <span className="text-sm font-semibold leading-none">G</span>
      </span>
      <span className="text-base font-semibold tracking-tight">
        Gigster
      </span>
    </Link>
  );
}
