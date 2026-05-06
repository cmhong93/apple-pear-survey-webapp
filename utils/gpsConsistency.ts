export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type CoordinateSource = Coordinate & {
  label: string;
};

export type GpsConsistencyStatus = "정상" | "경고" | "재확인 필요";

export type GpsConsistencyResult = {
  status: GpsConsistencyStatus;
  message: string;
  distances: {
    browserToParcel?: number;
    browserToMyGps?: number;
    myGpsToParcel?: number;
  };
};

const normalDistanceMeters = 50;
const warningDistanceMeters = 150;

export function toCoordinate(
  latitude: string | number | undefined,
  longitude: string | number | undefined
): Coordinate | undefined {
  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);

  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
    return undefined;
  }

  return {
    latitude: parsedLatitude,
    longitude: parsedLongitude,
  };
}

export function compareGpsCoordinates({
  browserGps,
  myGpsPhoto,
  parcelCoordinate,
}: {
  browserGps?: Coordinate;
  myGpsPhoto?: Coordinate;
  parcelCoordinate?: Coordinate;
}): GpsConsistencyResult {
  const distances = {
    browserToParcel:
      browserGps && parcelCoordinate
        ? calculateDistanceMeters(browserGps, parcelCoordinate)
        : undefined,
    browserToMyGps:
      browserGps && myGpsPhoto
        ? calculateDistanceMeters(browserGps, myGpsPhoto)
        : undefined,
    myGpsToParcel:
      myGpsPhoto && parcelCoordinate
        ? calculateDistanceMeters(myGpsPhoto, parcelCoordinate)
        : undefined,
  };

  const measuredDistances = Object.values(distances).filter(
    (distance): distance is number => distance !== undefined
  );

  if (!browserGps || !parcelCoordinate) {
    return {
      status: "재확인 필요",
      message:
        "브라우저 GPS 또는 필지주소 변환 좌표가 없어 정합성 비교를 완료할 수 없습니다.",
      distances,
    };
  }

  const maxDistance = Math.max(...measuredDistances);
  if (maxDistance <= normalDistanceMeters) {
    return {
      status: "정상",
      message: "브라우저 GPS와 필지주소 변환 좌표가 허용 범위 안에 있습니다.",
      distances,
    };
  }

  if (maxDistance <= warningDistanceMeters) {
    return {
      status: "경고",
      message:
        "좌표 간 거리가 다소 큽니다. 필지 위치와 MYGPS-660 사진 판독값을 확인하세요.",
      distances,
    };
  }

  return {
    status: "재확인 필요",
    message:
      "좌표 간 거리가 큽니다. 현장 GPS, 필지주소, MYGPS-660 사진 판독값을 재확인하세요.",
    distances,
  };
}

export function formatDistance(distance: number | undefined) {
  if (distance === undefined) return "비교 불가";
  if (distance >= 1000) return `${(distance / 1000).toFixed(2)}km`;
  return `${Math.round(distance)}m`;
}

function calculateDistanceMeters(a: Coordinate, b: Coordinate) {
  const earthRadiusMeters = 6371000;
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLon = toRadians(b.longitude - a.longitude);

  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  const angle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return earthRadiusMeters * angle;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
