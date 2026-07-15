import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/src/lib/fonts";
import { colors, radius, spacing, typography } from "@/src/lib/theme";

type NewReservationFabProps = {
  /** Extra lift when a sticky bottom bar is visible */
  bottomOffset?: number;
};

type MenuItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

export function NewReservationFab({ bottomOffset = 0 }: NewReservationFabProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: open ? 1 : 0,
      friction: 7,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [open, progress]);

  const bottom =
    Math.max(insets.bottom, spacing.md) + spacing.sm + bottomOffset;

  const requestId = () => String(Date.now());

  const close = () => setOpen(false);

  const run = (action: () => void) => {
    close();
    action();
  };

  const items: MenuItem[] = [
    {
      key: "reservation",
      label: "رزرو جدید",
      icon: "calendar-outline",
      onPress: () =>
        run(() =>
          router.push({
            pathname: "/(tabs)/reservations",
            params: {
              reservationAction: "new",
              reservationRequestId: requestId(),
            },
          }),
        ),
    },
    {
      key: "search",
      label: "جستجوی زائر",
      icon: "search",
      onPress: () =>
        run(() =>
          router.push({
            pathname: "/(tabs)/pilgrims",
            params: {
              pilgrimAction: "search",
              pilgrimRequestId: requestId(),
            },
          }),
        ),
    },
    {
      key: "pilgrim",
      label: "زائر جدید",
      icon: "person-add-outline",
      onPress: () =>
        run(() =>
          router.push({
            pathname: "/(tabs)/pilgrims",
            params: {
              pilgrimAction: "new",
              pilgrimRequestId: requestId(),
            },
          }),
        ),
    },
  ];

  const fabRotation = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  return (
    <>
      <Modal
        visible={open}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={close}
      >
        <View style={styles.modalRoot} pointerEvents="box-none">
          <Pressable style={styles.backdrop} onPress={close} />
          <View
            style={[styles.menuAnchor, { bottom }]}
            pointerEvents="box-none"
          >
            <View style={styles.menuColumn} pointerEvents="box-none">
              {items.map((item, index) => {
                const fromEnd = items.length - 1 - index;
                const translateY = progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12 + fromEnd * 8, 0],
                });
                const opacity = progress.interpolate({
                  inputRange: [0, 0.35, 1],
                  outputRange: [0, 0, 1],
                });
                const scale = progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.86, 1],
                });

                return (
                  <Animated.View
                    key={item.key}
                    style={[
                      styles.menuItem,
                      {
                        opacity,
                        transform: [{ translateY }, { scale }],
                      },
                    ]}
                  >
                    <Pressable
                      onPress={item.onPress}
                      style={({ pressed }) => [
                        styles.menuItemButton,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={item.label}
                    >
                      <View style={styles.menuItemIcon}>
                        <Ionicons
                          name={item.icon}
                          size={20}
                          color={colors.primaryDark}
                        />
                      </View>
                      <Text style={styles.menuItemLabel}>{item.label}</Text>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>

            <Pressable
              onPress={close}
              style={({ pressed }) => [
                styles.fab,
                styles.fabOpen,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="بستن منو"
            >
              <Animated.View style={{ transform: [{ rotate: fabRotation }] }}>
                <Ionicons name="add" size={28} color="#fff" />
              </Animated.View>
            </Pressable>
          </View>
        </View>
      </Modal>

      {!open ? (
        <View
          style={[styles.idleAnchor, { bottom }]}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={() => setOpen(true)}
            style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="منوی سریع"
          >
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  idleAnchor: {
    position: "absolute",
    left: spacing.lg,
    zIndex: 10,
  },
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15, 23, 42, 0.28)",
  },
  menuAnchor: {
    position: "absolute",
    left: spacing.lg,
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  menuColumn: {
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  menuItem: {
    alignItems: "flex-start",
  },
  menuItemButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    elevation: 6,
    shadowColor: "#0f172a",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
  },
  menuItemLabel: {
    ...typography.label,
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
    writingDirection: "rtl",
    minWidth: 96,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  fabOpen: {
    backgroundColor: colors.primaryDark,
  },
  pressed: {
    opacity: 0.9,
  },
});
