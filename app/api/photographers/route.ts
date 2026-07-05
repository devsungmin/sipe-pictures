import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

interface CreatePhotographerBody {
  adminKey?: string;
  name?: string;
  nickname?: string;
  skills?: string;
  snsUrl?: string;
  email?: string;
  profileImagePath?: string;
}

/** 관리자 키를 검증한 뒤 작가 프로필을 생성한다. */
export async function POST(req: NextRequest) {
  let body: CreatePhotographerBody;
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

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("photographers")
    .insert({
      name,
      nickname: body.nickname?.trim() || null,
      skills: body.skills?.trim() || null,
      sns_url: snsUrl || null,
      email: email || null,
      profile_image_path: body.profileImagePath || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: `작가 등록 실패: ${error?.message ?? "unknown"}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id });
}
