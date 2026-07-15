export type RoleName =
  | "Admin"
  | "Pilgrim"
  | "MawkibOwner"
  | "MawkibServant"
  | "HonoraryServant";

export type UserGender = "Male" | "Female";

export type MawkibStatus = "Pending" | "Approved" | "Rejected";

export type MawkibCountry = "Iran" | "Iraq";

export type MawkibCity = "Mashhad" | "Qom" | "Najaf" | "Karbala";

export type ReservationStatus = "Pending" | "Confirmed" | "Cancelled" | "Completed";

export type ReservationPresenceState =
  | "NOT_ARRIVED"
  | "PRESENT"
  | "TEMPORARILY_OUT"
  | "LEFT";

export type ReservationEventType =
  | "CHECK_IN"
  | "TEMP_OUT"
  | "TEMP_IN"
  | "EARLY_CHECKOUT";

export type MealType = "Breakfast" | "Lunch" | "Dinner";

export type ReservationDeliveredItemStatus =
  | "DeliveredToGuest"
  | "ReceivedFromGuest";

export interface User {
  id: number;
  fullName: string;
  mobileNumber: string;
  nationalId?: string | null;
  nationalIdCardImageUrl?: string | null;
  imageUrl?: string | null;
  gender?: UserGender | null;
  birthDate?: string | null;
  country?: string | null;
  passportNumber?: string | null;
  province?: string | null;
  city?: string | null;
  address?: string | null;
  carPlate?: string | null;
  description?: string | null;
  whatsapp?: string | null;
  telegram?: string | null;
  bale?: string | null;
  eitaa?: string | null;
  email?: string | null;
  isActive: boolean;
  createdAt: string;
  roles: RoleName[];
  /** شناسه موکب‌دار برای دسترسی به داده؛ برای موکب‌دار برابر id خودش است */
  ownerUserId: number;
}

export type UserProfileInput = Partial<
  Pick<
    User,
    | "fullName"
    | "mobileNumber"
    | "nationalId"
    | "nationalIdCardImageUrl"
    | "imageUrl"
    | "gender"
    | "birthDate"
    | "country"
    | "passportNumber"
    | "province"
    | "city"
    | "address"
    | "carPlate"
    | "description"
    | "whatsapp"
    | "telegram"
    | "bale"
    | "eitaa"
    | "email"
  >
>;

export interface Mawkib {
  id: number;
  name: string;
  /** نوع مکان: خانه، حسینیه، مسجد، ورزشگاه و غیره */
  mawkibType?: string | null;
  address: string;
  neshanAddressUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phoneNumber: string;
  description?: string | null;
  facilities?: string | null;
  services?: string | null;
  serviceStartDate?: string | null;
  serviceEndDate?: string | null;
  maleCapacity: number;
  femaleCapacity: number;
  imageUrl?: string | null;
  distanceToShrine?: string | null;
  distanceToBusStation?: string | null;
  distanceToMetro?: string | null;
  lunchReception: boolean;
  breakfastReception: boolean;
  dinnerReception: boolean;
  bathroom: boolean;
  laundry: boolean;
  parking: boolean;
  internet: boolean;
  familyFriendly: boolean;
  elevator: boolean;
  stairs: boolean;
  maxReservationDays: number;
  defaultReservationDays: number;
  country: MawkibCountry;
  mawkibCity?: MawkibCity | null;
  rules?: string | null;
  telegramChannel?: string | null;
  whatsapp?: string | null;
  bale?: string | null;
  eitaa?: string | null;
  websiteUrl?: string | null;
  defaultCheckInTime: string;
  defaultCheckOutTime: string;
  onlineReservationEnabled: boolean;
  autoApprovePilgrimReservations: boolean;
  recordCheckInOnReservationConfirm: boolean;
  skipCapacityCheckEnabled: boolean;
  mealPlanManagementEnabled: boolean;
  ownerUserId: number;
  status: MawkibStatus;
  createdAt: string;
}

export interface Reservation {
  id: number;
  mawkibId: number;
  pilgrimUserId: number;
  reservedByUserId: number;
  reservationDate: string;
  reservationEndDate: string;
  plannedCheckInTime?: string | null;
  plannedCheckOutTime?: string | null;
  actualCheckInAt?: string | null;
  actualCheckOutAt?: string | null;
  maleGuestCount: number;
  femaleGuestCount: number;
  trackingCode: string;
  pilgrimMobile: string;
  companions?: string | null;
  description?: string | null;
  travelOrigin?: string | null;
  cancellationNote?: string | null;
  status: ReservationStatus;
  presenceState: ReservationPresenceState;
  lastStatusUpdatedByUserId?: number | null;
  lastStatusUpdatedAt?: string | null;
  createdAt: string;
  mawkibName?: string;
  pilgrimName?: string;
  pilgrimNationalId?: string | null;
}

export interface MealPlan {
  id: number;
  reservationId: number;
  date: string;
  mealType: MealType;
  isRequired: boolean;
  isServed: boolean;
  servedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationEvent {
  id: number;
  reservationId: number;
  eventType: ReservationEventType;
  createdAt: string;
  createdByUserId: number;
  description?: string | null;
}

export interface ReservationDeliveredItem {
  id: number;
  reservationId: number;
  itemName: string;
  quantity: number;
  description?: string | null;
  status: ReservationDeliveredItemStatus;
  recordedByUserId: number;
  createdAt: string;
  receivedAt?: string | null;
  updatedAt: string;
  recordedByName?: string;
  trackingCode?: string;
  pilgrimName?: string;
}

export interface PilgrimListFilters {
  /** OR search across name, mobile, and national ID */
  query?: string;
  fullName?: string;
  mobileNumber?: string;
  nationalId?: string;
  province?: string;
  city?: string;
  mawkibId?: number;
}

export interface ReservationListFilters {
  query?: string;
  status?: ReservationStatus;
  presenceState?: ReservationPresenceState;
  mawkibId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface MawkibListFilters {
  query?: string;
  status?: MawkibStatus;
  mawkibCity?: MawkibCity;
}

export interface DeliveredItemListFilters {
  query?: string;
  status?: ReservationDeliveredItemStatus;
  mawkibId?: number;
}
