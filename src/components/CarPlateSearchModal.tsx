import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import {
  useBottomSheetPadding,
  useKeyboardHeight,
} from "@/src/hooks/useBottomSheetInsets";
import { CarPlateInput } from "@/src/components/CarPlateInput";
import { ListCard, PrimaryButton } from "@/src/components/ui";
import { Text } from "@/src/lib/fonts";
import {
  carPlateFromUser,
  formatCarPlateDisplay,
  emptyCarPlate,
  isCarPlateEmpty,
  type CarPlateValue,
} from "@/src/lib/carPlate";
import { notify } from "@/src/lib/notify";
import { colors, radius, spacing, typography } from "@/src/lib/theme";
import { listPilgrims } from "@/src/services/pilgrims";
import type { User } from "@/src/types";

const HEADER_HEIGHT = 57;

type CarPlateSearchModalProps = {
  visible: boolean;
  ownerId: number;
  onClose: () => void;
  onSelectPilgrim?: (pilgrim: User) => void;
};

export function CarPlateSearchModal({
  visible,
  ownerId,
  onClose,
  onSelectPilgrim,
}: CarPlateSearchModalProps) {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const bottomPadding = useBottomSheetPadding();
  const keyboardHeight = useKeyboardHeight();
  const [plate, setPlate] = useState<CarPlateValue>(() => emptyCarPlate());
  const [searchPlate, setSearchPlate] = useState<CarPlateValue | null>(null);

  const keyboardOpen = keyboardHeight > 0;
  const sheetMaxHeight = keyboardOpen
    ? windowHeight - keyboardHeight - spacing.sm
    : windowHeight * 0.92;
  const scrollMaxHeight = Math.max(160, sheetMaxHeight - HEADER_HEIGHT);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["pilgrims-by-plate", ownerId, searchPlate],
    enabled: visible && !!ownerId && !!searchPlate,
    queryFn: () =>
      listPilgrims(ownerId, {
        plateTwoDigit: searchPlate?.plateTwoDigit,
        plateSerial: searchPlate?.plateSerial,
        plateProvince: searchPlate?.plateProvince,
      }),
  });

  const handleSearch = () => {
    if (isCarPlateEmpty(plate)) {
      notify("پلاک خالی", "حداقل یک بخش از پلاک را وارد کنید.");
      return;
    }
    Keyboard.dismiss();
    setSearchPlate({ ...plate });
  };

  const handleSelectPilgrim = (pilgrim: User) => {
    handleClose();
    if (onSelectPilgrim) {
      onSelectPilgrim(pilgrim);
      return;
    }
    router.push({
      pathname: "/(tabs)/pilgrims",
      params: {
        pilgrimAction: "edit",
        pilgrimId: String(pilgrim.id),
        pilgrimRequestId: String(Date.now()),
      },
    });
  };

  const handleClose = () => {
    Keyboard.dismiss();
    setPlate(emptyCarPlate());
    setSearchPlate(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View
          style={[
            styles.modal,
            {
              maxHeight: sheetMaxHeight,
              paddingBottom: keyboardOpen ? spacing.md : bottomPadding,
              marginBottom: keyboardOpen ? keyboardHeight : 0,
            },
          ]}
        >
          <View style={styles.header}>
            <Pressable
              style={styles.closeButton}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="بستن"
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
            <Text style={styles.title}>جستجوی ماشین</Text>
          </View>

          <ScrollView
            style={{ maxHeight: scrollMaxHeight }}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            nestedScrollEnabled
          >
            <Text style={styles.hint}>
              حداقل یک بخش از پلاک را وارد کنید تا زائرین مرتبط نمایش داده
              شوند.
            </Text>
            <CarPlateInput value={plate} onChange={setPlate} />
            <PrimaryButton
              label="جستجو"
              icon="search"
              loading={isFetching}
              onPress={handleSearch}
            />

            {searchPlate ? (
              <View style={styles.resultsBlock}>
                <Text style={styles.resultsTitle}>
                  {formatCarPlateDisplay(searchPlate)
                    ? `نتایج برای ${formatCarPlateDisplay(searchPlate)}`
                    : "نتایج جستجو"}
                </Text>
                {isFetching ? (
                  <Text style={styles.emptyText}>در حال جستجو...</Text>
                ) : results.length === 0 ? (
                  <Text style={styles.emptyText}>
                    زائری با این پلاک یافت نشد.
                  </Text>
                ) : (
                  results.map((pilgrim) => (
                    <ListCard
                      key={pilgrim.id}
                      title={pilgrim.fullName}
                      subtitle={pilgrim.mobileNumber}
                      meta={
                        formatCarPlateDisplay(carPlateFromUser(pilgrim)) ||
                        pilgrim.mobileNumber
                      }
                      onPress={() => handleSelectPilgrim(pilgrim)}
                    />
                  ))
                )}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: "hidden",
    flexShrink: 1,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  title: {
    ...typography.subtitle,
    color: colors.text,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "right",
  },
  resultsBlock: {
    gap: spacing.sm,
    marginTop: spacing.sm,
    minHeight: 120,
  },
  resultsTitle: {
    ...typography.label,
    color: colors.text,
    textAlign: "right",
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
});
