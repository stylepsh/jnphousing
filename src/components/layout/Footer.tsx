import Link from "next/link";
import { Building2, Phone, MapPin, Mail, MessageCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-200">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-6 w-6 text-blue-400" />
              <span className="font-bold text-lg text-white">JNP주택관리</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              주택관리부터 위탁임대관리까지, 합리적이고 투명한 전문 서비스.
            </p>
            <div className="mt-6 space-y-2 text-sm text-slate-400">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span>서울특별시 ___ (사업장 주소)</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                <span>02-____-____</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <span>info@jnp-housing.com</span>
              </div>
              <div className="text-xs text-slate-500 pt-2">사업자등록번호: ___-__-_____</div>
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
            <h3 className="font-semibold text-white mb-4">입주민/파트너</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/tenant/complaint" className="text-slate-400 hover:text-white">민원/AS 접수</Link></li>
              <li><Link href="/tenant/notice" className="text-slate-400 hover:text-white">공지사항</Link></li>
              <li><Link href="/tenant/downloads" className="text-slate-400 hover:text-white">서류 다운로드</Link></li>
              <li><Link href="/agency/signup" className="text-slate-400 hover:text-white">부동산 가입</Link></li>
              <li>
                <a
                  href="#"
                  className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> 카카오톡 채널
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} JNP주택관리. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-slate-300">개인정보처리방침</Link>
            <Link href="/terms" className="hover:text-slate-300">이용약관</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
