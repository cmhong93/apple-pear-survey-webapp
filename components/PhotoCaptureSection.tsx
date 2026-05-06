import type { PhotoSpec, PhotoState } from "@/types/survey";
import { photoAiCriteria } from "@/data/handoffArtifacts";

type PhotoCaptureSectionProps = {
  photos: PhotoSpec[];
  photoStates: Record<string, PhotoState>;
  onPhotoChange: (photoId: string, file: File | null) => void;
};

export default function PhotoCaptureSection({
  photos,
  photoStates,
  onPhotoChange,
}: PhotoCaptureSectionProps) {
  return (
    <section className="rounded-lg border bg-white p-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-950">사진 촬영</h2>
        <p className="mt-1 text-sm text-gray-600">
          모든 조사 단계에서 공통으로 관리하는 필수 촬영 섹션입니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {photos.map((photo) => {
          const state = photoStates[photo.id] ?? { status: "미촬영" };
          const completed = state.status === "촬영 완료";

          return (
            <div key={photo.id} className="rounded border bg-gray-50 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{photo.label}</p>
                  {photo.note && (
                    <p className="mt-1 whitespace-pre-line text-xs text-gray-600">
                      {photo.note}
                    </p>
                  )}
                  {photoAiCriteria[photo.id] && (
                    <p className="mt-1 text-xs text-gray-600">
                      {photoAiCriteria[photo.id].mustShow.join(" · ")}
                    </p>
                  )}
                  {photo.aiExcluded && (
                    <p className="mt-1 text-xs font-medium text-amber-700">
                      민감정보 포함 가능 항목으로 AI 판독 없이 관리자 확인 대상으로 저장합니다.
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-xs ${
                    completed
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {state.status}
                </span>
              </div>

              <input
                id={`photo-input-${photo.id}`}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) =>
                  onPhotoChange(photo.id, event.target.files?.[0] ?? null)
                }
              />

              <label
                htmlFor={`photo-input-${photo.id}`}
                className={`flex cursor-pointer items-center justify-center rounded border px-3 py-2 text-sm font-semibold ${
                  completed
                    ? "bg-green-600 text-white"
                    : "bg-blue-600 text-white"
                }`}
              >
                {(photo.shortLabel ?? photo.label)} 촬영 {completed ? "완료" : ""}
              </label>

              {state.fileName && (
                <div className="mt-3 space-y-2 text-xs text-gray-700">
                  <p>파일명: {state.fileName}</p>
                  {state.previewUrl && (
                    <img
                      src={state.previewUrl}
                      alt={`${photo.label} 미리보기`}
                      className="h-28 w-full rounded object-cover"
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
