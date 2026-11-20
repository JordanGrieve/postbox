import SettingsRowsSkeleton from "@/components/skeletons/SettingsRowsSkeleton";

/**
 * /settings — Your business.
 *
 * Six rows, as the page draws: name, postal address, footer name, sign-off,
 * brand colour, appearance. The in-page tab strip belongs to the settings
 * layout and never suspends, so it is not redrawn here.
 */
export default function YourBusinessLoading() {
  return (
    <SettingsRowsSkeleton
      label="Loading your business settings"
      titleWidth={168}
      rows={[150, 190, 170, 200, 130, 60]}
    />
  );
}
