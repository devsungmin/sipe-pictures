"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";

export interface PickedLocation {
  lat: number;
  lng: number;
}

/** 지도를 클릭해 촬영 위치를 직접 지정하는 컴포넌트 */
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
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);

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

      // 이미 지정된 위치가 있으면(수정 모드) 그 위치를 마커로 보여준다.
      const initial = valueRef.current;
      if (initial) {
        map.setView([initial.lat, initial.lng], 13);
        markerRef.current = L.marker([initial.lat, initial.lng], {
          icon,
        }).addTo(map);
      }

      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
        }
        onChangeRef.current({ lat, lng });
      });
    })();

    return () => {
      cancelled = true;
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

  return (
    <div
      ref={containerRef}
      className="relative z-0 h-64 w-full overflow-hidden rounded-lg border border-white/15"
    />
  );
}
