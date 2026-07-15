import { Ionicons } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { PersianDateField } from "@/src/components/PersianDateField";
import { CarPlateInput } from "@/src/components/CarPlateInput";
import { AppInput } from "@/src/components/ui";
import { LocationFields } from "@/src/components/LocationFields";
import { Text } from "@/src/lib/fonts";
import { carPlateFromUser, carPlateToProfileFields } from "@/src/lib/carPlate";
import { notify } from "@/src/lib/notify";
import { toPersianDateDisplay } from "@/src/lib/persianDate";
import { colors, radius, spacing, typography } from "@/src/lib/theme";
import type { User, UserGender, UserProfileInput } from "@/src/types";

export type UserFormData = {
  fullName: string;
  mobileNumber: string;
  nationalId: string;
  nationalIdCardImageUrl: string;
  imageUrl: string;
  gender: UserGender | "";
  birthDate: string;
  country: string;
  passportNumber: string;
  province: string;
  city: string;
  address: string;
  plateTwoDigit: string;
  plateSerial: string;
  plateProvince: string;
  description: string;
  whatsapp: string;
  telegram: string;
  bale: string;
  eitaa: string;
  email: string;
};

export function createUserFormData(user?: User | null): UserFormData {
  const plate = carPlateFromUser(user ?? {});

  return {
    fullName: user?.fullName ?? "",
    mobileNumber: user?.mobileNumber ?? "",
    nationalId: user?.nationalId ?? "",
    nationalIdCardImageUrl: user?.nationalIdCardImageUrl ?? "",
    imageUrl: user?.imageUrl ?? "",
    gender: user?.gender ?? "",
    birthDate: toPersianDateDisplay(user?.birthDate),
    country: user?.country ?? "ایران",
    passportNumber: user?.passportNumber ?? "",
    province: user?.province ?? "",
    city: user?.city ?? "",
    address: user?.address ?? "",
    plateTwoDigit: plate.plateTwoDigit,
    plateSerial: plate.plateSerial,
    plateProvince: plate.plateProvince,
    description: user?.description ?? "",
    whatsapp: user?.whatsapp ?? "",
    telegram: user?.telegram ?? "",
    bale: user?.bale ?? "",
    eitaa: user?.eitaa ?? "",
    email: user?.email ?? "",
  };
}

export function userFormToInput(value: UserFormData): UserProfileInput {
  const plateFields = carPlateToProfileFields({
    plateTwoDigit: value.plateTwoDigit,
    plateSerial: value.plateSerial,
    plateProvince: value.plateProvince,
  });

  return {
    fullName: value.fullName,
    mobileNumber: value.mobileNumber,
    nationalId: value.nationalId,
    nationalIdCardImageUrl: value.nationalIdCardImageUrl,
    imageUrl: value.imageUrl,
    gender: value.gender || null,
    birthDate: value.birthDate,
    country: value.country,
    passportNumber: value.passportNumber,
    province: value.province,
    city: value.city,
    address: value.address,
    carPlate: plateFields.carPlate ?? undefined,
    plateTwoDigit: plateFields.plateTwoDigit || undefined,
    plateSerial: plateFields.plateSerial || undefined,
    plateProvince: plateFields.plateProvince || undefined,
    description: value.description,
    whatsapp: value.whatsapp,
    telegram: value.telegram,
    bale: value.bale,
    eitaa: value.eitaa,
    email: value.email,
  };
}

type UserProfileFormProps = {
  value: UserFormData;
  onChange: (value: UserFormData) => void;
};

type ImageFieldProps = {
  label: string;
  value: string;
  imageType: "profile" | "national-card";
  onChange: (uri: string) => void;
};

function persistPickedImage(
  uri: string,
  imageType: ImageFieldProps["imageType"],
) {
  try {
    const extension = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)?.[1] ?? "jpg";
    const destination = new File(
      Paths.document,
      `${imageType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`,
    );
    new File(uri).copy(destination);
    return destination.uri;
  } catch {
    return uri;
  }
}

