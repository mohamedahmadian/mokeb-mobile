declare module "iran-cities-json" {
  export type IranProvinceRecord = {
    id: number;
    name: string;
  };

  export type IranCityRecord = {
    id: number;
    name: string;
    ostan: number;
  };

  export const ostan: IranProvinceRecord[];
  export const shahr: IranCityRecord[];
}
