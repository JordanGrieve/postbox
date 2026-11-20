import SettingsRowsSkeleton from "@/components/skeletons/SettingsRowsSkeleton";

/**
 * /settings/auto-reply — the on/off line, then six rows. The status card is
 * drawn as one more row: its height is a row's, and a separate shape for one
 * block is a skeleton that drifts.
 */
export default function AutoReplyLoading() {
  return (
    <SettingsRowsSkeleton
      label="Loading auto-reply settings"
      titleWidth={140}
      rows={[200, 190, 260, 240, 250, 280, 300]}
    />
  );
}
