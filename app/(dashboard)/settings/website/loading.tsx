import SettingsRowsSkeleton from "@/components/skeletons/SettingsRowsSkeleton";

/**
 * /settings/website — three groups, as the page draws them. Getting messages
 * in: contact form, sign-up, forms, forwarding address. Sending: the from
 * line. Your data: the download. Every row but one carries a note.
 */
export default function WebsiteLoading() {
  return (
    <SettingsRowsSkeleton
      label="Loading website and email settings"
      titleWidth={200}
      groups={[
        {
          heading: 190,
          rows: [
            [110, 300],
            [120, 300],
            [200, 300],
            [240, 320],
          ],
        },
        { heading: 80, rows: [[230, 300]] },
        { heading: 90, rows: [[250, 280]] },
      ]}
    />
  );
}
