import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { AppHeader } from "@/src/components/AppHeader";
import {
  AppInput,
  PrimaryButton,
  ScreenContainer,
  StickyBottomAction,
} from "@/src/components/ui";
import { useAuth } from "@/src/contexts/AuthContext";
import { notify } from "@/src/lib/notify";
import { colors, spacing } from "@/src/lib/theme";

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    try {
      setLoading(true);
      await register({
        fullName,
        mobileNumber,
        password,
      });
      router.replace("/(tabs)/pilgrims");
    } catch (error) {
      notify("خطا", error instanceof Error ? error.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <AppHeader
        title="ثبت‌نام موکب‌دار"
        subtitle="حساب محلی • بدون نیاز به اینترنت"
        onBack={() => router.back()}
        showProfile={false}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <AppInput label="نام و نام خانوادگی" value={fullName} onChangeText={setFullName} />
            <AppInput
              label="شماره موبایل"
              value={mobileNumber}
              onChangeText={setMobileNumber}
              keyboardType="phone-pad"
            />
            <AppInput
              label="رمز عبور"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <StickyBottomAction>
        <PrimaryButton
          label="ثبت‌نام"
          icon="checkmark-circle-outline"
          loading={loading}
          compact
          onPress={handleRegister}
        />
      </StickyBottomAction>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
});
