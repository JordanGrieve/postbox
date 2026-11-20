import SettingsRowsSkeleton from "@/components/skeletons/SettingsRowsSkeleton";

/** /settings/website — five rows: form, sign-up, forwarding, sender, download. */
export default function WebsiteLoading() {
  return (
    <SettingsRowsSkeleton
      label="Loading website and email settings"
      titleWidth={200}
      rows={[110, 120, 240, 230, 250]}
    />
  );
}