function ImageField({ label, value, imageType, onChange }: ImageFieldProps) {
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
      aspect: imageType === "profile" ? [1, 1] : [4, 3],
      quality: 0.85,
    };
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled && result.assets[0]?.uri) {
      onChange(persistPickedImage(result.assets[0].uri, imageType));
    }
  };

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
      </View>
      {value ? (
        <Image
          source={{ uri: value }}
          style={[
            styles.imagePreview,
            imageType === "profile" && styles.profileImagePreview,
          ]}
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons
            name={imageType === "profile" ? "person-outline" : "card-outline"}
            size={34}
            color={colors.textSubtle}
          />
          <Text style={styles.imagePlaceholderText}>
            تصویری انتخاب نشده است
          </Text>
        </View>
      )}
      <View style={styles.imageActions}>
        <Pressable
          style={({ pressed }) => [
            styles.imageActionButton,
            pressed && styles.imageActionButtonPressed,
          ]}
          onPress={() => chooseImage("library")}
        >
          <Ionicons
            name="images-outline"
            size={18}
            color={colors.primaryDark}
          />
          <Text style={styles.imageActionText}>انتخاب از گالری</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.imageActionButton,
            pressed && styles.imageActionButtonPressed,
          ]}
          onPress={() => chooseImage("camera")}
        >
          <Ionicons
            name="camera-outline"
            size={18}
            color={colors.primaryDark}
          />
          <Text style={styles.imageActionText}>گرفتن عکس</Text>
        </Pressable>
      </View>
      {value ? (
        <Pressable
          style={styles.removeImageButton}
          onPress={() => onChange("")}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={styles.removeImageText}>حذف تصویر</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function UserProfileForm({ value, onChange }: UserProfileFormProps) {
  const setField = <K extends keyof UserFormData>(
    field: K,
    fieldValue: UserFormData[K],
  ) => onChange({ ...value, [field]: fieldValue });

  return (
    <View style={styles.form}>
      <AppInput
        label="نام و نام خانوادگی"
        value={value.fullName}
        onChangeText={(text) => setField("fullName", text)}
      />
      <AppInput
        label="شماره موبایل"
        value={value.mobileNumber}
        onChangeText={(text) => setField("mobileNumber", text)}
        keyboardType="phone-pad"
      />
      <AppInput
        label="کد ملی (اختیاری)"
        value={value.nationalId}
        onChangeText={(text) => setField("nationalId", text)}
        keyboardType="number-pad"
      />

      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>جنسیت</Text>
        </View>
        <View style={styles.genderRow}>
          {(
            [
              ["Male", "مرد"],
              ["Female", "زن"],
            ] as const
          ).map(([gender, label]) => {
            const selected = value.gender === gender;
            return (
              <Pressable
                key={gender}
                style={[
                  styles.genderButton,
                  selected && styles.genderButtonSelected,
                ]}
                onPress={() => setField("gender", gender)}
              >
                <Text
                  style={[
                    styles.genderText,
                    selected && styles.genderTextSelected,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <PersianDateField
        label="تاریخ تولد"
        value={value.birthDate}
        onChange={(text) => setField("birthDate", text)}
        placeholder="انتخاب تاریخ تولد"
      />
      <AppInput
        label="کشور"
        value={value.country}
        onChangeText={(text) => setField("country", text)}
      />
      <LocationFields
        province={value.province}
        city={value.city}
        onProvinceChange={(text) => setField("province", text)}
        onCityChange={(text) => setField("city", text)}
      />
      <AppInput
        label="شماره گذرنامه"
        value={value.passportNumber}
        onChangeText={(text) => setField("passportNumber", text)}
      />
      <AppInput
        label="آدرس"
        value={value.address}
        onChangeText={(text) => setField("address", text)}
        multiline
      />
      <CarPlateInput
        value={{
          plateTwoDigit: value.plateTwoDigit,
          plateSerial: value.plateSerial,
          plateProvince: value.plateProvince,
        }}
        onChange={(plate) =>
          onChange({
            ...value,
            plateTwoDigit: plate.plateTwoDigit,
            plateSerial: plate.plateSerial,
            plateProvince: plate.plateProvince,
          })
        }
      />
      <AppInput
        label="توضیحات"
        value={value.description}
        onChangeText={(text) => setField("description", text)}
        multiline
      />
      <AppInput
        label="واتساپ"
        value={value.whatsapp}
        onChangeText={(text) => setField("whatsapp", text)}
        keyboardType="phone-pad"
      />
      <AppInput
        label="تلگرام"
        value={value.telegram}
        onChangeText={(text) => setField("telegram", text)}
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
        label="ایمیل"
        value={value.email}
        onChangeText={(text) => setField("email", text)}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <ImageField
        label="تصویر پروفایل"
        value={value.imageUrl}
        imageType="profile"
        onChange={(uri) => setField("imageUrl", uri)}
      />
      <ImageField
        label="تصویر کارت ملی"
        value={value.nationalIdCardImageUrl}
        imageType="national-card"
        onChange={(uri) => setField("nationalIdCardImageUrl", uri)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    width: "100%",
    alignItems: "stretch",
  },
  field: {
    width: "100%",
    alignItems: "stretch",
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    width: "100%",
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: "right",
    writingDirection: "rtl",
  },
  labelRow: {
    width: "100%",
    alignItems: "flex-end",
  },
  genderRow: {
    flexDirection: "row-reverse",
    gap: spacing.sm,
  },
  genderButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  genderButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  genderText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  genderTextSelected: {
    color: colors.primaryDark,
  },
  imagePreview: {
    width: "100%",
    height: 190,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.borderLight,
    resizeMode: "cover",
  },
  profileImagePreview: {
    width: 140,
    height: 140,
    alignSelf: "flex-end",
    borderRadius: radius.full,
  },
  imagePlaceholder: {
    minHeight: 110,
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
    ...typography.caption,
    color: colors.textMuted,
  },
  imageActions: {
    flexDirection: "row-reverse",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  imageActionButton: {
    flex: 1,
    minHeight: 42,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
  },
  imageActionButtonPressed: {
    opacity: 0.75,
  },
  imageActionText: {
    ...typography.caption,
    color: colors.primaryDark,
    textAlign: "center",
  },
  removeImageButton: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  removeImageText: {
    ...typography.caption,
    color: colors.danger,
  },
});
