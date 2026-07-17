import { useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/src/lib/fonts";
import { colors, radius, spacing, typography } from "@/src/lib/theme";

const FAB_SIZE = 58;
const TAB_BAR_HEIGHT = 68;
const DRAG_ACTIVATION_DISTANCE = 8;
const MENU_ITEM_WIDTH = 162;

type FabPosition = { x: number; y: number };

let persistedFabPosition: FabPosition | null = null;

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

function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.min(Math.max(value, min), max);
}

export function NewReservationFab({
  bottomOffset = 0,
}: NewReservationFabProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<FabPosition>({ x: 0, y: 0 });
  const progress = useRef(new Animated.Value(0)).current;

  const horizontalPadding = spacing.lg;
  const tabBarInset =
    TAB_BAR_HEIGHT +
    Math.max(insets.bottom, Platform.OS === "android" ? 8 : 0);
  const defaultBottom = tabBarInset + spacing.sm + bottomOffset;
  const defaultLeft = spacing.lg;
  const defaultTop = screenHeight - FAB_SIZE - defaultBottom;

  const minX = horizontalPadding;
  const maxX = screenWidth - FAB_SIZE - horizontalPadding;
  const minY = insets.top + spacing.sm;
  const maxY = screenHeight - FAB_SIZE - tabBarInset - bottomOffset;

  const posX = useSharedValue(persistedFabPosition?.x ?? defaultLeft);
  const posY = useSharedValue(persistedFabPosition?.y ?? defaultTop);
  const dragStartX = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const savePosition = useCallback((x: number, y: number) => {
    persistedFabPosition = { x, y };
  }, []);

  const openMenu = useCallback((x: number, y: number) => {
    setMenuPosition({ x, y });
    setOpen(true);
  }, []);

  useEffect(() => {
    Animated.spring(progress, {
      toValue: open ? 1 : 0,
      friction: 7,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [open, progress]);

  useEffect(() => {
    if (persistedFabPosition) {
      posX.value = clamp(persistedFabPosition.x, minX, maxX);
      posY.value = clamp(persistedFabPosition.y, minY, maxY);
      persistedFabPosition = { x: posX.value, y: posY.value };
      return;
    }

    posX.value = defaultLeft;
    posY.value = defaultTop;
  }, [defaultLeft, defaultTop, maxX, maxY, minX, minY, posX, posY]);

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
      label: "جستجوی رزرو",
      icon: "search",
      onPress: () =>
        run(() =>
          router.push({
            pathname: "/(tabs)/reservations",
            params: {
              reservationAction: "search",
              reservationRequestId: requestId(),
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

  const panGesture = Gesture.Pan()
    .minDistance(DRAG_ACTIVATION_DISTANCE)
    .onBegin(() => {
      isDragging.value = true;
      dragStartX.value = posX.value;
      dragStartY.value = posY.value;
    })
    .onUpdate((event) => {
      posX.value = clamp(dragStartX.value + event.translationX, minX, maxX);
      posY.value = clamp(dragStartY.value + event.translationY, minY, maxY);
    })
    .onFinalize(() => {
      isDragging.value = false;
      runOnJS(savePosition)(posX.value, posY.value);
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(openMenu)(posX.value, posY.value);
  });

  const fabGesture = Gesture.Exclusive(panGesture, tapGesture);

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: posX.value,
    top: posY.value,
    zIndex: 10,
    opacity: isDragging.value ? 0.92 : 1,
    transform: [{ scale: isDragging.value ? 1.06 : 1 }],
  }));

  const fabRotation = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  const renderMenuItem = (item: MenuItem, index: number) => {
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
          <Text style={styles.menuItemLabel}>{item.label}</Text>
          <View style={styles.menuItemIcon}>
            <Ionicons name={item.icon} size={18} color={colors.primaryDark} />
          </View>
        </Pressable>
      </Animated.View>
    );
  };

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
            style={[
              styles.menuBlock,
              {
                left: menuPosition.x,
                bottom: screenHeight - menuPosition.y - FAB_SIZE,
              },
            ]}
            pointerEvents="box-none"
          >
            <View style={styles.upperItems}>
              {items.slice(0, 2).map((item, index) => renderMenuItem(item, index))}
            </View>
            <View style={styles.bottomRow}>
              <View style={styles.fabSpacer} />
              {renderMenuItem(items[2], 2)}
            </View>
          </View>

          <View
            style={[
              styles.menuAnchor,
              { left: menuPosition.x, top: menuPosition.y },
            ]}
            pointerEvents="box-none"
          >
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
        <GestureDetector gesture={fabGesture}>
          <Reanimated.View
            style={fabAnimatedStyle}
            pointerEvents="box-none"
            accessibilityRole="button"
            accessibilityLabel="منوی سریع"
          >
            <View style={styles.fab}>
              <Ionicons name="add" size={28} color="#fff" />
            </View>
          </Reanimated.View>
        </GestureDetector>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15, 23, 42, 0.28)",
  },
  menuAnchor: {
    position: "absolute",
    width: FAB_SIZE,
    height: FAB_SIZE,
  },
  menuBlock: {
    position: "absolute",
    zIndex: 11,
  },
  upperItems: {
    marginLeft: FAB_SIZE + spacing.sm,
    width: MENU_ITEM_WIDTH,
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  fabSpacer: {
    width: FAB_SIZE,
    height: FAB_SIZE,
  },
  menuItem: {
    width: MENU_ITEM_WIDTH,
  },
  menuItemButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: MENU_ITEM_WIDTH,
    gap: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
    flexShrink: 0,
  },
  menuItemLabel: {
    ...typography.label,
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "right",
    writingDirection: "rtl",
    flexShrink: 0,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
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
