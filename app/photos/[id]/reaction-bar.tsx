"use client";

import { useEffect, useState } from "react";
import { REACTION_EMOJIS, type ReactionEmoji } from "@/lib/reactions";

/** 이 브라우저에서 누른 반응을 기억하는 localStorage 키 */
const storageKey = (photoId: string) => `sipe-reactions:${photoId}`;

function loadMyReactions(photoId: string): ReactionEmoji[] {
  try {
    const raw = localStorage.getItem(storageKey(photoId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return REACTION_EMOJIS.filter((emoji) => parsed.includes(emoji));
  } catch {
    return [];
  }
}

/** 사진에 익명 이모지 반응을 남기는 바. 중복 방지는 브라우저(localStorage) 수준. */
export default function ReactionBar({
  photoId,
  initialCounts,
}: {
  photoId: string;
  initialCounts: Record<string, number>;
}) {
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts);
  const [mine, setMine] = useState<ReactionEmoji[]>([]);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    // localStorage는 브라우저에서만 접근 가능하므로 마운트 후 읽는다.
    // (동기 setState 경고를 피하기 위해 다음 틱에 반영)
    const id = window.setTimeout(() => {
      const saved = loadMyReactions(photoId);
      if (saved.length > 0) setMine(saved);
    }, 0);
    return () => window.clearTimeout(id);
  }, [photoId]);

  const toggle = async (emoji: ReactionEmoji) => {
    if (pending) return;
    const pressed = mine.includes(emoji);
    const delta = pressed ? -1 : 1;

    // 낙관적 업데이트 — 실패하면 되돌린다.
    const nextMine = pressed
      ? mine.filter((item) => item !== emoji)
      : [...mine, emoji];
    setMine(nextMine);
    setCounts((prev) => ({
      ...prev,
      [emoji]: Math.max(0, (prev[emoji] ?? 0) + delta),
    }));
    setPending(emoji);
    try {
      const res = await fetch(`/api/photos/${photoId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji, delta }),
      });
      if (!res.ok) throw new Error();
      localStorage.setItem(storageKey(photoId), JSON.stringify(nextMine));
    } catch {
      // 실패 시 원래 상태로 복구
      setMine(mine);
      setCounts((prev) => ({
        ...prev,
        [emoji]: Math.max(0, (prev[emoji] ?? 0) - delta),
      }));
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {REACTION_EMOJIS.map((emoji) => {
        const count = counts[emoji] ?? 0;
        const pressed = mine.includes(emoji);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => void toggle(emoji)}
            disabled={pending !== null}
            aria-pressed={pressed}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition disabled:opacity-60 ${
              pressed
                ? "border-white/60 bg-white/15 text-white"
                : "border-white/15 bg-white/5 text-neutral-300 hover:border-white/30 hover:bg-white/10"
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="text-xs">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
