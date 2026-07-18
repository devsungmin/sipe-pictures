/** Supabase 환경 변수가 설정되지 않았을 때의 안내 박스 */
export function SetupNotice() {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm leading-6 text-amber-200">
      <p className="font-semibold">Supabase 설정이 필요합니다</p>
      <p className="mt-2 text-amber-200/80">
        README.md의 안내에 따라 <code>.env.local</code>에{" "}
        <code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
        <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>를 설정해 주세요.
      </p>
    </div>
  );
}

/** 데이터 조회 실패 등 에러 안내 박스 */
export function ErrorNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
      {children}
    </div>
  );
}

/** 데이터가 없을 때의 빈 상태 표시 */
export function EmptyState({
  emoji,
  children,
}: {
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center text-neutral-400">
      <p className="text-4xl">{emoji}</p>
      {children}
    </div>
  );
}
