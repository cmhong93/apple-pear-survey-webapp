"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import {
  compareGpsCoordinates,
  formatDistance,
  type Coordinate,
} from "@/utils/gpsConsistency";

type KakaoMapPanelProps = {
  title?: string;
  fieldAddress?: string;
  parcelCoordinate?: Coordinate;
  browserCoordinate?: Coordinate;
  myGpsCoordinate?: Coordinate;
  altitude?: string;
  region?: string;
  sampleId?: string;
};

type KakaoMaps = {
  load: (callback: () => void) => void;
  LatLng: new (latitude: number, longitude: number) => unknown;
  Map: new (
    container: HTMLElement,
    options: { center: unknown; level: number }
  ) => KakaoMap;
  Marker: new (options: { position: unknown; map?: KakaoMap }) => {
    setMap: (map: KakaoMap | null) => void;
  };
  CustomOverlay: new (options: {
    position: unknown;
    content: HTMLElement;
    yAnchor?: number;
  }) => {
    setMap: (map: KakaoMap | null) => void;
  };
  services?: {
    Status: { OK: string };
    Geocoder: new () => {
      addressSearch: (
        address: string,
        callback: (
          result: Array<{ x: string; y: string }>,
          status: string
        ) => void
      ) => void;
    };
  };
};

type KakaoMap = {
  setCenter: (position: unknown) => void;
};

declare global {
  interface Window {
    kakao?: {
      maps: KakaoMaps;
    };
  }
}

