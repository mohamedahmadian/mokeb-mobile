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
import { spacing } from "@/src/lib/theme";

export default function ChangePasswordScreen() {
  const { changePassword } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (newPassword !== confirmPassword) {
      notify("خطا", "رمز عبور جدید و تکرار آن یکسان نیست");
      return;
    }

    try {
      setLoading(true);
      await changePassword(currentPassword, newPassword);
      notify("موفق", "رمز عبور با موفقیت تغییر کرد");
      router.back();
    } catch (error) {
      notify("خطا", error instanceof Error ? error.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <AppHeader title="تغییر رمز عبور" onBack={() => router.back()} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.form}>
            <AppInput
              label="رمز عبور فعلی"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />
            <AppInput
              label="رمز عبور جدید"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <AppInput
              label="تکرار رمز عبور جدید"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <StickyBottomAction>
        <PrimaryButton
          label="ذخیره رمز جدید"
          icon="key-outline"
          loading={loading}
          compact
          onPress={handleSubmit}
        />
      </StickyBottomAction>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: spacing.lg,
  },
});
