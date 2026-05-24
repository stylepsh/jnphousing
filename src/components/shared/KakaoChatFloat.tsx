"use client";

import { useState } from "react";
import {
  MessageCircle, X, Users, FileQuestion, Building2, Handshake,
  ArrowLeft, Copy, Check,
} from "lucide-react";
import { COMPANY } from "@/lib/company";
import { cn } from "@/lib/utils";

type TopicKey = "tenant" | "agency" | "new_property";

interface Topic {
  key: TopicKey;
  icon: typeof FileQuestion;
  title: string;
  desc: string;
  color: string;
}

const TOPICS: Topic[] = [
  { key: "tenant",       icon: FileQuestion, title: "임차인 민원·AS", desc: "입주민 문의·시설 AS", color: "text-red-600 bg-red-50" },
  { key: "agency",       icon: Handshake,    title: "부동산 제휴",     desc: "공실·매물 제휴 문의", color: "text-blue-600 bg-blue-50" },
  { key: "new_property", icon: Building2,    title: "신규 관리 문의",  desc: "건물주·소유주 상담",  color: "text-green-600 bg-green-50" },
];

interface Field {
  name: string;
  label: string;
  required?: boolean;
  type?: "text" | "tel" | "textarea";
  placeholder?: string;
  rows?: number;
}

interface FormSpec {
  title: string;
  fields: Field[];
  /** 양식 멘트 생성기 — 모든 필드 값을 받아 카톡 메시지 텍스트로 반환 */
  template: (v: Record<string, string>) => string;
}

const FORMS: Record<TopicKey, FormSpec> = {
  tenant: {
    title: "임차인 민원·AS 문의",
    fields: [
      { name: "name", label: "이름", required: true },
      { name: "phone", label: "연락처", required: true, type: "tel", placeholder: "010-1234-5678" },
      { name: "building", label: "건물명", required: true, placeholder: "예) 중동 팰리스카운티" },
      { name: "unit", label: "호수", required: true, placeholder: "예) 502" },
      { name: "category", label: "분류 (AS/시설/소음/기타)", placeholder: "예) 시설 고장" },
      { name: "content", label: "문의 내용", required: true, type: "textarea", rows: 3, placeholder: "상황을 자세히 적어주세요" },
    ],
    template: (v) => `[JNP주택관리 · 임차인 민원·AS]
· 이름: ${v.name}
· 연락처: ${v.phone}
· 건물·호수: ${v.building} ${v.unit}호
· 분류: ${v.category || "-"}

[내용]
${v.content}

회신 부탁드립니다. 감사합니다.`,
  },

  agency: {
    title: "부동산 제휴 문의",
    fields: [
      { name: "company", label: "공인중개사 사무소명", required: true, placeholder: "예) 홍길동공인중개사" },
      { name: "name", label: "담당자명", required: true },
      { name: "phone", label: "연락처", required: true, type: "tel", placeholder: "010-1234-5678" },
      { name: "area", label: "영업 지역", placeholder: "예) 부천 중동·상동" },
      { name: "content", label: "문의 내용", required: true, type: "textarea", rows: 3, placeholder: "공실 매물 정기 수신, 제휴 조건 등" },
    ],
    template: (v) => `[JNP주택관리 · 부동산 제휴 문의]
· 사무소: ${v.company}
· 담당자: ${v.name}
· 연락처: ${v.phone}
· 영업 지역: ${v.area || "-"}

[문의]
${v.content}

JNP 공실 매물 수신 및 제휴 진행 검토 부탁드립니다.`,
  },

  new_property: {
    title: "신규 관리·위탁 문의",
    fields: [
      { name: "name", label: "성함/회사명", required: true },
      { name: "phone", label: "연락처", required: true, type: "tel", placeholder: "010-1234-5678" },
      { name: "address", label: "건물 주소", required: true, placeholder: "시·구·동까지" },
      { name: "type", label: "건물 유형", placeholder: "오피스텔/아파트/빌라/상가" },
      { name: "units", label: "세대수/호실 수", placeholder: "예) 30" },
      { name: "issue", label: "현재 상황", type: "textarea", rows: 3, placeholder: "HUG 대위변제, 부실 건물, 분쟁, 공실 등 — 솔직히 적어주세요" },
      { name: "content", label: "원하시는 결과/문의", required: true, type: "textarea", rows: 3, placeholder: "위탁 관리, 매물 정리, 컨설팅 등" },
    ],
    template: (v) => `[JNP주택관리 · 신규 관리/위탁 문의]
· 성함/회사: ${v.name}
· 연락처: ${v.phone}
· 건물 주소: ${v.address}
· 유형: ${v.type || "-"}
· 세대수: ${v.units || "-"}

[현재 상황]
${v.issue || "(미작성)"}

[문의 내용]
${v.content}

연락 부탁드립니다. 감사합니다.`,
  },
};

