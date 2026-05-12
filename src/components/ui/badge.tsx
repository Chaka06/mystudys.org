import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-brand-orange text-white",
        secondary: "bg-brand-green text-white",
        outline: "border border-brand-orange text-brand-orange",
        soft: "bg-brand-orange/10 text-brand-orange",
        "soft-green": "bg-brand-green/10 text-brand-green",
        destructive: "bg-red-500 text-white",
        muted: "bg-muted text-muted-foreground",
        notification: "bg-red-500 text-white min-w-[18px] h-[18px] flex items-center justify-center p-0 text-[10px] font-bold",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
