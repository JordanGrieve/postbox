import "../../app/skeleton.css";

/**
 * The placeholder for a full-screen centred page: /sign-in, /sign-up and
 * /no-access.
 *
 * All three are a lockup in the middle of an empty viewport, and all three
 * declare that layout with inline styles rather than classes — so there is no
 * real class to borrow, and the geometry is repeated. It is repeated ONCE,
 * here, rather than three times.
 *
 * ── TWO SHAPES ──
 * Sign-in and sign-up: the lockup above one block, on --app-bg at 400px. The
 * block stands in for Clerk's form. These pages do not wait on anything
 * server-side, so the skeleton only shows during a client-side navigation to
 * them, while the route's payload is in flight; Clerk then mounts and draws
 * its own loading state inside the form. Drawing a fake form here would put
 * two different loading states in sequence.
 *
 * `message`: /no-access, which has no card at all — the lockup, a heading, a
 * paragraph and a Sign out button, centred on --surface-2 at 420px. It drew
 * the sign-in block until 21 Nov 2026, so a 200px card turned into a
 * paragraph when the page arrived.
 */
export default function CentredSkeleton({
  label,
  height = 260,
  message = false,
}: {
  label: string;
  /** How tall the block is. Sign-in's form is taller than a message. */
  height?: number;
  /** /no-access: heading, paragraph and button instead of a block. */
  message?: boolean;
}) {
  return (
    <div
      className="pbk"
      aria-busy="true"
      aria-label={label}
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: message ? "var(--surface-2)" : "var(--app-bg)",
        padding: 24,
      }}
    >
      <div aria-hidden style={{ width: "100%", maxWidth: message ? 420 : 400 }}>
        {/* The lockup: a mark and a wordmark, which is what sits above all
            three of these in the real pages. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginBottom: message ? 26 : 22,
          }}
        >
          <div
            className="pbk-fill"
            style={{ width: 26, height: 26, borderRadius: 8 }}
          />
          <div className="pbk-text" style={{ width: 92, height: 18 }}>
            &nbsp;
          </div>
        </div>
        {message ? (
          <>
            <div
              className="pbk-text"
              style={{ width: 220, margin: "0 auto 10px", fontSize: "1.375rem" }}
            >
              &nbsp;
            </div>
            {["100%", "100%", "100%", "60%"].map((w, i) => (
              <div
                key={i}
                className="pbk-text"
                style={{
                  width: w,
                  margin: i ? "6px auto 0" : "0 auto",
                  fontSize: "0.90625rem",
                  lineHeight: 1.65,
                }}
              >
                &nbsp;
              </div>
            ))}
            <div
              className="stg-button pbk-fill"
              style={{ display: "flex", width: 96, margin: "26px auto 0" }}
            />
          </>
        ) : (
          <div
            className="pbk-fill"
            style={{ height, borderRadius: 18, width: "100%" }}
          />
        )}
      </div>
    </div>
  );
}
