import { cn } from "@/lib/cn";

/** Centered, max-width page container with responsive horizontal padding. */
export function Container({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8", className)}
      {...props}
    />
  );
}
