import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, PHOTOS_BUCKET } from "@/lib/supabase";

// HEIC는 브라우저 호환성 때문에 업로드 페이지에서 JPEG로 변환한 뒤 올라온다.
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * 관리자 키를 검증한 뒤, 브라우저가 Supabase Storage로 직접 업로드할 수 있는
 * 서명 URL을 발급한다. (Vercel 무료 플랜의 요청 크기 제한을 우회)
 */
export async function POST(req: NextRequest) {
  let body: { adminKey?: string; contentType?: string; kind?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const adminKey = process.env.ADMIN_UPLOAD_KEY;
  if (!adminKey) {
    return NextResponse.json(
      { error: "서버에 ADMIN_UPLOAD_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }
  if (body.adminKey !== adminKey) {
    return NextResponse.json(
      { error: "관리자 키가 올바르지 않습니다." },
      { status: 401 }
    );
  }

  const ext = ALLOWED_TYPES[body.contentType ?? ""];
  if (!ext) {
    return NextResponse.json(
      { error: "지원하지 않는 이미지 형식입니다. (jpg, png, webp)" },
      { status: 400 }
    );
  }

  // 용도별 저장 경로: 작가 프로필은 profiles/, 목록용 썸네일은 thumbs/,
  // 출사 사진 원본은 날짜 폴더 아래에 저장한다.
  const prefix =
    body.kind === "profile"
      ? "profiles"
      : body.kind === "thumb"
        ? "thumbs"
        : new Date().toISOString().slice(0, 10);
  const path = `${prefix}/${crypto.randomUUID()}.${ext}`;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json(
      { error: `업로드 URL 발급 실패: ${error?.message ?? "unknown"}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ path: data.path, token: data.token });
}
