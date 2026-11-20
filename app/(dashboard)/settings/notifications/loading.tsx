import SettingsRowsSkeleton from "@/components/skeletons/SettingsRowsSkeleton";

/** /settings/notifications — one row: who is emailed. */
export default function NotificationsLoading() {
  return (
    <SettingsRowsSkeleton
      label="Loading notification settings"
      titleWidth={150}
      rows={[220]}
    />
  );
}
