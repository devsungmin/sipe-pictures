"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";

export interface PickedLocation {
  lat: number;
  lng: number;
}

interface SearchResult {
  label: string;
  lat: number;
  lng: number;
}

/**
 * Nominatim(OpenStreetMap 지오코딩, API 키 불필요)으로 지역명을 검색한다.
 * 사용 정책상 요청 빈도가 낮아야 하므로 버튼/엔터로만 검색한다 (자동완성 금지).
 */
async function searchPlaces(query: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    format: "jsonv2",
    limit: "5",
    "accept-language": "ko",
    q: query,
  });
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`
  );
  if (!res.ok) throw new Error("검색 요청에 실패했습니다.");
  const data = (await res.json()) as {
    display_name: string;
    lat: string;
    lon: string;
  }[];
  return data.map((item) => ({
    label: item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon),
  }));
}

/** 지역 검색 또는 지도 클릭으로 촬영 위치를 직접 지정하는 컴포넌트 */
export default function LocationPicker({
  value,
  onChange,
}: {
  value: PickedLocation | null;
  onChange: (location: PickedLocation) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const selectPointRef = useRef<
    ((lat: number, lng: number, zoom?: number) => void) | null
  >(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Leaflet은 window에 의존하므로 브라우저에서만 로드한다.
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current).setView([36.5, 127.8], 7);
      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5));">📍</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 26],
      });

      const placeMarker = (lat: number, lng: number) => {
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
        }
      };

      // 검색 결과 선택 시 지도 이동 + 마커 배치에 사용한다.
      selectPointRef.current = (lat, lng, zoom = 14) => {
        map.setView([lat, lng], zoom);
        placeMarker(lat, lng);
      };

      // 이미 지정된 위치가 있으면(수정 모드) 그 위치를 마커로 보여준다.
      const initial = valueRef.current;
      if (initial) {
        map.setView([initial.lat, initial.lng], 13);
        placeMarker(initial.lat, initial.lng);
      }

      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        placeMarker(lat, lng);
        onChangeRef.current({ lat, lng });
      });
    })();

    return () => {
      cancelled = true;
      selectPointRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // 외부에서 위치 지정을 해제하면 마커도 제거한다.
  useEffect(() => {
    if (value === null && markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [value]);

  const onSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed || searching) return;
    setSearching(true);
    setSearchError(null);
    setResults([]);
    try {
      const found = await searchPlaces(trimmed);
      if (found.length === 0) {
        setSearchError("검색 결과가 없어요. 다른 이름으로 검색해 보세요.");
      } else {
        setResults(found);
      }
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : String(e));
    } finally {
      setSearching(false);
    }
  };

  const onSelectResult = (result: SearchResult) => {
    selectPointRef.current?.(result.lat, result.lng);
    onChangeRef.current({ lat: result.lat, lng: result.lng });
    setResults([]);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // 상위 폼 제출을 막고 검색만 실행한다.
            if (e.key === "Enter") {
              e.preventDefault();
              void onSearch();
            }
          }}
          placeholder="지역 검색 (예: 서울숲, 을지로3가역)"
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-white/40"
        />
        <button
          type="button"
          onClick={() => void onSearch()}
          disabled={searching || query.trim().length === 0}
          className="shrink-0 rounded-lg border border-white/20 px-4 text-sm text-neutral-300 hover:bg-white/10 disabled:opacity-40"
        >
          {searching ? "검색 중..." : "검색"}
        </button>
      </div>

      {searchError && <p className="text-xs text-amber-300">{searchError}</p>}

      {results.length > 0 && (
        <ul className="overflow-hidden rounded-lg border border-white/15 bg-neutral-900 text-sm">
          {results.map((result, i) => (
            <li key={`${result.lat}-${result.lng}-${i}`}>
              <button
                type="button"
                onClick={() => onSelectResult(result)}
                className="w-full truncate px-3 py-2 text-left text-neutral-200 hover:bg-white/10"
              >
                📍 {result.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        ref={containerRef}
        className="relative z-0 h-64 w-full overflow-hidden rounded-lg border border-white/15"
      />
      <p className="text-xs text-neutral-500">
        검색으로 이동한 뒤 지도를 클릭해 정확한 위치를 조정할 수 있어요.
      </p>
    </div>
  );
}
