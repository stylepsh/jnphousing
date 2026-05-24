import Link from "next/link";
import { Building2, Phone, MapPin, Mail, MessageCircle, Users } from "lucide-react";
import { COMPANY } from "@/lib/company";

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-200">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-6 w-6 text-blue-400" />
              <span className="font-bold text-lg text-white">{COMPANY.brand}</span>
              <span className="text-xs text-slate-500 ml-1">({COMPANY.legalName})</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              {COMPANY.business.summary} · {COMPANY.yearsOfExperience}년 노하우
              <br />
              {COMPANY.serviceArea} 전 지역 서비스
            </p>

            {/* 지점 정보 */}
            <div className="mt-6 space-y-4 text-sm">
              {COMPANY.branches.map((b) => (
                <div key={b.label} className="flex items-start gap-2 text-slate-400">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-blue-400" />
                  <div>
                    <div className="text-xs font-semibold text-slate-300 mb-0.5">{b.label}</div>
                    <div>{b.address}</div>
                    <div className="text-xs text-slate-500">{b.detail}</div>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 text-slate-400">
                <Phone className="h-4 w-4 shrink-0 text-blue-400" />
                <a href={COMPANY.contact.phoneHref} className="hover:text-white">{COMPANY.contact.phone}</a>
                <span className="text-xs text-slate-500">({COMPANY.contact.phoneLabel})</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Mail className="h-4 w-4 shrink-0 text-blue-400" />
                <span>{COMPANY.contact.email}</span>
              </div>
              <div className="text-xs text-slate-500 pt-1">
                대표 {COMPANY.representative} · 사업자등록번호 {COMPANY.legal.registrationNumber} · {COMPANY.legal.taxType}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">바로가기</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-slate-400 hover:text-white">회사소개</Link></li>
              <li><Link href="/services" className="text-slate-400 hover:text-white">서비스</Link></li>
              <li><Link href="/properties" className="text-slate-400 hover:text-white">관리현장</Link></li>
              <li><Link href="/contact" className="text-slate-400 hover:text-white">관리문의</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">입주민·파트너</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/tenant/complaint" className="text-slate-400 hover:text-white">민원/AS 접수</Link></li>
              <li><Link href="/tenant/notice" className="text-slate-400 hover:text-white">공지사항</Link></li>
              <li><Link href="/tenant/downloads" className="text-slate-400 hover:text-white">서류 다운로드</Link></li>
              <li><Link href="/agency/signup" className="text-slate-400 hover:text-white">부동산 가입</Link></li>
              <li>
                <a
                  href={COMPANY.contact.kakaoOpenChat}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-yellow-300 hover:text-yellow-200 font-medium"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  카카오톡 그룹채팅
                </a>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5 ml-5">
                  <Users className="h-2.5 w-2.5" /> 민원·제휴·문의 통합방
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {COMPANY.brand}. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-slate-300">개인정보처리방침</Link>
            <Link href="/terms" className="hover:text-slate-300">이용약관</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
