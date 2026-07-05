import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, PHOTOS_BUCKET } from "@/lib/supabase";

interface UpdatePhotographerBody {
  adminKey?: string;
  name?: string;
  nickname?: string;
  skills?: string;
  snsUrl?: string;
  email?: string;
  profileImagePath?: string;
}

/** 관리자 키를 검증한 뒤 작가 프로필을 수정한다. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let body: UpdatePhotographerBody;
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

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json(
      { error: "이름을 입력해 주세요." },
      { status: 400 }
    );
  }
  const snsUrl = body.snsUrl?.trim();
  if (snsUrl && !/^https?:\/\//i.test(snsUrl)) {
    return NextResponse.json(
      { error: "SNS 링크는 http(s)://로 시작하는 주소여야 합니다." },
      { status: 400 }
    );
  }
  const email = body.email?.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "이메일 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from("photographers")
    .select("profile_image_path")
    .eq("id", id)
    .maybeSingle();
  if (fetchError || !existing) {
    return NextResponse.json(
      { error: "작가를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const { error: updateError } = await supabase
    .from("photographers")
    .update({
      name,
      nickname: body.nickname?.trim() || null,
      skills: body.skills?.trim() || null,
      sns_url: snsUrl || null,
      email: email || null,
      // 새 이미지가 올라온 경우에만 교체하고, 아니면 기존 이미지를 유지한다.
      ...(body.profileImagePath
        ? { profile_image_path: body.profileImagePath }
        : {}),
    })
    .eq("id", id);
  if (updateError) {
    return NextResponse.json(
      { error: `작가 수정 실패: ${updateError.message}` },
      { status: 500 }
    );
  }

  // 이름이 바뀌었을 수 있으니 이 작가의 사진 표시용 이름도 갱신한다.
  await supabase
    .from("photos")
    .update({ uploader: name })
    .eq("photographer_id", id);

  // 이미지가 교체됐으면 이전 파일은 삭제한다 (실패해도 치명적이지 않음).
  if (
    body.profileImagePath &&
    existing.profile_image_path &&
    existing.profile_image_path !== body.profileImagePath
  ) {
    await supabase.storage
      .from(PHOTOS_BUCKET)
      .remove([existing.profile_image_path]);
  }

  return NextResponse.json({ ok: true });
}

/**
 * 관리자 키를 검증한 뒤 작가 프로필을 삭제한다.
 * 프로필 이미지 파일도 함께 삭제하며, 이 작가가 올린 사진은
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
      { error: "작가를 찾을 수 없습니다." },
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
      { error: `작가 삭제 실패: ${deleteError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
