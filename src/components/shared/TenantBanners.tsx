/**
 * 임차인 포털 알림 배너 (P27-73, P27-74).
 *
 * - 계약 만기 60일 전: 갱신 안내
 * - 미납 발생: 입금 안내 (due_date 가 7일 안에 + 미납)
 */
import Link from "next/link";
import { AlertTriangle, CalendarClock } from "lucide-react";

interface LeaseExpiryBannerProps {
  endDate: string;
  daysUntilExpiry: number;
}

export function LeaseExpiryBanner({ endDate, daysUntilExpiry }: LeaseExpiryBannerProps) {
  if (daysUntilExpiry > 60 || daysUntilExpiry < 0) return null;

  const urgent = daysUntilExpiry <= 30;
  return (
    <div className={`rounded-xl border p-4 mb-4 flex items-start gap-3 ${
      urgent
        ? "bg-amber-50 border-amber-200 text-amber-900"
        : "bg-blue-50 border-blue-200 text-blue-900"
    }`}>
      <CalendarClock className="h-5 w-5 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="font-bold text-sm">
          계약 만료 {daysUntilExpiry}일 전 안내
        </p>
        <p className="text-xs mt-0.5">
          만료일 {endDate.slice(0, 10)} · 갱신 의향이 있으시면 관리실에 알려 주세요.
        </p>
      </div>
      <Link href="/tenant/my-lease" className="text-xs font-semibold underline whitespace-nowrap">
        계약 확인
      </Link>
    </div>
  );
}

interface UnpaidBannerProps {
  amount: number;
  daysUntilDue: number;
}

export function UnpaidBanner({ amount, daysUntilDue }: UnpaidBannerProps) {
  if (amount <= 0) return null;
  const overdue = daysUntilDue < 0;

  return (
    <div className={`rounded-xl border p-4 mb-4 flex items-start gap-3 ${
      overdue
        ? "bg-red-50 border-red-200 text-red-900"
        : daysUntilDue <= 7
        ? "bg-amber-50 border-amber-200 text-amber-900"
        : "bg-blue-50 border-blue-200 text-blue-900"
    }`}>
      <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="font-bold text-sm">
          {overdue
            ? `${Math.abs(daysUntilDue)}일 연체 (이자 발생 중)`
            : daysUntilDue <= 7
            ? `${daysUntilDue}일 후 임대료 마감일`
            : `다음 임대료 마감일까지 ${daysUntilDue}일`}
        </p>
        <p className="text-xs mt-0.5">
          미납액 <strong className="tabular-nums">{amount.toLocaleString()}원</strong>
        </p>
      </div>
      <Link href="/tenant/my-rent" className="text-xs font-semibold underline whitespace-nowrap">
        납부 내역
      </Link>
    </div>
  );
}
