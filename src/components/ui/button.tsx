import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:border-destructive/40 focus-visible:ring-destructive/30",
        success:
          "bg-success text-success-foreground hover:bg-success/90 focus-visible:ring-success/30",
        warning:
          "bg-warning text-warning-foreground hover:bg-warning/90 focus-visible:ring-warning/30",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 gap-2 px-4 py-2",
        xs: "h-7 gap-1 rounded-md px-2.5 text-xs",
        sm: "h-8 gap-1.5 rounded-md px-3 text-sm",
        lg: "h-12 gap-2 rounded-lg px-6 text-base",
        icon: "size-10",
        "icon-xs": "size-7 rounded-md",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-12 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonOwnProps = VariantProps<typeof buttonVariants> & {
  asChild?: boolean;
  className?: string;
  children?: React.ReactNode;
  /** 로딩 중: spinner 표시 + 자동 disabled + aria-busy */
  loading?: boolean;
  /** 로딩 시 spinner 옆에 표시할 텍스트 (기본: children) */
  loadingText?: React.ReactNode;
  /** 에러 상태: aria-invalid + 시각적 border ring (form validation 실패) */
  error?: boolean;
};

type ButtonProps = ButtonOwnProps & Omit<React.ComponentProps<"button">, keyof ButtonOwnProps>;

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  loadingText,
  error = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const ariaProps = {
    "aria-busy": loading || undefined,
    "aria-invalid": error || undefined,
  };

  const content = loading ? (
    <>
      <Loader2 className="animate-spin" aria-hidden="true" />
      <span>{loadingText ?? children}</span>
    </>
  ) : children;

  if (asChild) {
    // asChild 모드: loading/error 상태도 표시 (Slot 으로 패스)
    return (
      <Slot
        data-slot="button"
        data-loading={loading || undefined}
        data-error={error || undefined}
        className={cn(buttonVariants({ variant, size, className }))}
        {...ariaProps}
        {...(props as React.ComponentProps<typeof Slot>)}
      >
        {content as React.ReactElement}
      </Slot>
    );
  }
  return (
    <ButtonPrimitive
      data-slot="button"
      data-loading={loading || undefined}
      data-error={error || undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={isDisabled}
      {...ariaProps}
      {...(props as React.ComponentProps<typeof ButtonPrimitive>)}
    >
      {content}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants, type ButtonProps }
