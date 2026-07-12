import { Ionicons } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { AppInput } from "@/src/components/ui";
import { Text } from "@/src/lib/fonts";
import { mawkibCityLabel, mawkibCountryLabel } from "@/src/lib/labels";
import { notify } from "@/src/lib/notify";
import { colors, formTypography, radius, spacing } from "@/src/lib/theme";
import type { MawkibInput } from "@/src/services/mawkibs";
import type { Mawkib, MawkibCity, MawkibCountry } from "@/src/types";

export type MawkibFormData = {
  name: string;
  address: string;
  neshanAddressUrl: string;
  latitude: string;
  longitude: string;
  phoneNumber: string;
  description: string;
  facilities: string;
  services: string;
  serviceStartDate: string;
  serviceEndDate: string;
  maleCapacity: string;
  femaleCapacity: string;
  imageUrl: string;
  distanceToShrine: string;
  distanceToBusStation: string;
  distanceToMetro: string;
  lunchReception: boolean;
  breakfastReception: boolean;
  dinnerReception: boolean;
  bathroom: boolean;
  laundry: boolean;
  parking: boolean;
  internet: boolean;
  familyFriendly: boolean;
  elevator: boolean;
  stairs: boolean;
  maxReservationDays: string;
  defaultReservationDays: string;
  country: MawkibCountry;
  mawkibCity: MawkibCity | "";
  rules: string;
  telegramChannel: string;
  whatsapp: string;
  bale: string;
  eitaa: string;
  websiteUrl: string;
  defaultCheckInTime: string;
  defaultCheckOutTime: string;
  onlineReservationEnabled: boolean;
  autoApprovePilgrimReservations: boolean;
  recordCheckInOnReservationConfirm: boolean;
  skipCapacityCheckEnabled: boolean;
  mealPlanManagementEnabled: boolean;
};

export function createMawkibFormData(mawkib?: Mawkib | null): MawkibFormData {
  return {
    name: mawkib?.name ?? "",
    address: mawkib?.address ?? "",
    neshanAddressUrl: mawkib?.neshanAddressUrl ?? "",
    latitude:
      mawkib?.latitude != null ? String(mawkib.latitude) : "",
    longitude:
      mawkib?.longitude != null ? String(mawkib.longitude) : "",
    phoneNumber: mawkib?.phoneNumber ?? "",
    description: mawkib?.description ?? "",
    facilities: mawkib?.facilities ?? "",
    services: mawkib?.services ?? "",
    serviceStartDate: mawkib?.serviceStartDate ?? "",
    serviceEndDate: mawkib?.serviceEndDate ?? "",
    maleCapacity: String(mawkib?.maleCapacity ?? 10),
    femaleCapacity: String(mawkib?.femaleCapacity ?? 10),
    imageUrl: mawkib?.imageUrl ?? "",
    distanceToShrine: mawkib?.distanceToShrine ?? "",
    distanceToBusStation: mawkib?.distanceToBusStation ?? "",
    distanceToMetro: mawkib?.distanceToMetro ?? "",
    lunchReception: mawkib?.lunchReception ?? false,
    breakfastReception: mawkib?.breakfastReception ?? false,
    dinnerReception: mawkib?.dinnerReception ?? false,
    bathroom: mawkib?.bathroom ?? false,
    laundry: mawkib?.laundry ?? false,
    parking: mawkib?.parking ?? false,
    internet: mawkib?.internet ?? false,
    familyFriendly: mawkib?.familyFriendly ?? false,
    elevator: mawkib?.elevator ?? false,
    stairs: mawkib?.stairs ?? false,
    maxReservationDays: String(mawkib?.maxReservationDays ?? 7),
    defaultReservationDays: String(mawkib?.defaultReservationDays ?? 1),
    country: mawkib?.country ?? "Iran",
    mawkibCity: mawkib?.mawkibCity ?? "",
    rules: mawkib?.rules ?? "",
    telegramChannel: mawkib?.telegramChannel ?? "",
    whatsapp: mawkib?.whatsapp ?? "",
    bale: mawkib?.bale ?? "",
    eitaa: mawkib?.eitaa ?? "",
    websiteUrl: mawkib?.websiteUrl ?? "",
    defaultCheckInTime: mawkib?.defaultCheckInTime ?? "14:00",
    defaultCheckOutTime: mawkib?.defaultCheckOutTime ?? "11:00",
    onlineReservationEnabled: mawkib?.onlineReservationEnabled ?? true,
    autoApprovePilgrimReservations:
      mawkib?.autoApprovePilgrimReservations ?? false,
    recordCheckInOnReservationConfirm:
      mawkib?.recordCheckInOnReservationConfirm ?? false,
    skipCapacityCheckEnabled: mawkib?.skipCapacityCheckEnabled ?? false,
    mealPlanManagementEnabled: mawkib?.mealPlanManagementEnabled ?? false,
  };
}

