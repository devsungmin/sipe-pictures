import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

interface CreateAlbumBody {
  adminKey?: string;
  name?: string;
  description?: string;
  eventDate?: string;
}

/** 관리자 키를 검증한 뒤 출사 앨범을 생성한다. */
export async function POST(req: NextRequest) {
  let body: CreateAlbumBody;
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

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("albums")
    .insert({
      name,
      description: body.description?.trim() || null,
      event_date: eventDate || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: `앨범 생성 실패: ${error?.message ?? "unknown"}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id });
}
