/** 노출 시간(초)을 1/200s 같은 표기로 변환 */
export function formatExposureTime(seconds: number | null): string | null {
  if (seconds == null || seconds <= 0) return null;
  if (seconds >= 1) return `${Number(seconds.toFixed(1))}s`;
  return `1/${Math.round(1 / seconds)}s`;
}

export function formatAperture(fNumber: number | null): string | null {
  if (fNumber == null || fNumber <= 0) return null;
  return `f/${Number(fNumber.toFixed(1))}`;
}

export function formatFocalLength(mm: number | null): string | null {
  if (mm == null || mm <= 0) return null;
  return `${Math.round(mm)}mm`;
}

export function formatIso(iso: number | null): string | null {
  if (iso == null || iso <= 0) return null;
  return `ISO ${iso}`;
}

export function formatTakenAt(takenAt: string | null): string | null {
  if (!takenAt) return null;
  const d = new Date(takenAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function cameraLabel(
  make: string | null,
  model: string | null
): string | null {
  if (!model) return make;
  if (!make) return model;
  // 모델명에 제조사가 이미 포함된 경우(예: "NIKON Z 6") 중복 제거
  return model.toLowerCase().includes(make.toLowerCase().split(" ")[0])
    ? model
    : `${make} ${model}`;
}
