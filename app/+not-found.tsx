import { Link, Stack } from "expo-router";
import { StyleSheet } from "react-native";

import { Text, View } from "@/components/Themed";
import { rtlText } from "@/src/lib/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "صفحه پیدا نشد" }} />
      <View style={styles.container}>
        <Text style={styles.title}>این صفحه وجود ندارد.</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>بازگشت به صفحه اصلی</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    ...rtlText,
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    ...rtlText,
    fontSize: 14,
    color: "#2e78b7",
    textAlign: "center",
  },
});
