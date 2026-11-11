import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes } from "react";
const variants = cva("button", {
  variants: {
    variant: { default: "primary", outline: "", paypal: "paypal-button" },
    size: { default: "", sm: "small", icon: "icon-only" },
  },
  defaultVariants: { variant: "default", size: "default" },
});
// shadcn-style, locally owned primitive. Styling stays in the shared design system.
export function Button({
  asChild = false,
  variant,
  size,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof variants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "button";
  return <Component className={twMerge(clsx(variants({ variant, size }), className))} {...props} />;
}
