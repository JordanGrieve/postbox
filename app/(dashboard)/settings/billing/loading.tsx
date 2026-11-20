import SettingsRowsSkeleton from "@/components/skeletons/SettingsRowsSkeleton";

/** /settings/billing — plan, payments, and closing the workspace. */
export default function BillingLoading() {
  return (
    <SettingsRowsSkeleton label="Loading billing" titleWidth={92} rows={[80, 140, 190]} />
  );
}