export function mawkibFormToInput(value: MawkibFormData): MawkibInput {
  const latitude = value.latitude.trim()
    ? Number(value.latitude)
    : null;
  const longitude = value.longitude.trim()
    ? Number(value.longitude)
    : null;

  return {
    name: value.name,
    address: value.address,
    neshanAddressUrl: value.neshanAddressUrl,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    phoneNumber: value.phoneNumber,
    description: value.description,
    facilities: value.facilities,
    services: value.services,
    serviceStartDate: value.serviceStartDate || null,
    serviceEndDate: value.serviceEndDate || null,
    maleCapacity: Number(value.maleCapacity) || 0,
    femaleCapacity: Number(value.femaleCapacity) || 0,
    imageUrl: value.imageUrl,
    distanceToShrine: value.distanceToShrine,
    distanceToBusStation: value.distanceToBusStation,
    distanceToMetro: value.distanceToMetro,
    lunchReception: value.lunchReception,
    breakfastReception: value.breakfastReception,
    dinnerReception: value.dinnerReception,
    bathroom: value.bathroom,
    laundry: value.laundry,
    parking: value.parking,
    internet: value.internet,
    familyFriendly: value.familyFriendly,
    elevator: value.elevator,
    stairs: value.stairs,
    maxReservationDays: Number(value.maxReservationDays) || 7,
    defaultReservationDays: Number(value.defaultReservationDays) || 1,
    country: value.country,
    mawkibCity: value.mawkibCity || null,
    rules: value.rules,
    telegramChannel: value.telegramChannel,
    whatsapp: value.whatsapp,
    bale: value.bale,
    eitaa: value.eitaa,
    websiteUrl: value.websiteUrl,
    defaultCheckInTime: value.defaultCheckInTime || "14:00",
    defaultCheckOutTime: value.defaultCheckOutTime || "11:00",
    onlineReservationEnabled: value.onlineReservationEnabled,
    autoApprovePilgrimReservations: value.autoApprovePilgrimReservations,
    recordCheckInOnReservationConfirm:
      value.recordCheckInOnReservationConfirm,
    skipCapacityCheckEnabled: value.skipCapacityCheckEnabled,
    mealPlanManagementEnabled: value.mealPlanManagementEnabled,
  };
}

type ToggleChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function ToggleChip({ label, selected, onPress }: ToggleChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Ionicons
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={16}
        color={selected ? colors.primaryDark : colors.textMuted}
      />
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

type OptionChipProps<T extends string> = {
  label: string;
  value: T;
  selected: boolean;
  onPress: (value: T) => void;
};

function OptionChip<T extends string>({
  label,
  value,
  selected,
  onPress,
}: OptionChipProps<T>) {
  return (
    <Pressable
      onPress={() => onPress(value)}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function persistPickedImage(uri: string) {
  try {
    const extension = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)?.[1] ?? "jpg";
    const destination = new File(
      Paths.document,
      `mawkib-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`,
    );
    new File(uri).copy(destination);
    return destination.uri;
  } catch {
    return uri;
  }
}

type MawkibProfileFormProps = {
  value: MawkibFormData;
  onChange: (value: MawkibFormData) => void;
};

export function MawkibProfileForm({ value, onChange }: MawkibProfileFormProps) {
  const setField = <K extends keyof MawkibFormData>(
    field: K,
    fieldValue: MawkibFormData[K],
  ) => onChange({ ...value, [field]: fieldValue });

  const toggle = (field: keyof MawkibFormData) => {
    setField(field, !value[field] as MawkibFormData[typeof field]);
  };

  const chooseImage = async (source: "library" | "camera") => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      notify(
        "دسترسی لازم است",
        source === "camera"
          ? "برای گرفتن عکس، دسترسی دوربین را فعال کنید."
          : "برای انتخاب عکس، دسترسی گالری را فعال کنید.",
      );
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    };
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled && result.assets[0]?.uri) {
      setField("imageUrl", persistPickedImage(result.assets[0].uri));
    }
  };

  return (
    <View style={styles.form}>
      <SectionTitle title="اطلاعات اصلی" />
      <AppInput
        label="نام موکب"
        value={value.name}
        onChangeText={(text) => setField("name", text)}
      />
      <AppInput
        label="آدرس"
        value={value.address}
        onChangeText={(text) => setField("address", text)}
        multiline
      />
      <AppInput
        label="لینک نشان / نقشه"
        value={value.neshanAddressUrl}
        onChangeText={(text) => setField("neshanAddressUrl", text)}
        autoCapitalize="none"
      />
      <AppInput
        label="شماره تماس"
        value={value.phoneNumber}
        onChangeText={(text) => setField("phoneNumber", text)}
        keyboardType="phone-pad"
      />
      <AppInput
        label="توضیحات"
        value={value.description}
        onChangeText={(text) => setField("description", text)}
        multiline
      />
      <AppInput
        label="امکانات"
        value={value.facilities}
        onChangeText={(text) => setField("facilities", text)}
        multiline
      />
      <AppInput
        label="خدمات"
        value={value.services}
        onChangeText={(text) => setField("services", text)}
        multiline
      />
      <AppInput
        label="قوانین موکب"
        value={value.rules}
        onChangeText={(text) => setField("rules", text)}
        multiline
      />

      <SectionTitle title="موقعیت" />
      <View style={styles.field}>
        <Text style={styles.label}>کشور</Text>
        <View style={styles.chipRow}>
          {(Object.keys(mawkibCountryLabel) as MawkibCountry[]).map(
            (country) => (
              <OptionChip
                key={country}
                label={mawkibCountryLabel[country]}
                value={country}
                selected={value.country === country}
                onPress={(next) => setField("country", next)}
              />
            ),
          )}
        </View>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>شهر موکب</Text>
        <View style={styles.chipRow}>
          {(Object.keys(mawkibCityLabel) as MawkibCity[]).map((city) => (
            <OptionChip
              key={city}
              label={mawkibCityLabel[city]}
              value={city}
              selected={value.mawkibCity === city}
              onPress={(next) =>
                setField(
                  "mawkibCity",
                  value.mawkibCity === next ? "" : next,
                )
              }
            />
          ))}
        </View>
      </View>
      <AppInput
        label="عرض جغرافیایی"
        value={value.latitude}
        onChangeText={(text) => setField("latitude", text)}
        keyboardType="decimal-pad"
      />
      <AppInput
        label="طول جغرافیایی"
        value={value.longitude}
        onChangeText={(text) => setField("longitude", text)}
        keyboardType="decimal-pad"
      />
      <AppInput
        label="فاصله تا حرم"
        value={value.distanceToShrine}
        onChangeText={(text) => setField("distanceToShrine", text)}
      />
      <AppInput
        label="فاصله تا ایستگاه اتوبوس"
        value={value.distanceToBusStation}
        onChangeText={(text) => setField("distanceToBusStation", text)}
      />
      <AppInput
        label="فاصله تا مترو"
        value={value.distanceToMetro}
        onChangeText={(text) => setField("distanceToMetro", text)}
      />

      <SectionTitle title="ظرفیت و زمان خدمت" />
      <AppInput
        label="ظرفیت مرد"
        value={value.maleCapacity}
        onChangeText={(text) => setField("maleCapacity", text)}
        keyboardType="number-pad"
      />
      <AppInput
        label="ظرفیت زن"
        value={value.femaleCapacity}
        onChangeText={(text) => setField("femaleCapacity", text)}
        keyboardType="number-pad"
      />
      <AppInput
        label="شروع خدمت (مثال: ۱۴۰۴/۰۶/۰۱)"
        value={value.serviceStartDate}
        onChangeText={(text) => setField("serviceStartDate", text)}
      />
      <AppInput
        label="پایان خدمت (مثال: ۱۴۰۴/۰۶/۲۰)"
        value={value.serviceEndDate}
        onChangeText={(text) => setField("serviceEndDate", text)}
      />
      <AppInput
        label="ساعت ورود پیش‌فرض"
        value={value.defaultCheckInTime}
        onChangeText={(text) => setField("defaultCheckInTime", text)}
        placeholder="14:00"
      />
      <AppInput
        label="ساعت خروج پیش‌فرض"
        value={value.defaultCheckOutTime}
        onChangeText={(text) => setField("defaultCheckOutTime", text)}
        placeholder="11:00"
      />
      <AppInput
        label="حداکثر روز رزرو"
        value={value.maxReservationDays}
        onChangeText={(text) => setField("maxReservationDays", text)}
        keyboardType="number-pad"
      />
      <AppInput
        label="مدت پیش‌فرض رزرو (روز)"
        value={value.defaultReservationDays}
        onChangeText={(text) => setField("defaultReservationDays", text)}
        keyboardType="number-pad"
      />

      <SectionTitle title="وعده‌های غذایی" />
      <View style={styles.chipRow}>
        <ToggleChip
          label="صبحانه"
          selected={value.breakfastReception}
          onPress={() => toggle("breakfastReception")}
        />
        <ToggleChip
          label="ناهار"
          selected={value.lunchReception}
          onPress={() => toggle("lunchReception")}
        />
        <ToggleChip
          label="شام"
          selected={value.dinnerReception}
          onPress={() => toggle("dinnerReception")}
        />
      </View>

      <SectionTitle title="امکانات رفاهی" />
      <View style={styles.chipRow}>
        <ToggleChip
          label="سرویس بهداشتی"
          selected={value.bathroom}
          onPress={() => toggle("bathroom")}
        />
        <ToggleChip
          label="لباسشویی"
          selected={value.laundry}
          onPress={() => toggle("laundry")}
        />
        <ToggleChip
          label="پارکینگ"
          selected={value.parking}
          onPress={() => toggle("parking")}
        />
        <ToggleChip
          label="اینترنت"
          selected={value.internet}
          onPress={() => toggle("internet")}
        />
        <ToggleChip
          label="مناسب خانواده"
          selected={value.familyFriendly}
          onPress={() => toggle("familyFriendly")}
        />
        <ToggleChip
          label="آسانسور"
          selected={value.elevator}
          onPress={() => toggle("elevator")}
        />
        <ToggleChip
          label="پله"
          selected={value.stairs}
          onPress={() => toggle("stairs")}
        />
      </View>

      <SectionTitle title="تنظیمات رزرو" />
      <View style={styles.chipRow}>
        <ToggleChip
          label="رزرو آنلاین"
          selected={value.onlineReservationEnabled}
          onPress={() => toggle("onlineReservationEnabled")}
        />
        <ToggleChip
          label="تأیید خودکار رزرو"
          selected={value.autoApprovePilgrimReservations}
          onPress={() => toggle("autoApprovePilgrimReservations")}
        />
        <ToggleChip
          label="ثبت ورود هنگام تأیید"
          selected={value.recordCheckInOnReservationConfirm}
          onPress={() => toggle("recordCheckInOnReservationConfirm")}
        />
        <ToggleChip
          label="رد کردن کنترل ظرفیت"
          selected={value.skipCapacityCheckEnabled}
          onPress={() => toggle("skipCapacityCheckEnabled")}
        />
        <ToggleChip
          label="مدیریت وعده غذایی"
          selected={value.mealPlanManagementEnabled}
          onPress={() => toggle("mealPlanManagementEnabled")}
        />
      </View>

      <SectionTitle title="راه‌های ارتباطی" />
      <AppInput
        label="کانال تلگرام"
        value={value.telegramChannel}
        onChangeText={(text) => setField("telegramChannel", text)}
        autoCapitalize="none"
      />
      <AppInput
        label="واتساپ"
        value={value.whatsapp}
        onChangeText={(text) => setField("whatsapp", text)}
        keyboardType="phone-pad"
      />
      <AppInput
        label="بله"
        value={value.bale}
        onChangeText={(text) => setField("bale", text)}
      />
      <AppInput
        label="ایتا"
        value={value.eitaa}
        onChangeText={(text) => setField("eitaa", text)}
      />
      <AppInput
        label="وب‌سایت"
        value={value.websiteUrl}
        onChangeText={(text) => setField("websiteUrl", text)}
        autoCapitalize="none"
      />

      <SectionTitle title="تصویر موکب" />
      <View style={styles.field}>
        {value.imageUrl ? (
          <Image source={{ uri: value.imageUrl }} style={styles.imagePreview} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={34} color={colors.textSubtle} />
            <Text style={styles.imagePlaceholderText}>
              تصویری انتخاب نشده است
            </Text>
          </View>
        )}
        <View style={styles.imageActions}>
          <Pressable
            style={styles.imageActionButton}
            onPress={() => chooseImage("library")}
          >
            <Ionicons
              name="images-outline"
              size={18}
              color={colors.primaryDark}
            />
            <Text style={styles.imageActionText}>گالری</Text>
          </Pressable>
          <Pressable
            style={styles.imageActionButton}
            onPress={() => chooseImage("camera")}
          >
            <Ionicons
              name="camera-outline"
              size={18}
              color={colors.primaryDark}
            />
            <Text style={styles.imageActionText}>دوربین</Text>
          </Pressable>
        </View>
        {value.imageUrl ? (
          <Pressable
            style={styles.removeImageButton}
            onPress={() => setField("imageUrl", "")}
          >
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Text style={styles.removeImageText}>حذف تصویر</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    width: "100%",
    direction: "rtl",
    alignItems: "stretch",
    gap: spacing.xs,
  },
  sectionTitle: {
    ...formTypography.heading,
    color: colors.primaryDark,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  field: {
    width: "100%",
    direction: "rtl",
    marginBottom: spacing.md,
  },
  label: {
    ...formTypography.label,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: spacing.xs,
  },
  chipRow: {
    direction: "rtl",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    direction: "rtl",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipText: {
    ...formTypography.caption,
    color: colors.textMuted,
  },
  chipTextSelected: {
    color: colors.primaryDark,
  },
  imagePreview: {
    width: "100%",
    height: 180,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.borderLight,
  },
  imagePlaceholder: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.borderLight,
  },
  imagePlaceholderText: {
    ...formTypography.caption,
    color: colors.textMuted,
  },
  imageActions: {
    direction: "rtl",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  imageActionButton: {
    flex: 1,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
  },
  imageActionText: {
    ...formTypography.caption,
    color: colors.primaryDark,
  },
  removeImageButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  removeImageText: {
    ...formTypography.caption,
    color: colors.danger,
  },
});
