import { useEffect, useState } from "react";
import {
  Image,
  Keyboard,
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
import { toLatinDigits } from "@/src/lib/validation";
import { colors, spacing, typography } from "@/src/lib/theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleLogin = async () => {
    try {
      setLoading(true);
      await login(mobileNumber, password);
      router.replace("/(tabs)/dashboard");
    } catch (error) {
      notify(
        "خطا",
        error instanceof Error ? error.message : "خطای ناشناخته",
      );
    } finally {
      setLoading(false);
    }
  };

  const loginButton = (
    <PrimaryButton
      label="ورود"
      icon="log-in-outline"
      loading={loading}
      compact
      onPress={handleLogin}
    />
  );

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            keyboardOpen && styles.contentKeyboardOpen,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.hero, keyboardOpen && styles.heroCompact]}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={[styles.logo, keyboardOpen && styles.logoCompact]}
              resizeMode="contain"
              accessibilityLabel="لوگوی سامانه"
            />
            <Text style={[styles.title, keyboardOpen && styles.titleCompact]}>
              سامانه جامع اسکان و خدمات زائر
            </Text>
            {!keyboardOpen ? (
              <Text style={styles.subtitle}>ورود موکب‌دار</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <AppInput
              label="شماره موبایل"
              value={mobileNumber}
              onChangeText={(value) => setMobileNumber(toLatinDigits(value))}
              keyboardType="phone-pad"
              autoCapitalize="none"
              returnKeyType="next"
            />
            <AppInput
              label="رمز عبور"
              value={password}
              onChangeText={(value) => setPassword(toLatinDigits(value))}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            {keyboardOpen ? (
              <View style={styles.inlineLogin}>{loginButton}</View>
            ) : null}
          </View>

          {!keyboardOpen ? (
            <PrimaryButton
              label="ثبت‌نام موکب‌دار جدید"
              variant="secondary"
              icon="person-add-outline"
              compact
              onPress={() => router.push("/(auth)/register")}
            />
          ) : null}
        </ScrollView>

        {!keyboardOpen ? (
          <StickyBottomAction>{loginButton}</StickyBottomAction>
        ) : null}
      </KeyboardAvoidingView>
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
  contentKeyboardOpen: {
    justifyContent: "flex-start",
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  hero: {
    alignItems: "center",
    gap: spacing.sm,
  },
  heroCompact: {
    marginBottom: 0,
    gap: spacing.xs,
  },
  logo: {
    width: 220,
    height: 236,
  },
  logoCompact: {
    width: 96,
    height: 104,
  },
  title: {
    ...typography.title,
    fontSize: 18,
    lineHeight: 28,
    color: colors.primaryDark,
    textAlign: "center",
    paddingHorizontal: spacing.sm,
  },
  titleCompact: {
    fontSize: 14,
    lineHeight: 22,
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
    gap: spacing.sm,
  },
  inlineLogin: {
    marginTop: spacing.sm,
  },
});
