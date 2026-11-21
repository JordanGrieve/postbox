import SettingsRowsSkeleton from "@/components/skeletons/SettingsRowsSkeleton";

/**
 * /settings — Your business.
 *
 * One list with no heading, six rows as the page draws them: name, postal
 * address (with its "you'll need this" note, the state a new workspace is
 * in), footer name, sign-off, brand colour, appearance.
 */
export default function YourBusinessLoading() {
  return (
    <SettingsRowsSkeleton
      label="Loading your business settings"
      titleWidth={168}
      groups={[{ heading: false, rows: [150, [110, 260], 170, 200, 130, 60] }]}
    />
  );
}
