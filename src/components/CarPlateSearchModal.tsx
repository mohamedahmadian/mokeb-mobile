import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
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
  const [plate, setPlate] = useState<CarPlateValue>(() => emptyCarPlate());
  const [searchPlate, setSearchPlate] = useState<CarPlateValue | null>(null);

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
    setPlate(emptyCarPlate());
    setSearchPlate(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
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
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
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
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modal: {
    maxHeight: "92%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: "hidden",
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
    paddingBottom: spacing.xxl,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "right",
  },
  resultsBlock: {
    gap: spacing.sm,
    marginTop: spacing.sm,
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
