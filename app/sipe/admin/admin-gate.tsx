"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "sipe-admin-key";
const inputCls =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-white/40";

async function verifyKey(key: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminKey: key }),
    });
    if (res.ok) return { ok: true };
    const json = await res.json();
    return { ok: false, error: json.error ?? "인증에 실패했습니다." };
  } catch {
    return { ok: false, error: "서버에 연결할 수 없습니다." };
  }
}

/**
 * 관리자 페이지 공용 인증 게이트.
 * 어떤 관리자 URL로 직접 들어와도 키 인증을 먼저 통과해야 내용이 보인다.
 * 인증된 키는 sessionStorage에 보관해 관리자 페이지 간 이동 시 재입력이 없다.
 */
export default function AdminGate({
  children,
}: {
  children: (adminKey: string) => React.ReactNode;
}) {
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [input, setInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    // setState는 항상 프로미스 콜백(비동기)에서만 호출한다. (react-hooks/set-state-in-effect)
    const verification = saved
      ? verifyKey(saved)
      : Promise.resolve({ ok: false });
    void verification.then(({ ok }) => {
      if (ok && saved) {
        setAdminKey(saved);
      } else if (saved) {
        sessionStorage.removeItem(STORAGE_KEY);
      }
      setChecking(false);
    });
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifying) return;
    setVerifying(true);
    setError(null);
    const { ok, error: verifyError } = await verifyKey(input);
    if (ok) {
      sessionStorage.setItem(STORAGE_KEY, input);
      setAdminKey(input);
    } else {
      setError(verifyError ?? "인증에 실패했습니다.");
    }
    setVerifying(false);
  };

  if (checking) {
    return (
      <p className="py-24 text-center text-sm text-neutral-500">확인 중...</p>
    );
  }

  if (adminKey === null) {
    return (
      <div className="mx-auto max-w-sm py-16">
        <h1 className="text-2xl font-semibold">관리자 인증</h1>
        <p className="mt-2 text-sm text-neutral-400">
          사진 업로드에 사용하는 관리자 키를 입력해 주세요.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <input
            type="password"
            required
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="관리자 키"
            className={inputCls}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={verifying || input.length === 0}
            className="w-full rounded-full bg-white py-2.5 text-sm font-semibold text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {verifying ? "확인 중..." : "입장"}
          </button>
        </form>
      </div>
    );
  }

  return <>{children(adminKey)}</>;
}
