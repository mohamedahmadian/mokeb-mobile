import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "@/src/lib/fonts";
import { useRouter } from "expo-router";
import {
  AppInput,
  PrimaryButton,
  ScreenContainer,
  StickyBottomAction,
} from "@/src/components/ui";
import { useAuth } from "@/src/contexts/AuthContext";
import { notify } from "@/src/lib/notify";
import { colors, spacing, typography } from "@/src/lib/theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      await login(mobileNumber, password);
      router.replace("/(tabs)/pilgrims");
    } catch (error) {
      notify(
        "خطا",
        error instanceof Error ? error.message : "خطای ناشناخته",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.title}>موکب‌یار</Text>
            <Text style={styles.subtitle}>ورود موکب‌دار </Text>
          </View>

          <View style={styles.card}>
            <AppInput
              label="شماره موبایل"
              value={mobileNumber}
              onChangeText={setMobileNumber}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
            <AppInput
              label="رمز عبور"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <PrimaryButton
            label="ثبت‌نام موکب‌دار جدید"
            variant="secondary"
            icon="person-add-outline"
            compact
            onPress={() => router.push("/(auth)/register")}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <StickyBottomAction>
        <PrimaryButton
          label="ورود"
          icon="log-in-outline"
          loading={loading}
          compact
          onPress={handleLogin}
        />
      </StickyBottomAction>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.lg,
  },
  hero: {
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    ...typography.title,
    fontSize: 28,
    color: colors.primaryDark,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
});
