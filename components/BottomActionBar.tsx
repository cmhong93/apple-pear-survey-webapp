type BottomActionBarProps = {
  footerStatus: string;
  lastSavedAt: string;
  onSaveDraft: () => void;
  onValidate: () => void;
  onSubmit: () => void;
  onPreviewPdf?: () => void;
  onGeneratePdf?: () => void;
  onOpenPdf?: () => void;
  submitDisabled?: boolean;
  pdfDisabled?: boolean;
  pdfGenerating?: boolean;
  hasPdf?: boolean;
  submitLabel?: string;
};

export default function BottomActionBar({
  footerStatus,
  lastSavedAt,
  onSaveDraft,
  onValidate,
  onSubmit,
  onPreviewPdf,
  onGeneratePdf,
  onOpenPdf,
  submitDisabled = false,
  pdfDisabled = false,
  pdfGenerating = false,
  hasPdf = false,
  submitLabel = "제출",
}: BottomActionBarProps) {
  return (
    <footer className="flex items-center justify-between border-t bg-white px-6 py-3">
      <div className="text-sm text-gray-600">
        <p>{footerStatus}</p>
        {lastSavedAt && <p>마지막 임시저장: {lastSavedAt}</p>}
      </div>
      <div className="flex gap-3">
        <button className="rounded border px-5 py-2" onClick={onSaveDraft}>
          임시저장
        </button>
        <button
          onClick={onValidate}
          className="rounded bg-amber-500 px-5 py-2 text-white"
        >
          AI 검증
        </button>
        {onPreviewPdf && (
          <button className="rounded border px-4 py-2" onClick={onPreviewPdf}>
            PDF 미리보기
          </button>
        )}
        {onGeneratePdf && (
          <button
            onClick={onGeneratePdf}
            disabled={pdfDisabled}
            className={`rounded border px-4 py-2 ${
              pdfDisabled ? "cursor-not-allowed bg-gray-100 text-gray-400" : ""
            }`}
          >
            {pdfGenerating ? "PDF 생성 중" : "조사표 PDF 생성"}
          </button>
        )}
        {onOpenPdf && (
          <button
            onClick={onOpenPdf}
            disabled={!hasPdf}
            className={`rounded border px-4 py-2 ${
              !hasPdf ? "cursor-not-allowed bg-gray-100 text-gray-400" : ""
            }`}
          >
            생성된 PDF 열기
          </button>
        )}
        <button
          onClick={onSubmit}
          disabled={submitDisabled}
          className={`rounded px-5 py-2 text-white ${
            submitDisabled
              ? "cursor-not-allowed bg-gray-400"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {submitLabel}
        </button>
      </div>
    </footer>
  );
}
