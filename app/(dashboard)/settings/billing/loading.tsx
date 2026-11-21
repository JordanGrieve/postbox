import SettingsRowsSkeleton from "@/components/skeletons/SettingsRowsSkeleton";

/**
 * /settings/billing — Your plan (plan, payments) and Leaving (close the
 * workspace). Each row carries a note in the usual states.
 */
export default function BillingLoading() {
  return (
    <SettingsRowsSkeleton
      label="Loading billing"
      titleWidth={92}
      groups={[
        { heading: 100, rows: [[120, 240], [140, 300]] },
        { heading: 80, rows: [[190, 300]] },
      ]}
    />
  );
}
