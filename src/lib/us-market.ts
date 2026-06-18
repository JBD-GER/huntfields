export const usLaunchStates = [
  {
    code: "TX",
    slug: "texas",
    label: "Texas",
    lat: 31.9686,
    lng: -99.9018,
  },
  {
    code: "CO",
    slug: "colorado",
    label: "Colorado",
    lat: 39.5501,
    lng: -105.7821,
  },
  {
    code: "MT",
    slug: "montana",
    label: "Montana",
    lat: 46.8797,
    lng: -110.3626,
  },
  {
    code: "GA",
    slug: "georgia",
    label: "Georgia",
    lat: 32.1656,
    lng: -82.9001,
  },
] as const;

export const acreageOptions = [
  { label: "Any acreage", value: "" },
  { label: "100+ acres", value: "100" },
  { label: "500+ acres", value: "500" },
  { label: "1,000+ acres", value: "1000" },
  { label: "2,500+ acres", value: "2500" },
] as const;

export const radiusOptions = [
  { label: "Statewide", value: "statewide" },
  { label: "50 miles", value: "80467" },
  { label: "100 miles", value: "160934" },
  { label: "200 miles", value: "321869" },
] as const;

export function getUsLaunchState(code: string | null | undefined) {
  return (
    usLaunchStates.find((state) => state.code === code?.toUpperCase()) ??
    usLaunchStates[0]
  );
}
