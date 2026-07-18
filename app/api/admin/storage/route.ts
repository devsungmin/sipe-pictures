import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin, PHOTOS_BUCKET } from "@/lib/supabase";

interface StorageFile {
  path: string;
  size: number;
  createdAt: string | null;
}

/** 업로드 진행 중인 파일을 지우지 않도록 최근 파일은 정리 대상에서 제외한다. */
const RECENT_FILE_GRACE_MS = 60 * 60 * 1000; // 1시간

const LIST_LIMIT = 1000;

/** 한 폴더(prefix)의 파일 목록을 페이지네이션으로 전부 가져온다. */
async function listFolder(
  supabase: SupabaseClient,
  prefix: string
): Promise<{ files: StorageFile[]; folders: string[] }> {
  const files: StorageFile[] = [];
  const folders: string[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .list(prefix, { limit: LIST_LIMIT, offset });
    if (error) throw new Error(`Storage 목록 조회 실패: ${error.message}`);
    for (const item of data ?? []) {
      if (item.id === null) {
        // id가 없는 항목은 폴더다.
        folders.push(prefix ? `${prefix}/${item.name}` : item.name);
      } else {
        files.push({
          path: prefix ? `${prefix}/${item.name}` : item.name,
          size:
            typeof item.metadata?.size === "number" ? item.metadata.size : 0,
          createdAt: item.created_at ?? null,
        });
      }
    }
    if (!data || data.length < LIST_LIMIT) break;
    offset += LIST_LIMIT;
  }
  return { files, folders };
}

/** 버킷 전체 파일 목록 (폴더 구조는 날짜/thumbs/profiles 한 단계뿐이다) */
async function listAllFiles(supabase: SupabaseClient): Promise<StorageFile[]> {
  const root = await listFolder(supabase, "");
  const nested = await Promise.all(
    root.folders.map((folder) => listFolder(supabase, folder))
  );
  return [...root.files, ...nested.flatMap((result) => result.files)];
}

/** DB가 참조하고 있는 모든 파일 경로 집합 */
async function collectReferencedPaths(
  supabase: SupabaseClient
): Promise<Set<string>> {
  const [photosRes, photographersRes] = await Promise.all([
    supabase.from("photos").select("storage_path, thumb_path"),
    supabase.from("photographers").select("profile_image_path"),
  ]);
  if (photosRes.error) throw new Error(photosRes.error.message);
  if (photographersRes.error) {
    throw new Error(photographersRes.error.message);
  }

  const referenced = new Set<string>();
  for (const row of photosRes.data ?? []) {
    referenced.add(row.storage_path);
    if (row.thumb_path) referenced.add(row.thumb_path);
  }
  for (const row of photographersRes.data ?? []) {
    if (row.profile_image_path) referenced.add(row.profile_image_path);
  }
  return referenced;
}

/**
 * Storage 사용량을 조회하고, action=cleanup이면 DB가 참조하지 않는
 * 고아 파일(업로드 중단 등으로 남은 파일)을 삭제한다.
 */
export async function POST(req: NextRequest) {
  let body: { adminKey?: string; action?: string };
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

  const supabase = getSupabaseAdmin();

  try {
    const [files, referenced] = await Promise.all([
      listAllFiles(supabase),
      collectReferencedPaths(supabase),
    ]);

    const now = Date.now();
    const orphans = files.filter((file) => {
      if (referenced.has(file.path)) return false;
      // 방금 업로드되어 아직 레코드가 만들어지지 않았을 수 있는 파일은 남긴다.
      const createdAt = file.createdAt ? new Date(file.createdAt).getTime() : 0;
      return now - createdAt > RECENT_FILE_GRACE_MS;
    });

    let removedCount = 0;
    let removedBytes = 0;
    if (body.action === "cleanup" && orphans.length > 0) {
      // remove는 한 번에 너무 많은 경로를 받지 않도록 나눠서 호출한다.
      const CHUNK = 100;
      for (let i = 0; i < orphans.length; i += CHUNK) {
        const chunk = orphans.slice(i, i + CHUNK);
        const { error } = await supabase.storage
          .from(PHOTOS_BUCKET)
          .remove(chunk.map((file) => file.path));
        if (error) {
          throw new Error(`고아 파일 삭제 실패: ${error.message}`);
        }
        removedCount += chunk.length;
        removedBytes += chunk.reduce((sum, file) => sum + file.size, 0);
      }
    }

    const remaining =
      body.action === "cleanup"
        ? files.filter((file) => !orphans.includes(file))
        : files;

    return NextResponse.json({
      totalBytes: remaining.reduce((sum, file) => sum + file.size, 0),
      fileCount: remaining.length,
      orphanCount: body.action === "cleanup" ? 0 : orphans.length,
      orphanBytes:
        body.action === "cleanup"
          ? 0
          : orphans.reduce((sum, file) => sum + file.size, 0),
      removedCount,
      removedBytes,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
