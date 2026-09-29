"use client";

import { useState } from "react";

export function CopyBox({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="space-y-2">
      <textarea readOnly value={text} rows={12} className="w-full rounded-lg border bg-background p-2 font-mono text-xs" />
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        }}
        className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-bold text-black hover:bg-yellow-300"
      >
        {done ? "복사됨 ✓" : "카톡용 복사"}
      </button>
    </div>
  );
}
