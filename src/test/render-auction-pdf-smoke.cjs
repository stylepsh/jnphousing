/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS loader is required to transpile the PDF TSX fixtures in an isolated Node process. */
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, filename) => {
    const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      fileName: filename,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
      },
    }).outputText;
    module._compile(output, filename);
  };
}

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveAlias(request, parent, ...rest) {
  const resolved = request.startsWith("@/")
    ? path.join(process.cwd(), "src", request.slice(2))
    : request;
  return originalResolve.call(this, resolved, parent, ...rest);
};

const React = require("react");
const { renderToBuffer } = require("@react-pdf/renderer");
const { AuctionVacantPdf } = require("../lib/pdf/auction-vacant-pdf.tsx");
const { AuctionInspectorPdf } = require("../lib/pdf/auction-inspector-pdf.tsx");
const { AuctionSurveyPdf } = require("../lib/pdf/auction-survey-pdf.tsx");

const surveyItems = [
  { property_no: 1, case_number: "2026타경1", court: null, category: "다세대", address: "경기도 수원시 팔달구 인계동 100-1", owner_name: "가나주택", survey_status: "revisit" },
  { property_no: 2, case_number: "2026타경2", court: null, category: "오피스텔", address: "경기도 수원시 팔달구 인계동 100-2", owner_name: "가나주택", survey_status: "vacant" },
];

async function main() {
  const docs = {
    vacant: React.createElement(AuctionVacantPdf, { data: { printedAt: "2026-09-03", items: [{
      case_number: "2026타경1", address: "경기도 수원시 팔달구 인계동 100-1", owner_name: "가나주택",
      pipeline_state: "WorkPrep", inspector_name: "답사팀 A", inspector_comment: "누수 확인",
    }] } }),
    inspector: React.createElement(AuctionInspectorPdf, { data: { inspectorName: "답사팀 A", printedAt: "2026-09-03", units: [{
      inspectionId: "inspection-1", caseNumber: "2026타경1", court: "수원지방법원", category: "다세대",
      address: "경기도 수원시 팔달구 인계동 100-1", ownerName: "가나주택", appraisalValue: 100000000,
      minimumBid: 70000000, auctionDate: "2026-09-10", managerNote: null, qrDataUrl: null,
    }] } }),
    survey: React.createElement(AuctionSurveyPdf, { data: {
      printedAt: "2026-09-03", sheetLabel: "수원 팔달구", teamName: "답사팀 A", items: surveyItems,
    } }),
  };
  const result = {};
  for (const [name, document] of Object.entries(docs)) {
    const buffer = await renderToBuffer(document);
    // 어떤 폰트가 실제로 박혔는지 — 가변 폰트를 쓰면 전부 Thin 으로 박혀 인쇄가 흐렸다.
    const fonts = [
      ...new Set(
        (buffer.toString("latin1").match(/\/BaseFont\s*\/[A-Z]{6}\+([A-Za-z0-9-]+)/g) ?? []).map(
          (m) => m.split("+")[1],
        ),
      ),
    ].sort();
    result[name] = { signature: buffer.subarray(0, 5).toString(), bytes: buffer.length, fonts };
  }
  process.stdout.write(JSON.stringify(result));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
