import type { ReservationEvent, ReservationEventType } from "@/src/types";

export const reservationEventLabel: Record<ReservationEventType, string> = {
  CHECK_IN: "ورود اولیه",
  TEMP_OUT: "خروج موقت",
  TEMP_IN: "ورود موقت",
  EARLY_CHECKOUT: "خروج نهایی",
};

const MOVEMENT_EVENT_TYPES: ReservationEventType[] = [
  "CHECK_IN",
  "TEMP_IN",
  "TEMP_OUT",
  "EARLY_CHECKOUT",
];

function isInMovementEvent(eventType: ReservationEventType): boolean {
  return eventType === "CHECK_IN" || eventType === "TEMP_IN";
}

function compareMovementEvents(
  a: Pick<ReservationEvent, "eventType" | "createdAt">,
  b: Pick<ReservationEvent, "eventType" | "createdAt">,
): number {
  const aDate = new Date(a.createdAt);
  const bDate = new Date(b.createdAt);
  const secondDiff = Math.floor(aDate.getTime() / 1000) - Math.floor(bDate.getTime() / 1000);
  if (secondDiff !== 0) return secondDiff;

  const rank = (event: Pick<ReservationEvent, "eventType">) =>
    isInMovementEvent(event.eventType) ? 0 : 1;
  const rankDiff = rank(a) - rank(b);
  if (rankDiff !== 0) return rankDiff;

  return aDate.getTime() - bDate.getTime();
}

export function groupEventsByDate(events: ReservationEvent[]) {
  const map = new Map<string, ReservationEvent[]>();

  for (const event of events.filter((item) =>
    MOVEMENT_EVENT_TYPES.includes(item.eventType),
  )) {
    const date = new Date(event.createdAt);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const bucket = map.get(dateKey) ?? [];
    bucket.push(event);
    map.set(dateKey, bucket);
  }

  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, dayEvents]) => ({
      dateKey,
      dateLabel: new Date(dayEvents[0].createdAt).toLocaleDateString("fa-IR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      events: [...dayEvents].sort(compareMovementEvents),
    }));
}

export function isOutEvent(eventType: ReservationEventType): boolean {
  return eventType === "TEMP_OUT" || eventType === "EARLY_CHECKOUT";
}

export function isInEvent(eventType: ReservationEventType): boolean {
  return eventType === "CHECK_IN" || eventType === "TEMP_IN";
}
