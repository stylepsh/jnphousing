"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** 표시할 에러 메시지. 비어있으면 렌더링 안 됨 */
  message?: string | null | undefined;
  /** 연결된 input 의 id (aria-describedby 매칭용) */
  id?: string;
  /** 아이콘 숨김 (좁은 공간) */
  hideIcon?: boolean;
}

/**
 * 폼 필드 아래 에러 메시지 표시.
 *
 * 사용 패턴:
 * ```tsx
 * <Input
 *   aria-invalid={!!error}
 *   aria-describedby={error ? `${id}-error` : undefined}
 * />
 * <FormError id={`${id}-error`} message={error} />
 * ```
 *
 * - role="alert" + aria-live="polite": 스크린리더가 에러 발생 시 자동 알림
 * - 토큰 색상 사용 (text-error / error-bg) — 직접 hex 금지
 */
export function FormError({
  message,
  id,
  hideIcon = false,
  className,
  ...props
}: FormErrorProps) {
  if (!message) return null;

  return (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      className={cn(
        "mt-1.5 text-xs font-medium flex items-start gap-1",
        "text-[var(--error)]",
        className
      )}
      {...props}
    >
      {!hideIcon && (
        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
      )}
      <span>{message}</span>
    </p>
  );
}

interface FormHintProps extends React.HTMLAttributes<HTMLParagraphElement> {
  message?: string | null;
}

/**
 * 폼 필드 아래 안내 메시지 (에러 아닌 도움말).
 * 에러가 있으면 FormError 가 우선 표시되도록 함께 사용.
 */
export function FormHint({ message, className, ...props }: FormHintProps) {
  if (!message) return null;
  return (
    <p className={cn("mt-1.5 text-xs text-muted-foreground", className)} {...props}>
      {message}
    </p>
  );
}

/**
 * Field 래퍼 — Label + Input + FormError 일관된 간격.
 * Input 컴포넌트에 aria-invalid 자동 적용.
 */
interface FieldProps {
  id: string;
  label?: React.ReactNode;
  required?: boolean;
  error?: string | null;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({ id, label, required, error, hint, className, children }: FieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const describedBy = errorId ?? hintId;

  // children 에 aria 속성 주입
  const enhanced = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        id,
        "aria-invalid": error ? "true" : undefined,
        "aria-describedby": describedBy,
        "aria-required": required || undefined,
      })
    : children;

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium">
          {label}
          {required && <span className="ml-1 text-[var(--error)]" aria-hidden="true">*</span>}
        </label>
      )}
      {enhanced}
      {error
        ? <FormError id={errorId} message={error} />
        : hint && <FormHint id={hintId} message={hint} />}
    </div>
  );
}
