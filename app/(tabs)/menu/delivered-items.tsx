import { Redirect, useLocalSearchParams } from "expo-router";

/** مسیر قدیمی منو → صفحه جدید داخل استک رزروها */
export default function DeliveredItemsMenuRedirect() {
  const params = useLocalSearchParams();
  return (
    <Redirect href={{ pathname: "/reservations/delivered-items", params }} />
  );
}
