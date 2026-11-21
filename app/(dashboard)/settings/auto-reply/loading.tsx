import SettingsRowsSkeleton from "@/components/skeletons/SettingsRowsSkeleton";

/**
 * /settings/auto-reply — the on/off card, then three groups of two rows, as
 * AutoReplyDetails draws them: When it sends (send it to, opening hours with
 * its note), What it says (message with its preview, when you're closed, and
 * the "Preview what customers get" link under them), Good manners (teammate already replied, never sent to).
 */
export default function AutoReplyLoading() {
  return (
    <SettingsRowsSkeleton
      label="Loading auto-reply settings"
      titleWidth={140}
      status
      groups={[
        { heading: 120, rows: [200, [190, 280]] },
        { heading: 110, rows: [[220, 300], 250], more: 170 },
        { heading: 120, rows: [280, 240] },
      ]}
    />
  );
}
