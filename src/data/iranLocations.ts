import { ostan, shahr } from "iran-cities-json";

export type LocationOption = {
  id: number;
  name: string;
};

export const iranProvinces: LocationOption[] = [...ostan].sort((a, b) =>
  a.name.localeCompare(b.name, "fa"),
);

const provinceIdByName = new Map(
  iranProvinces.map((province) => [province.name, province.id]),
);

export function getIranCities(provinceName: string): LocationOption[] {
  const provinceId = provinceIdByName.get(provinceName);
  if (!provinceId) return [];

  const uniqueCities = new Map<string, LocationOption>();
  for (const city of shahr) {
    if (city.ostan === provinceId && !uniqueCities.has(city.name)) {
      uniqueCities.set(city.name, { id: city.id, name: city.name });
    }
  }

  return [...uniqueCities.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "fa"),
  );
}
