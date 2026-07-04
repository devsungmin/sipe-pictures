import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, PHOTOS_BUCKET } from "@/lib/supabase";

/**
 * 관리자 키를 검증한 뒤 사진사 프로필을 삭제한다.
 * 프로필 이미지 파일도 함께 삭제하며, 이 사진사가 올린 사진은
 * FK(on delete set null)에 의해 연결만 해제되고 그대로 남는다.
 */
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

  const { data: photographer, error: fetchError } = await supabase
    .from("photographers")
    .select("profile_image_path")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !photographer) {
    return NextResponse.json(
      { error: "사진사를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (photographer.profile_image_path) {
    // 프로필 이미지 삭제 실패는 치명적이지 않으므로 레코드 삭제는 계속 진행한다.
    await supabase.storage
      .from(PHOTOS_BUCKET)
      .remove([photographer.profile_image_path]);
  }

  const { error: deleteError } = await supabase
    .from("photographers")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json(
      { error: `사진사 삭제 실패: ${deleteError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
