import { cn } from "@/lib/utils";

interface GradientHeadingProps {
  children: React.ReactNode;
  className?: string;
}

export function GradientHeading({ children, className }: GradientHeadingProps) {
  return (
    <h1 className={cn("gradient-text font-bold", className)}>
      {children}
    </h1>
  );
}
