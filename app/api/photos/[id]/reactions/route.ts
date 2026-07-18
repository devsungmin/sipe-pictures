import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { REACTION_EMOJIS } from "@/lib/reactions";

/**
 * 사진에 이모지 반응을 남기거나 취소한다.
 * 로그인 없는 익명 반응이므로 관리자 키 없이 호출할 수 있고,
 * 대신 이모지 종류와 증감 폭(±1)을 엄격하게 제한한다.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let body: { emoji?: string; delta?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const emoji = body.emoji ?? "";
  if (!(REACTION_EMOJIS as readonly string[]).includes(emoji)) {
    return NextResponse.json(
      { error: "허용되지 않은 이모지입니다." },
      { status: 400 }
    );
  }
  const delta = body.delta;
  if (delta !== 1 && delta !== -1) {
    return NextResponse.json(
      { error: "delta는 1 또는 -1이어야 합니다." },
      { status: 400 }
    );
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  // 존재하는 사진인지 확인한다 (임의 uuid로 행이 생기는 것 방지).
  const { data: photo } = await supabase
    .from("photos")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!photo) {
    return NextResponse.json(
      { error: "사진을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const { error } = await supabase.rpc("adjust_reaction", {
    p_photo_id: id,
    p_emoji: emoji,
    p_delta: delta,
  });
  if (error) {
    return NextResponse.json(
      { error: `반응 저장 실패: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
