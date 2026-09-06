import { cn } from "@/lib/utils";

export function Badge({
  className,
  dot,
  children,
}: {
  className?: string;
  dot?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium",
        className ?? "border-line-strong bg-surface-3 text-fg-soft",
      )}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: dot }}
        />
      )}
      {children}
    </span>
  );
}