export default function KakaoMapPanel({
  title = "지도/GPS 확인",
  fieldAddress = "",
  parcelCoordinate,
  browserCoordinate,
  myGpsCoordinate,
  altitude = "",
  region = "",
  sampleId = "",
}: KakaoMapPanelProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const cleanupRef = useRef<Array<() => void>>([]);
  const [scriptReady, setScriptReady] = useState(false);
  const [geocodedParcelCoordinate, setGeocodedParcelCoordinate] =
    useState<Coordinate>();
  const [geocodeStatus, setGeocodeStatus] = useState<
    "idle" | "loading" | "resolved" | "not_found" | "error"
  >("idle");

  const javascriptKey =
    process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY ??
    process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;
  const effectiveParcelCoordinate =
    parcelCoordinate ?? geocodedParcelCoordinate;
  const center = effectiveParcelCoordinate ?? browserCoordinate ?? myGpsCoordinate;
  const gpsConsistency = useMemo(
    () =>
      compareGpsCoordinates({
        browserGps: browserCoordinate,
        myGpsPhoto: myGpsCoordinate,
        parcelCoordinate: effectiveParcelCoordinate,
      }),
    [browserCoordinate, effectiveParcelCoordinate, myGpsCoordinate]
  );
  const status = normalizeGpsStatus(gpsConsistency.status);

  useEffect(() => {
    if (parcelCoordinate) {
      queueMicrotask(() => {
        setGeocodedParcelCoordinate(undefined);
        setGeocodeStatus("idle");
      });
      return;
    }
    if (!fieldAddress.trim()) {
      queueMicrotask(() => {
        setGeocodedParcelCoordinate(undefined);
        setGeocodeStatus("idle");
      });
      return;
    }

    const controller = new AbortController();
    queueMicrotask(() => setGeocodeStatus("loading"));

    fetch("/api/geo/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      signal: controller.signal,
      body: JSON.stringify({ field_address: fieldAddress }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("geocode failed");
        return (await response.json()) as {
          latitude?: number | null;
          longitude?: number | null;
        };
      })
      .then((payload) => {
        if (
          typeof payload.latitude === "number" &&
          typeof payload.longitude === "number"
        ) {
          setGeocodedParcelCoordinate({
            latitude: payload.latitude,
            longitude: payload.longitude,
          });
          setGeocodeStatus("resolved");
          return;
        }
        setGeocodedParcelCoordinate(undefined);
        setGeocodeStatus("not_found");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setGeocodedParcelCoordinate(undefined);
        setGeocodeStatus("error");
      });

    return () => controller.abort();
  }, [fieldAddress, parcelCoordinate]);

  useEffect(() => {
    if (
      !scriptReady ||
      parcelCoordinate ||
      geocodedParcelCoordinate ||
      !fieldAddress.trim() ||
      !window.kakao?.maps.services
    ) {
      return;
    }
    if (geocodeStatus !== "error" && geocodeStatus !== "not_found") return;

    queueMicrotask(() => setGeocodeStatus("loading"));
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(fieldAddress, (result, searchStatus) => {
      const primary = result[0];
      if (
        searchStatus === window.kakao?.maps.services?.Status.OK &&
        primary?.y &&
        primary?.x
      ) {
        setGeocodedParcelCoordinate({
          latitude: Number(primary.y),
          longitude: Number(primary.x),
        });
        setGeocodeStatus("resolved");
        return;
      }

      setGeocodeStatus("not_found");
    });
  }, [
    fieldAddress,
    geocodeStatus,
    geocodedParcelCoordinate,
    parcelCoordinate,
    scriptReady,
  ]);

  useEffect(() => {
    if (!scriptReady || !mapContainerRef.current || !window.kakao?.maps || !center) {
      return;
    }

    window.kakao.maps.load(() => {
      if (!mapContainerRef.current || !window.kakao?.maps) return;
      const centerLatLng = new window.kakao.maps.LatLng(
        center.latitude,
        center.longitude
      );

      if (!mapRef.current) {
        mapRef.current = new window.kakao.maps.Map(mapContainerRef.current, {
          center: centerLatLng,
          level: 5,
        });
      } else {
        mapRef.current.setCenter(centerLatLng);
      }
    });
  }, [center, scriptReady]);

  useEffect(() => {
    if (!scriptReady || !mapRef.current || !window.kakao?.maps) return;
    cleanupRef.current.forEach((cleanup) => cleanup());
    cleanupRef.current = [];

    [
      { label: "필지주소", coordinate: effectiveParcelCoordinate, color: "#2563eb" },
      { label: "브라우저 GPS", coordinate: browserCoordinate, color: "#16a34a" },
      { label: "MYGPS-660", coordinate: myGpsCoordinate, color: "#9333ea" },
    ].forEach((marker) => {
      if (!marker.coordinate || !mapRef.current || !window.kakao?.maps) return;
      cleanupRef.current.push(
        createMarkerWithLabel({
          map: mapRef.current,
          maps: window.kakao.maps,
          coordinate: marker.coordinate,
          label: marker.label,
          color: marker.color,
        })
      );
    });

    return () => {
      cleanupRef.current.forEach((cleanup) => cleanup());
      cleanupRef.current = [];
    };
  }, [
    browserCoordinate,
    effectiveParcelCoordinate,
    myGpsCoordinate,
    scriptReady,
  ]);

  return (
    <section className="rounded-2xl border border-[#dde2d5] bg-white p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold tracking-normal">{title}</h3>
          <p className="mt-1 text-xs text-[#697064]">
            {sampleId ? `표본ID ${sampleId}` : "선택 표본"} ·{" "}
            {region || "권역 미상"}
          </p>
        </div>
        <span className={getStatusClass(status)}>{status}</span>
      </div>

      {!javascriptKey ? (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm font-semibold text-orange-800">
          카카오 지도 JavaScript 키가 설정되지 않았습니다.
          NEXT_PUBLIC_KAKAO_MAP_APP_KEY 또는 NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY를
          설정하면 지도가 표시됩니다.
        </div>
      ) : center ? (
        <>
          <Script
            src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${javascriptKey}&autoload=false&libraries=services`}
            strategy="afterInteractive"
            onLoad={() => setScriptReady(true)}
            onReady={() => setScriptReady(true)}
          />
          <div
            ref={mapContainerRef}
            className="h-72 w-full rounded-xl border border-[#dde2d5] bg-[#eef1eb]"
          />
        </>
      ) : (
        <div className="rounded-xl border border-[#dde2d5] bg-[#f7f8f4] p-4 text-sm font-semibold text-[#697064]">
          {geocodeStatus === "loading"
            ? "필지주소 좌표를 변환하는 중입니다."
            : geocodeStatus === "error"
            ? "필지주소 좌표 변환에 실패했습니다. 카카오 REST API 설정을 확인하세요."
            : geocodeStatus === "not_found"
            ? "필지주소로 좌표를 찾지 못했습니다."
            : "좌표 정보 없음"}
        </div>
      )}

      <div className="mt-3 grid gap-2 text-xs text-[#4e5a45] sm:grid-cols-2">
        <Info
          label="필지주소"
          value={fieldAddress ? "관리자 권한에서 확인" : "주소 없음"}
        />
        <Info label="고도" value={altitude || "확인 필요"} />
        <Info
          label="필지주소 좌표"
          value={formatCoordinate(effectiveParcelCoordinate)}
        />
        <Info label="브라우저 GPS" value={formatCoordinate(browserCoordinate)} />
        <Info label="MYGPS-660 좌표" value={formatCoordinate(myGpsCoordinate)} />
        <Info
          label="GPS-필지 거리"
          value={formatDistance(gpsConsistency.distances.browserToParcel)}
        />
        <Info
          label="GPS-MYGPS 거리"
          value={formatDistance(gpsConsistency.distances.browserToMyGps)}
        />
        <Info
          label="MYGPS-필지 거리"
          value={formatDistance(gpsConsistency.distances.myGpsToParcel)}
        />
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f7f8f4] px-3 py-2">
      <p className="font-bold text-[#697064]">{label}</p>
      <p className="mt-0.5 break-words font-semibold text-[#1f241c]">{value}</p>
    </div>
  );
}

function normalizeGpsStatus(status: string) {
  if (status.includes("정상") || status.includes("?뺤긽")) return "정상";
  if (status.includes("경고") || status.includes("寃쎄퀬")) return "경고";
  if (status.includes("확인") || status.includes("?뺤씤")) {
    return "관리자 확인 필요";
  }
  return "관리자 확인 필요";
}

function getStatusClass(status: string) {
  const base = "rounded-full border px-3 py-1 text-xs font-bold";
  if (status === "정상") return `${base} border-green-200 bg-green-50 text-green-700`;
  if (status === "경고") return `${base} border-orange-200 bg-orange-50 text-orange-700`;
  return `${base} border-purple-200 bg-purple-50 text-purple-700`;
}

function formatCoordinate(coordinate: Coordinate | undefined) {
  if (!coordinate) return "좌표 없음";
  return `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`;
}

function createMarkerWithLabel({
  map,
  maps,
  coordinate,
  label,
  color,
}: {
  map: KakaoMap;
  maps: KakaoMaps;
  coordinate: Coordinate;
  label: string;
  color: string;
}) {
  const position = new maps.LatLng(coordinate.latitude, coordinate.longitude);
  const marker = new maps.Marker({ position, map });
  const element = document.createElement("div");
  element.textContent = label;
  element.style.cssText = [
    "border:1px solid #111827",
    `border-color:${color}`,
    "border-radius:999px",
    "background:#fff",
    "padding:5px 9px",
    "font-size:12px",
    "font-weight:700",
    "box-shadow:0 1px 6px rgba(0,0,0,.18)",
  ].join(";");
  const overlay = new maps.CustomOverlay({
    position,
    content: element,
    yAnchor: 2.7,
  });
  overlay.setMap(map);

  return () => {
    marker.setMap(null);
    overlay.setMap(null);
  };
}
