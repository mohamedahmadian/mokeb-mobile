import { Redirect, useLocalSearchParams } from "expo-router";

/** مسیر قدیمی منو → صفحه جدید داخل استک رزروها */
export default function MealPlanMenuRedirect() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: "/reservations/meal-plan", params }} />;
}
