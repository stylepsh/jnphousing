import type { Metadata } from "next";
import { COMPANY } from "@/lib/company";
import { PUBLIC_SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "이용약관",
  description: `${COMPANY.brand} 웹사이트 이용약관`,
};

export default function TermsPage() {
  return (
    <>
      <section className="bg-primary text-white py-16">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-blue-300 text-sm font-semibold uppercase tracking-wide">Terms of Service</p>
          <h1 className="mt-2 heading-section">이용약관</h1>
          <p className="mt-3 text-sm text-blue-100">시행일: 2026-05-08</p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-6 py-12 prose prose-slate max-w-none text-foreground/85 leading-relaxed">
        <h2 className="text-xl font-bold mt-2 mb-3">제1조 (목적)</h2>
        <p>
          본 약관은 {COMPANY.legalName}(이하 &ldquo;회사&rdquo;)이 운영하는 웹사이트
          ({PUBLIC_SITE_URL}, 이하 &ldquo;사이트&rdquo;)에서
          제공하는 주택관리·위탁임대관리 관련 서비스(이하 &ldquo;서비스&rdquo;)의 이용 조건을 정합니다.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">제2조 (용어의 정의)</h2>
        <ol className="list-decimal pl-6 space-y-1">
          <li>&ldquo;이용자&rdquo;: 사이트에 접속하여 본 약관에 따라 서비스를 이용하는 자.</li>
          <li>&ldquo;임대인&rdquo;: 회사에 주택관리·위탁임대관리를 의뢰한 부동산 소유자.</li>
          <li>&ldquo;임차인&rdquo;: 회사가 관리하는 건물에 거주 중인 자.</li>
          <li>&ldquo;부동산 회원&rdquo;: 회사와 매물 정보를 공유하는 공인중개사.</li>
          <li>&ldquo;관리자&rdquo;: 회사 임직원으로서 시스템에 등록된 운영 권한 보유자.</li>
        </ol>

        <h2 className="text-xl font-bold mt-8 mb-3">제3조 (약관의 게시와 변경)</h2>
        <ol className="list-decimal pl-6 space-y-1">
          <li>본 약관은 사이트 초기화면 또는 푸터를 통해 게시합니다.</li>
          <li>회사는 관련 법령을 위배하지 않는 범위에서 약관을 개정할 수 있으며, 개정 시 시행일 7일 전(이용자에게 불리한 변경은 30일 전) 공지합니다.</li>
        </ol>

        <h2 className="text-xl font-bold mt-8 mb-3">제4조 (서비스 내용)</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>회사 소개·서비스 소개·관리현장 정보 조회</li>
          <li>신규 관리·위탁 문의 접수</li>
          <li>임차인 민원·AS 접수 및 처리 상태 조회</li>
          <li>공지사항·서류 다운로드</li>
          <li>부동산 회원: 공실 매물 정보 열람</li>
          <li>임대인: 본인 자산 현황·정산·보고서 조회</li>
          <li>관리자: 계약·임대료·민원·매물·회원 관리</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">제5조 (이용 신청 및 승낙)</h2>
        <ol className="list-decimal pl-6 space-y-1">
          <li>일반 이용자는 별도 가입 절차 없이 공개 페이지를 이용할 수 있습니다.</li>
          <li>부동산 회원 가입은 사업자등록번호 등 자격 확인 절차를 거쳐 승인됩니다.</li>
          <li>임대인·임차인 계정은 회사가 직접 발급합니다.</li>
        </ol>

        <h2 className="text-xl font-bold mt-8 mb-3">제6조 (이용자의 의무)</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>타인의 정보를 도용하거나 허위 정보를 등록하지 않을 것</li>
          <li>서비스 운영을 방해하는 행위(과도한 자동화 요청, 비정상 접근 등)를 하지 않을 것</li>
          <li>사이트에 게시된 자료를 무단 복제·배포하지 않을 것</li>
          <li>본 약관 및 관련 법령을 준수할 것</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">제7조 (회사의 의무)</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>안정적인 서비스 제공을 위해 노력</li>
          <li>이용자의 개인정보 보호 (별도 「개인정보처리방침」)</li>
          <li>이용자의 의견·민원에 성실히 응대</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">제8조 (서비스 제공의 중단)</h2>
        <p>
          회사는 시스템 점검, 정전, 천재지변, 통신장애 등 불가항력적 사유로 서비스 제공이 일시
          중단될 수 있으며, 이 경우 이용자에게 사전 또는 사후 공지합니다.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">제9조 (게시물 관리)</h2>
        <p>
          이용자가 게시한 내용이 법령을 위반하거나 타인의 권리를 침해할 경우 회사는 사전 통지 없이
          삭제·블라인드 처리할 수 있습니다.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">제10조 (면책)</h2>
        <ol className="list-decimal pl-6 space-y-1">
          <li>회사는 천재지변, 전쟁, 불가항력적 사유로 인한 서비스 중단에 책임지지 않습니다.</li>
          <li>이용자 본인의 귀책사유로 인한 손해에 대해 책임지지 않습니다.</li>
          <li>이용자가 게시한 정보의 신뢰도·정확성에 대해 회사는 책임지지 않습니다.</li>
        </ol>

        <h2 className="text-xl font-bold mt-8 mb-3">제11조 (분쟁 해결)</h2>
        <p>
          본 약관에 관한 분쟁은 대한민국 법령을 준거법으로 하며, 회사 본점 소재지 관할 법원을 합의관할로 합니다.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">부칙</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>본 약관은 2026-05-08 부터 시행합니다.</li>
        </ul>

        <p className="mt-10 text-sm text-muted-foreground">
          문의: {COMPANY.contact.phone} · {COMPANY.contact.email}
          <br />
          사업장: {COMPANY.branches[0].address}, {COMPANY.branches[0].detail}
        </p>
      </article>
    </>
  );
}
