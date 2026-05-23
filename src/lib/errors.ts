/**
 * 공통 에러 처리.
 *
 * - AppError: 비즈니스 예외 (사용자에게 노출 가능한 message + code).
 * - ServerActionResult<T>: Server Action 의 표준 반환형.
 * - handleAction: Server Action 본문을 감싸 인증/권한/zod/AppError 를 일관 처리.
 */

import { z } from "zod";

/* =========================================================================
 * 에러 코드 enum
 * ========================================================================= */
export type AppErrorCode =
  | "UNAUTHORIZED"      // 미로그인
  | "FORBIDDEN"         // 권한 없음
  | "VALIDATION"        // zod 검증 실패
  | "NOT_FOUND"
  | "CONFLICT"          // 동시성/중복
  | "RATE_LIMIT"
  | "BUSINESS_RULE"     // 비즈니스 규칙 위반 (예: 이미 계약 종료)
  | "INTERNAL";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly cause?: unknown;
  /** 사용자에게 노출할지 (false 면 generic 메시지로 대체). */
  readonly safeToShow: boolean;

  constructor(
    code: AppErrorCode,
    message: string,
    opts: { status?: number; cause?: unknown; safeToShow?: boolean } = {},
  ) {
    super(message);
    this.code = code;
    this.status = opts.status ?? statusForCode(code);
    this.cause = opts.cause;
    this.safeToShow = opts.safeToShow ?? true;
    this.name = "AppError";
  }
}

function statusForCode(code: AppErrorCode): number {
  switch (code) {
    case "UNAUTHORIZED": return 401;
    case "FORBIDDEN": return 403;
    case "VALIDATION": return 400;
    case "NOT_FOUND": return 404;
    case "CONFLICT": return 409;
    case "RATE_LIMIT": return 429;
    case "BUSINESS_RULE": return 422;
    case "INTERNAL": return 500;
  }
}

/* =========================================================================
 * Server Action 표준 반환형.
 * 절대 throw 하지 않고 ok/err 로 분기 (Server Action 은 직렬화 후 클라에 도달).
 * ========================================================================= */

export type ServerActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: { code: AppErrorCode; message: string; fieldErrors?: Record<string, string[]> } };

export function okResult<T>(data: T): ServerActionResult<T> {
  return { ok: true, data };
}

export function errResult(
  code: AppErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>,
): ServerActionResult<never> {
  return { ok: false, error: { code, message, fieldErrors } };
}

/* =========================================================================
 * Server Action wrapper — 인증/권한/zod 검증 + 에러 변환.
 *
 * 사용 예:
 *   export const createLease = handleAction({
 *     schema: leaseSchema,
 *     requireRole: "admin",
 *     fn: async (input, ctx) => { ... return okResult(...) },
 *   });
 *
 * NOTE: 이 wrapper 자체는 'use server' 가 아님 — 호출 측 파일에 'use server' 선언.
 * ========================================================================= */

export interface ActionContext {
  user: { id: string; email: string | null };
  role: "admin" | "agency" | "tenant" | "anon";
}

export interface HandleActionConfig<S extends z.ZodTypeAny, R> {
  schema?: S;
  /** 'public' 은 anon 허용. 그 외는 해당 role 이상 요구. */
  requireRole?: "public" | "admin" | "agency" | "tenant_or_above";
  fn: (input: S extends z.ZodTypeAny ? z.infer<S> : undefined, ctx: ActionContext) => Promise<ServerActionResult<R>>;
  /** 권한 컨텍스트 로더. 호출부에서 주입. (DI 패턴) */
  loadContext: () => Promise<ActionContext>;
}

export async function handleAction<S extends z.ZodTypeAny, R>(
  rawInput: unknown,
  config: HandleActionConfig<S, R>,
): Promise<ServerActionResult<R>> {
  try {
    // 1) 인증/권한 컨텍스트
    const ctx = await config.loadContext();
    const required = config.requireRole ?? "admin";
    if (required !== "public" && ctx.role === "anon") {
      return errResult("UNAUTHORIZED", "로그인이 필요합니다.");
    }
    if (required === "admin" && ctx.role !== "admin") {
      return errResult("FORBIDDEN", "관리자 권한이 필요합니다.");
    }
    if (required === "agency" && ctx.role !== "agency" && ctx.role !== "admin") {
      return errResult("FORBIDDEN", "부동산 회원 권한이 필요합니다.");
    }

    // 2) zod 스키마 검증
    let parsed: unknown = undefined;
    if (config.schema) {
      const r = config.schema.safeParse(rawInput);
      if (!r.success) {
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of r.error.issues) {
          const key = issue.path.join(".") || "_";
          (fieldErrors[key] ??= []).push(issue.message);
        }
        return errResult("VALIDATION", "입력값을 확인해 주세요.", fieldErrors);
      }
      parsed = r.data;
    }

    // 3) 본문 실행
    return await config.fn(parsed as never, ctx);
  } catch (e) {
    if (e instanceof AppError) {
      return errResult(e.code, e.safeToShow ? e.message : "요청을 처리할 수 없습니다.");
    }
    // 알 수 없는 에러는 마스킹 후 로그.
    console.error("[handleAction] unhandled", e);
    return errResult("INTERNAL", "처리 중 오류가 발생했습니다.");
  }
}

/* =========================================================================
 * 빠른 throw 헬퍼
 * ========================================================================= */

export function requireAdmin(role: ActionContext["role"]): void {
  if (role !== "admin") throw new AppError("FORBIDDEN", "관리자 권한이 필요합니다.");
}

export function notFound(message = "찾을 수 없습니다."): never {
  throw new AppError("NOT_FOUND", message);
}

export function businessRule(message: string): never {
  throw new AppError("BUSINESS_RULE", message);
}
