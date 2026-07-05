import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, PHOTOS_BUCKET } from "@/lib/supabase";
import type { ExifData } from "@/lib/types";

interface CreatePhotoBody {
  adminKey?: string;
  storagePath?: string;
  title?: string;
  description?: string;
  photographerId?: string;
  exif?: Partial<ExifData>;
}

/** Storage 업로드 완료 후 사진 메타데이터 레코드를 생성한다. */
export async function POST(req: NextRequest) {
  let body: CreatePhotoBody;
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
  if (!body.storagePath) {
    return NextResponse.json(
      { error: "storagePath가 필요합니다." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  // 실제로 업로드된 파일인지 확인한 뒤에만 레코드를 만든다.
  const dir = body.storagePath.split("/").slice(0, -1).join("/");
  const name = body.storagePath.split("/").pop()!;
  const { data: files, error: listError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .list(dir, { search: name });
  if (listError || !files?.some((f) => f.name === name)) {
    return NextResponse.json(
      { error: "업로드된 파일을 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  // 작가가 지정됐으면 실제 존재하는지 확인하고, 표시용 이름(uploader)도 함께 저장한다.
  let photographerName: string | null = null;
  if (body.photographerId) {
    const { data: photographer } = await supabase
      .from("photographers")
      .select("name")
      .eq("id", body.photographerId)
      .maybeSingle();
    if (!photographer) {
      return NextResponse.json(
        { error: "존재하지 않는 작가입니다." },
        { status: 400 }
      );
    }
    photographerName = photographer.name;
  }

  const exif = body.exif ?? {};
  const { data, error } = await supabase
    .from("photos")
    .insert({
      title: body.title?.trim() || null,
      description: body.description?.trim() || null,
      photographer_id: body.photographerId || null,
      uploader: photographerName,
      storage_path: body.storagePath,
      taken_at: exif.taken_at ?? null,
      camera_make: exif.camera_make ?? null,
      camera_model: exif.camera_model ?? null,
      lens_model: exif.lens_model ?? null,
      focal_length: exif.focal_length ?? null,
      aperture: exif.aperture ?? null,
      exposure_time: exif.exposure_time ?? null,
      iso: exif.iso ?? null,
      latitude: exif.latitude ?? null,
      longitude: exif.longitude ?? null,
      width: exif.width ?? null,
      height: exif.height ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: `사진 정보 저장 실패: ${error?.message ?? "unknown"}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id });
}
