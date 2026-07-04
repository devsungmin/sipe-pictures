import type { ExifData } from "./types";

/** 브라우저에서 사진 파일의 EXIF 메타데이터를 추출한다. */
export async function extractExif(file: File): Promise<ExifData> {
  const empty: ExifData = {
    taken_at: null,
    camera_make: null,
    camera_model: null,
    lens_model: null,
    focal_length: null,
    aperture: null,
    exposure_time: null,
    iso: null,
    latitude: null,
    longitude: null,
    width: null,
    height: null,
  };

  try {
    // 브라우저에서 실제 사용할 때만 로드 (서버 번들/프리렌더 경고 방지)
    const exifr = (await import("exifr")).default;
    const tags = await exifr.parse(file, {
      pick: [
        "Make",
        "Model",
        "LensModel",
        "FocalLength",
        "FNumber",
        "ExposureTime",
        "ISO",
        "DateTimeOriginal",
        "CreateDate",
        "ExifImageWidth",
        "ExifImageHeight",
      ],
      gps: true,
    });
    if (!tags) return empty;

    const takenAt: Date | undefined = tags.DateTimeOriginal ?? tags.CreateDate;

    return {
      taken_at:
        takenAt instanceof Date && !Number.isNaN(takenAt.getTime())
          ? takenAt.toISOString()
          : null,
      camera_make: tags.Make ?? null,
      camera_model: tags.Model ?? null,
      lens_model: tags.LensModel ?? null,
      focal_length: typeof tags.FocalLength === "number" ? tags.FocalLength : null,
      aperture: typeof tags.FNumber === "number" ? tags.FNumber : null,
      exposure_time:
        typeof tags.ExposureTime === "number" ? tags.ExposureTime : null,
      iso: typeof tags.ISO === "number" ? tags.ISO : null,
      latitude: typeof tags.latitude === "number" ? tags.latitude : null,
      longitude: typeof tags.longitude === "number" ? tags.longitude : null,
      width: typeof tags.ExifImageWidth === "number" ? tags.ExifImageWidth : null,
      height:
        typeof tags.ExifImageHeight === "number" ? tags.ExifImageHeight : null,
    };
  } catch {
    // EXIF가 없거나 파싱에 실패해도 업로드는 계속 진행한다.
    return empty;
  }
}
