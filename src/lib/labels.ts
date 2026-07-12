import type {
  MealType,
  MawkibCity,
  MawkibCountry,
  MawkibStatus,
  ReservationDeliveredItemStatus,
  ReservationPresenceState,
  ReservationStatus,
  UserGender,
} from "@/src/types";

export const reservationStatusLabel: Record<ReservationStatus, string> = {
  Pending: "در انتظار تایید",
  Confirmed: "تایید شده",
  Cancelled: "لغو شده",
  Completed: "تکمیل شده",
};

export const presenceStateLabel: Record<ReservationPresenceState, string> = {
  NOT_ARRIVED: "نرسیده",
  PRESENT: "حاضر",
  TEMPORARILY_OUT: "خروج موقت",
  LEFT: "خروج کرده",
};

export const mealTypeLabel: Record<MealType, string> = {
  Breakfast: "صبحانه",
  Lunch: "ناهار",
  Dinner: "شام",
};

export const mawkibStatusLabel: Record<MawkibStatus, string> = {
  Pending: "در انتظار",
  Approved: "تایید شده",
  Rejected: "رد شده",
};

export const mawkibCityLabel: Record<MawkibCity, string> = {
  Mashhad: "مشهد",
  Qom: "قم",
  Najaf: "نجف",
  Karbala: "کربلا",
};

export const mawkibCountryLabel: Record<MawkibCountry, string> = {
  Iran: "ایران",
  Iraq: "عراق",
};

export const genderLabel: Record<UserGender, string> = {
  Male: "مرد",
  Female: "زن",
};

export const deliveredItemStatusLabel: Record<
  ReservationDeliveredItemStatus,
  string
> = {
  DeliveredToGuest: "تحویل به زائر",
  ReceivedFromGuest: "دریافت از زائر",
};
