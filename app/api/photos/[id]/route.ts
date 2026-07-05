import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, PHOTOS_BUCKET } from "@/lib/supabase";

interface UpdatePhotoBody {
  adminKey?: string;
  title?: string;
  description?: string;
  photographerId?: string | null;
}

/** 관리자 키를 검증한 뒤 사진 정보(제목, 설명, 작가)를 수정한다. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let body: UpdatePhotoBody;
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

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  // 작가가 지정됐으면 존재 여부를 확인하고 표시용 이름도 함께 갱신한다.
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

  const { data, error } = await supabase
    .from("photos")
    .update({
      title: body.title?.trim() || null,
      description: body.description?.trim() || null,
      photographer_id: body.photographerId || null,
      uploader: photographerName,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: `사진 수정 실패: ${error.message}` },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: "사진을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}

/** 관리자 키를 검증한 뒤 사진 파일과 메타데이터 레코드를 함께 삭제한다. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let body: { adminKey?: string };
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

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: photo, error: fetchError } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !photo) {
    return NextResponse.json(
      { error: "사진을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const { error: storageError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .remove([photo.storage_path]);
  if (storageError) {
    return NextResponse.json(
      { error: `파일 삭제 실패: ${storageError.message}` },
      { status: 500 }
    );
  }

  const { error: deleteError } = await supabase
    .from("photos")
    .delete()
    .eq("id", id);
  if (deleteError) {
    return NextResponse.json(
      { error: `사진 정보 삭제 실패: ${deleteError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
