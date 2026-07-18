/** 목록용 썸네일의 장변 크기(px) */
const THUMB_LONG_EDGE = 800;

/**
 * 브라우저에서 목록 표시용 JPEG 썸네일을 생성한다.
 * 원본은 그대로 두고, 갤러리·지도 등 목록 화면의 로딩 속도와
 * 트래픽(Supabase 무료 티어 월 5GB)을 아끼기 위한 용도다.
 */
export async function createThumbnail(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("이미지를 불러올 수 없습니다."));
      img.src = url;
    });

    const scale = Math.min(
      1,
      THUMB_LONG_EDGE / Math.max(image.naturalWidth, image.naturalHeight)
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("이 브라우저에서는 썸네일을 만들 수 없습니다.");
    ctx.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.8)
    );
    if (!blob) throw new Error("썸네일 변환에 실패했습니다.");
    return new File([blob], "thumb.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
