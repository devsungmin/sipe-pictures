import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

interface UpdateAlbumBody {
  adminKey?: string;
  name?: string;
  description?: string;
  eventDate?: string;
}

/** 관리자 키를 검증한 뒤 앨범 정보를 수정한다. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let body: UpdateAlbumBody;
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
      { error: "앨범 이름을 입력해 주세요." },
      { status: 400 }
    );
  }
  const eventDate = body.eventDate?.trim();
  if (eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    return NextResponse.json(
      { error: "날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("albums")
    .update({
      name,
      description: body.description?.trim() || null,
      event_date: eventDate || null,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: `앨범 수정 실패: ${error.message}` },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: "앨범을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}

/**
 * 관리자 키를 검증한 뒤 앨범을 삭제한다.
 * 앨범에 속한 사진은 FK(on delete set null)에 의해 연결만 해제되고 남는다.
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
  const { data, error } = await supabase
    .from("albums")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: `앨범 삭제 실패: ${error.message}` },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: "앨범을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
