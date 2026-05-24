"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  destructive = false,
  onConfirm,
  loading = false,
}: AlertDialogProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alert-dialog-title"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !loading && onOpenChange(false)}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 animate-scale-in",
          "border border-border"
        )}
      >
        <div className="flex items-start gap-3 mb-4">
          {destructive && (
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          )}
          <div className="flex-1 pt-1">
            <h2 id="alert-dialog-title" className="text-lg font-bold tracking-tight">
              {title}
            </h2>
            {description && (
              <div className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</div>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "처리 중..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for imperative AlertDialog usage.
 *
 * ```tsx
 * const confirm = useConfirm();
 * if (await confirm({ title: "삭제하시겠습니까?", destructive: true })) {
 *   await deleteItem();
 * }
 * ```
 */
interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve?: (value: boolean) => void;
}

export function useConfirm() {
  const [state, setState] = React.useState<ConfirmState>({ open: false, title: "" });

  const confirm = React.useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...opts, open: true, resolve });
    });
  }, []);

  const handleConfirm = React.useCallback(() => {
    state.resolve?.(true);
    setState((s) => ({ ...s, open: false }));
  }, [state]);

  const handleCancel = React.useCallback((open: boolean) => {
    if (!open) {
      state.resolve?.(false);
      setState((s) => ({ ...s, open: false }));
    }
  }, [state]);

  const dialog = (
    <AlertDialog
      open={state.open}
      onOpenChange={handleCancel}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      destructive={state.destructive}
      onConfirm={handleConfirm}
    />
  );

  return { confirm, dialog };
}
