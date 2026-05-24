"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type AccordionType = "single" | "multiple";

interface AccordionContextValue {
  type: AccordionType;
  openValues: Set<string>;
  toggle: (value: string) => void;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

interface AccordionProps {
  type?: AccordionType;
  collapsible?: boolean;
  defaultValue?: string | string[];
  className?: string;
  children: React.ReactNode;
}

export function Accordion({
  type = "single",
  collapsible = true,
  defaultValue,
  className,
  children,
}: AccordionProps) {
  const [openValues, setOpenValues] = React.useState<Set<string>>(() => {
    if (!defaultValue) return new Set();
    return new Set(Array.isArray(defaultValue) ? defaultValue : [defaultValue]);
  });

  const toggle = React.useCallback(
    (value: string) => {
      setOpenValues((prev) => {
        const next = new Set(prev);
        if (next.has(value)) {
          if (collapsible || type === "multiple") next.delete(value);
        } else {
          if (type === "single") next.clear();
          next.add(value);
        }
        return next;
      });
    },
    [type, collapsible]
  );

  return (
    <AccordionContext.Provider value={{ type, openValues, toggle }}>
      <div className={cn("divide-y divide-border", className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

const ItemContext = React.createContext<{ value: string; open: boolean } | null>(null);

export function AccordionItem({ value, className, children }: AccordionItemProps) {
  const ctx = React.useContext(AccordionContext);
  if (!ctx) throw new Error("AccordionItem must be inside Accordion");
  const open = ctx.openValues.has(value);
  return (
    <ItemContext.Provider value={{ value, open }}>
      <div className={cn("", className)} data-state={open ? "open" : "closed"}>
        {children}
      </div>
    </ItemContext.Provider>
  );
}

interface AccordionTriggerProps {
  className?: string;
  children: React.ReactNode;
}

export function AccordionTrigger({ className, children }: AccordionTriggerProps) {
  const ctx = React.useContext(AccordionContext);
  const item = React.useContext(ItemContext);
  if (!ctx || !item) throw new Error("AccordionTrigger must be inside AccordionItem");
  return (
    <button
      type="button"
      onClick={() => ctx.toggle(item.value)}
      aria-expanded={item.open}
      className={cn(
        "flex w-full items-center justify-between gap-4 py-4 text-sm font-medium transition-all hover:underline-offset-4",
        className
      )}
    >
      <span className="flex-1 text-left">{children}</span>
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
          item.open && "rotate-180"
        )}
      />
    </button>
  );
}

interface AccordionContentProps {
  className?: string;
  children: React.ReactNode;
}

export function AccordionContent({ className, children }: AccordionContentProps) {
  const item = React.useContext(ItemContext);
  if (!item) throw new Error("AccordionContent must be inside AccordionItem");
  if (!item.open) return null;
  return (
    <div className={cn("pb-4 pt-0 text-sm animate-fade-in", className)}>
      {children}
    </div>
  );
}
