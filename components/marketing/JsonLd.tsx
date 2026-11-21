/**
 * A JSON-LD block (structured data for search engines), the way the Next.js
 * guide writes it: node_modules/next/dist/docs/01-app/02-guides/json-ld.md.
 *
 * The one raw-HTML injection in the product, so it is kept to this file and
 * made safe here: every "<" is escaped as <, so no string inside the data
 * can close the script tag. The data is built from constants in
 * lib/structured-data.ts, never from anything a visitor typed, and the escape
 * holds even if that ever changes. Guarded by tests/structured-data.test.ts.
 */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
