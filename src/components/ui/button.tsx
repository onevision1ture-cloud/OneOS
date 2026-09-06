"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/motion/loaders";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-brand-fg shadow-[0_6px_20px_-8px_var(--brand-glow)] hover:bg-brand-hover active:bg-brand-active",
        secondary: "bg-surface-3 text-fg hover:bg-surface-4 border border-line",
        outline:
          "border border-brand/45 text-brand hover:bg-brand-soft hover:border-brand",
        ghost: "text-fg-soft hover:bg-surface-3 hover:text-fg",
        danger: "bg-danger text-white hover:brightness-110",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs [&_svg]:size-3.5",
        md: "h-10 px-4 text-sm [&_svg]:size-4",
        lg: "h-11 px-6 text-sm [&_svg]:size-4",
        icon: "h-9 w-9 [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type BaseProps = VariantProps<typeof buttonVariants> & {
  loading?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export type ButtonProps = BaseProps &
  Omit<HTMLMotionProps<"button">, "children" | "className"> & {
    /** Renderiza o filho no lugar do <button> — usado com <Link>. */
    asChild?: boolean;
  };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, loading, children, disabled, asChild, ...props },
    ref,
  ) => {
    const classes = cn(buttonVariants({ variant, size }), className);

    // Com asChild o filho vira o elemento renderizado (ex.: <Link>),
    // então abrimos mão das props de motion.
    if (asChild) {
      return (
        <Slot
          ref={ref as React.Ref<HTMLElement>}
          className={classes}
          {...(props as React.HTMLAttributes<HTMLElement>)}
        >
          {children}
        </Slot>
      );
    }

    return (
      <motion.button
        ref={ref}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.14 }}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Spinner size={15} />}
        {children}
      </motion.button>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
