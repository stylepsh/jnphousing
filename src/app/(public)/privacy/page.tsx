import type { Metadata } from "next";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: `${COMPANY.brand}의 개인정보 수집·이용·보관·파기 원칙을 안내합니다.`,
};

export default function PrivacyPage() {
  return (
    <>
      <section className="bg-primary text-white py-16">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-blue-300 text-sm font-semibold uppercase tracking-wide">Privacy Policy</p>
          <h1 className="mt-2 heading-section">개인정보처리방침</h1>
          <p className="mt-3 text-sm text-blue-100">시행일: 2026-05-08</p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-6 py-12 prose prose-slate max-w-none text-foreground/85 leading-relaxed">
        <p>
          {COMPANY.legalName}(이하 &ldquo;회사&rdquo;)은 정보주체의 개인정보를 중요시하며,
          「개인정보 보호법」 및 관계 법령을 준수합니다. 본 방침은 회사가 운영하는
          웹사이트({process.env.NEXT_PUBLIC_SITE_URL ?? "https://jnphousing.com"})에서 수집·이용되는
          개인정보의 항목과 그 처리 방법을 안내합니다.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">1. 수집하는 개인정보 항목</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>관리문의 폼</strong>: 회사명, 담당자명, 연락처, 이메일, 건물 주소, 문의 내용</li>
          <li><strong>민원·AS 접수</strong>: 입주자명, 연락처, 건물·호수, 민원 내용, 첨부 사진(선택)</li>
          <li><strong>부동산 회원 가입</strong>: 회사명, 사업자번호, 대표자명, 연락처, 이메일, 비밀번호</li>
          <li><strong>임대인·임차인 등록</strong>(관리자가 직접 입력): 성명, 연락처, 비상연락, 계좌정보, 사업자번호, 주민등록번호(필요 시)</li>
          <li><strong>자동 수집</strong>: 접속 IP, 브라우저 정보, 쿠키, 세션 토큰</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">2. 수집·이용 목적</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>주택관리·위탁임대관리 계약 체결 및 이행</li>
          <li>민원 접수·처리 및 회신</li>
          <li>부동산 회원 자격 심사·승인</li>
          <li>임대료 청구·수납·정산·세금계산서 발행</li>
          <li>법령·약관 위반 행위 대응</li>
          <li>사이트 보안·부정 이용 방지</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">3. 보유 및 이용 기간</h2>
        <table className="w-full text-sm border-collapse my-3">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2">구분</th>
              <th className="text-left py-2">기간</th>
            </tr>
          </thead>
          <tbody className="[&_td]:py-2 [&_td]:border-b [&_td]:border-border">
            <tr><td>관리문의·민원</td><td>처리 완료 후 1년</td></tr>
            <tr><td>임대차 계약 관련 정보</td><td>계약 종료 후 5년 (전자상거래법)</td></tr>
            <tr><td>임대료·정산 기록</td><td>5년 (국세기본법)</td></tr>
            <tr><td>회원 계정·로그인 기록</td><td>탈퇴 후 즉시 또는 부정 이용 조사 종료까지</td></tr>
            <tr><td>접속 로그</td><td>3개월 (통신비밀보호법)</td></tr>
          </tbody>
        </table>

        <h2 className="text-xl font-bold mt-8 mb-3">4. 개인정보 제3자 제공</h2>
        <p>
          회사는 정보주체의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만 다음의 경우 예외로 합니다.
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>정보주체로부터 별도의 동의를 받은 경우</li>
          <li>법령에 의해 요구되는 경우 (수사기관, 세무관청 등)</li>
          <li>임대차 관련 분쟁·소송 진행 시 법적 절차에 따라 필요한 범위</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">5. 처리 위탁</h2>
        <table className="w-full text-sm border-collapse my-3">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2">수탁자</th>
              <th className="text-left py-2">위탁 업무</th>
            </tr>
          </thead>
          <tbody className="[&_td]:py-2 [&_td]:border-b [&_td]:border-border">
            <tr><td>Supabase Inc.</td><td>데이터베이스·인증·파일 저장 (서울 리전)</td></tr>
            <tr><td>Vercel Inc.</td><td>웹 호스팅 및 배포</td></tr>
            <tr><td>카카오</td><td>카카오톡 상담 채널 운영(예정)</td></tr>
          </tbody>
        </table>

        <h2 className="text-xl font-bold mt-8 mb-3">6. 정보주체의 권리</h2>
        <p>정보주체는 언제든지 다음 권리를 행사할 수 있습니다.</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>개인정보 열람·정정·삭제·처리정지 요구</li>
          <li>회원 계정 탈퇴 요청</li>
          <li>동의 철회 (단, 계약 이행에 필수적인 정보는 제외)</li>
        </ul>
        <p>요청은 아래 연락처로 접수해 주십시오.</p>

        <h2 className="text-xl font-bold mt-8 mb-3">7. 안전성 확보 조치</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>계좌번호·주민등록번호 등 민감정보는 암호화 저장</li>
          <li>모든 통신은 HTTPS(TLS) 암호화</li>
          <li>데이터베이스는 행 단위 접근 통제(Row Level Security) 적용</li>
          <li>관리자 작업은 모두 감사 로그(audit log)에 자동 기록</li>
          <li>매주 자동·수동 백업으로 데이터 손실 방지</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">8. 쿠키 사용</h2>
        <p>
          회사는 로그인 세션 유지를 위해 필수 쿠키(`tenant_session`, Supabase Auth 쿠키 등)를 사용합니다.
          브라우저 설정으로 쿠키를 거부할 수 있으나 일부 기능(임차인·임대인 본인 인증 등)이 제한됩니다.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">9. 개인정보 보호 책임자</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>대표: {COMPANY.representative}</li>
          <li>사업자등록번호: {COMPANY.legal.registrationNumber}</li>
          <li>주소: {COMPANY.branches[0].address}, {COMPANY.branches[0].detail}</li>
          <li>전화: {COMPANY.contact.phone}</li>
          <li>이메일: {COMPANY.contact.email}</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">10. 방침 변경</h2>
        <p>
          본 방침은 법령 또는 서비스 변경 사항을 반영하여 개정될 수 있으며, 변경 시 본 페이지를 통해 공지합니다.
        </p>

        <p className="mt-10 text-sm text-muted-foreground">
          공고일 및 시행일: 2026-05-08
        </p>
      </article>
    </>
  );
}
