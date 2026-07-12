import { Ionicons } from "@expo/vector-icons";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { Text } from "@/src/lib/fonts";
import { PrimaryButton } from "@/src/components/ui";
import { colors, radius, spacing, typography } from "@/src/lib/theme";

export type AlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

type ConfirmState = {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
};

type ActionSheetState = {
  title: string;
  message?: string;
  buttons: AlertButton[];
};

type NotifyContextValue = {
  showConfirm: (state: ConfirmState) => void;
  showActions: (state: ActionSheetState) => void;
};

const NotifyContext = createContext<NotifyContextValue | null>(null);

function ConfirmDialog({
  state,
  onClose,
}: {
  state: ConfirmState | null;
  onClose: () => void;
}) {
  if (!state) return null;

  const iconName = state.destructive
    ? "warning-outline"
    : "help-circle-outline";
  const iconColor = state.destructive ? colors.danger : colors.primary;
  const iconBg = state.destructive ? colors.dangerLight : colors.primaryLight;

  const handleConfirm = () => {
    state.onConfirm?.();
    onClose();
  };

  const handleCancel = () => {
    state.onCancel?.();
    onClose();
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={handleCancel}>
        <Pressable
          style={styles.card}
          onPress={(event) => event.stopPropagation()}
        >
          <View
            style={[
              styles.cardAccent,
              state.destructive && styles.cardAccentDanger,
            ]}
          />

          <View style={styles.headerRow}>
            <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
              <Ionicons name={iconName} size={24} color={iconColor} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{state.title}</Text>
              {state.message ? (
                <Text style={styles.message}>{state.message}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              label={state.confirmLabel}
              variant={state.destructive ? "danger" : "primary"}
              compact
              style={styles.actionButton as ViewStyle}
              onPress={handleConfirm}
            />
            <PrimaryButton
              label={state.cancelLabel}
              variant="secondary"
              compact
              style={styles.actionButton as ViewStyle}
              onPress={handleCancel}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ActionSheet({
  state,
  onClose,
}: {
  state: ActionSheetState | null;
  onClose: () => void;
}) {
  if (!state) return null;

  const handlePress = (button: AlertButton) => {
    button.onPress?.();
    onClose();
  };

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable
          style={styles.sheetCard}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{state.title}</Text>
            {state.message ? (
              <Text style={styles.sheetMessage}>{state.message}</Text>
            ) : null}
          </View>

          <ScrollView
            style={styles.sheetActions}
            keyboardShouldPersistTaps="handled"
          >
            {state.buttons.map((button, index) => {
              const isCancel = button.style === "cancel";
              const isDestructive = button.style === "destructive";

              return (
                <Pressable
                  key={`${button.text}-${index}`}
                  onPress={() => handlePress(button)}
                  style={({ pressed }) => [
                    styles.sheetAction,
                    isCancel && styles.sheetActionCancel,
                    pressed && styles.sheetActionPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.sheetActionLabel,
                      isDestructive && styles.sheetActionDestructive,
                      isCancel && styles.sheetActionCancelLabel,
                    ]}
                  >
                    {button.text}
                  </Text>
                  <Ionicons
                    name={
                      isDestructive
                        ? "trash-outline"
                        : isCancel
                          ? "close-outline"
                          : "chevron-back-outline"
                    }
                    size={18}
                    color={
                      isDestructive
                        ? colors.danger
                        : isCancel
                          ? colors.textMuted
                          : colors.primary
                    }
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function NotifyProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [actionState, setActionState] = useState<ActionSheetState | null>(null);

  const showConfirm = useCallback((state: ConfirmState) => {
    setConfirmState(state);
  }, []);

  const showActions = useCallback((state: ActionSheetState) => {
    setActionState(state);
  }, []);

  const value = useMemo(
    () => ({ showConfirm, showActions }),
    [showConfirm, showActions],
  );

  return (
    <NotifyContext.Provider value={value}>
      {children}
      <ConfirmDialog
        state={confirmState}
        onClose={() => setConfirmState(null)}
      />
      <ActionSheet
        state={actionState}
        onClose={() => setActionState(null)}
      />
    </NotifyContext.Provider>
  );
}

export function useNotifyContext() {
  const context = useContext(NotifyContext);
  if (!context) {
    throw new Error("useNotifyContext must be used within NotifyProvider");
  }
  return context;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: "hidden",
    direction: "rtl",
    shadowColor: "#0f172a",
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  cardAccent: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    height: 4,
    backgroundColor: colors.primary,
  },
  cardAccentDanger: {
    backgroundColor: colors.danger,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.subtitle,
    textAlign: "right",
    color: colors.text,
  },
  message: {
    ...typography.body,
    textAlign: "right",
    color: colors.textMuted,
    lineHeight: 22,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 42,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  sheetCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    direction: "rtl",
    borderTopWidth: 1,
    borderColor: colors.borderLight,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  sheetHeader: {
    gap: spacing.xs,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sheetTitle: {
    ...typography.subtitle,
    textAlign: "right",
    color: colors.text,
  },
  sheetMessage: {
    ...typography.body,
    textAlign: "right",
    color: colors.textMuted,
  },
  sheetActions: {
    maxHeight: 320,
  },
  sheetAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sheetActionCancel: {
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
  },
  sheetActionPressed: {
    opacity: 0.75,
  },
  sheetActionLabel: {
    ...typography.body,
    color: colors.text,
    textAlign: "right",
    flex: 1,
  },
  sheetActionDestructive: {
    color: colors.danger,
    fontFamily: "Vazir-Medium",
  },
  sheetActionCancelLabel: {
    color: colors.textMuted,
  },
});
