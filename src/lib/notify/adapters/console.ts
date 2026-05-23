/**
 * 개발용 콘솔 어댑터. 실 발송 없이 stdout 로그.
 */

export async function consoleAdapter(input: { recipient: string; subject: string; body: string }) {
  console.log(`\n=== [NOTIFY:console] ===\nTo: ${input.recipient}\nSubject: ${input.subject}\n${input.body}\n=========================\n`);
  return { ok: true as const };
}