interface Props {
  variant?: "default" | "tenant" | "agency";
}

type Step = "list" | "form" | "copied";

export function KakaoChatFloat({ variant = "default" }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("list");
  const [topic, setTopic] = useState<TopicKey | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [copyErr, setCopyErr] = useState<string | null>(null);

  function reset() {
    setStep("list");
    setTopic(null);
    setValues({});
    setCopyErr(null);
  }

  function selectTopic(key: TopicKey) {
    setTopic(key);
    setValues({});
    setStep("form");
    setCopyErr(null);
  }

  function setField(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function validate(): boolean {
    if (!topic) return false;
    const spec = FORMS[topic];
    for (const f of spec.fields) {
      if (f.required && !(values[f.name] ?? "").trim()) {
        alert(`${f.label}을(를) 입력해 주세요.`);
        return false;
      }
    }
    return true;
  }

  async function onCopyAndOpen(e: React.MouseEvent) {
    e.preventDefault();
    if (!topic) return;
    if (!validate()) return;

    const text = FORMS[topic].template(values);
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      // clipboard API 거부됨 — fallback
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        copied = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        copied = false;
      }
    }
    if (!copied) {
      setCopyErr("자동 복사가 안 됐어요. 아래 텍스트를 직접 복사하신 뒤 채팅 열기 버튼을 눌러주세요.");
      setStep("copied");
      return;
    }
    setStep("copied");
    // 새 탭으로 카톡 오픈채팅 열기
    window.open(COMPANY.contact.kakaoOpenChat, "_blank", "noopener,noreferrer");
  }

  const currentForm = topic ? FORMS[topic] : null;
  const filledText = topic ? FORMS[topic].template(values) : "";

  return (
    <>
      {/* 패널 */}
      {open && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[400px] max-w-md rounded-2xl bg-white shadow-2xl border border-border overflow-hidden animate-in slide-in-from-bottom-2 fade-in max-h-[85vh] flex flex-col">
          {/* 카톡 헤더 */}
          <div className="bg-[#FEE500] text-[#3C1E1E] px-5 py-4 shrink-0">
            <div className="flex items-center gap-3">
              {step !== "list" && (
                <button
                  type="button"
                  onClick={reset}
                  className="h-8 w-8 -ml-1 rounded-full hover:bg-black/10 flex items-center justify-center"
                  aria-label="뒤로"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <div className="relative">
                <div className="h-11 w-11 rounded-full bg-[#3C1E1E] flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-[#FEE500]" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-[#FEE500]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">{COMPANY.brand} 채팅</div>
                <div className="flex items-center gap-1 text-xs opacity-80">
                  <Users className="h-3 w-3" />
                  <span className="truncate">{COMPANY.legalName} · 위탁임대 전문</span>
                </div>
              </div>
            </div>
          </div>

          {/* === Step 1: 카테고리 선택 === */}
          {step === "list" && (
            <div className="flex-1 overflow-y-auto">
              <div className="px-5 pt-4 pb-2">
                <p className="text-sm text-foreground/80 leading-relaxed">
                  카테고리를 선택하면 <strong>맞춤 양식</strong>으로 정리해서<br />
                  카톡 메시지로 한 번에 보낼 수 있어요.
                </p>
              </div>
              <div className="px-3 pb-3 space-y-1">
                {TOPICS.map(({ key, icon: Icon, title, desc, color }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectTopic(key)}
                    className="w-full flex items-center gap-3 px-2 py-3 rounded-lg hover:bg-muted/60 text-left transition"
                  >
                    <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{title}</div>
                      <div className="text-xs text-muted-foreground">{desc}</div>
                    </div>
                    <span className="text-xs text-muted-foreground">›</span>
                  </button>
                ))}
              </div>
              <div className="px-5 pb-3">
                <a
                  href={COMPANY.contact.kakaoOpenChat}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-xs text-muted-foreground hover:text-foreground underline"
                >
                  양식 없이 바로 채팅 열기
                </a>
              </div>
            </div>
          )}

          {/* === Step 2: 폼 입력 === */}
          {step === "form" && currentForm && (
            <>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <h3 className="font-bold text-sm mb-3">{currentForm.title}</h3>
                <div className="space-y-2.5">
                  {currentForm.fields.map((f) => (
                    <div key={f.name}>
                      <label className="text-xs font-medium text-foreground/80 block mb-1">
                        {f.label}
                        {f.required && <span className="text-destructive ml-0.5">*</span>}
                      </label>
                      {f.type === "textarea" ? (
                        <textarea
                          rows={f.rows ?? 3}
                          value={values[f.name] ?? ""}
                          onChange={(e) => setField(f.name, e.target.value)}
                          placeholder={f.placeholder}
                          className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      ) : (
                        <input
                          type={f.type ?? "text"}
                          value={values[f.name] ?? ""}
                          onChange={(e) => setField(f.name, e.target.value)}
                          placeholder={f.placeholder}
                          className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-3 pt-2 border-t border-border bg-muted/30 shrink-0">
                <button
                  type="button"
                  onClick={onCopyAndOpen}
                  className="block w-full text-center bg-[#FEE500] text-[#3C1E1E] font-bold py-3 rounded-xl hover:brightness-95 transition"
                >
                  📋 양식 복사 + 카톡 열기
                </button>
                <p className="text-[11px] text-muted-foreground text-center mt-2">
                  복사된 양식을 카톡 채팅에 붙여넣기(Ctrl+V) 후 전송하시면 됩니다.
                </p>
              </div>
            </>
          )}

          {/* === Step 3: 복사 완료 === */}
          {step === "copied" && (
            <div className="flex-1 overflow-y-auto p-5">
              <div className="text-center mb-4">
                <div className="h-12 w-12 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-2">
                  <Check className="h-6 w-6 text-green-700" />
                </div>
                <h3 className="font-bold">
                  {copyErr ? "양식이 준비됐어요" : "양식을 복사했어요!"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {copyErr ? copyErr : "방금 연 카톡 채팅창에서 메시지 입력란에 붙여넣기(Ctrl+V) 후 전송하세요."}
                </p>
              </div>

              <div className="rounded-lg bg-muted/40 border border-border p-3">
                <pre className="text-[11px] whitespace-pre-wrap text-foreground/80 font-sans max-h-48 overflow-y-auto">
                  {filledText}
                </pre>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(filledText);
                      setCopyErr(null);
                    } catch {
                      setCopyErr("복사 권한이 거부됐어요. 위 텍스트를 길게 눌러 직접 선택해 주세요.");
                    }
                  }}
                  className="text-sm border border-border rounded-lg py-2 hover:bg-muted/60 inline-flex items-center justify-center gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" />
                  다시 복사
                </button>
                <a
                  href={COMPANY.contact.kakaoOpenChat}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm bg-[#FEE500] text-[#3C1E1E] font-semibold rounded-lg py-2 hover:brightness-95 text-center"
                >
                  카톡 다시 열기
                </a>
              </div>

              <button
                type="button"
                onClick={reset}
                className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground underline"
              >
                새 문의 작성
              </button>
            </div>
          )}

          {/* 푸터 */}
          {step === "list" && (
            <div className="px-5 py-2.5 border-t border-border bg-muted/20 shrink-0">
              <p className="text-[11px] text-muted-foreground text-center">
                평일 09:00~18:00 / 그 외 시간은 다음 영업일 회신
              </p>
            </div>
          )}
        </div>
      )}

      {/* 플로팅 버튼 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed z-50 transition-all",
          "bottom-4 right-4 sm:bottom-6 sm:right-6",
          "h-14 w-14 rounded-full shadow-xl",
          "flex items-center justify-center",
          open ? "bg-slate-700 text-white" : "bg-[#FEE500] text-[#3C1E1E] hover:scale-105",
        )}
        aria-label={open ? "채팅창 닫기" : "카카오톡 채팅 열기"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" fill="currentColor" />}
        {!open && variant !== "default" && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            ●
          </span>
        )}
      </button>
    </>
  );
}
