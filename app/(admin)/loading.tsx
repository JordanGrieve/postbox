import "../skeleton.css";

/**
 * /admin — the operator console, as its default view draws it.
 *
 * This used to re-export the dashboard's loading state, which meant the dark
 * console flashed a light full-screen panel with a centred logo on it. It
 * draws the console's own shell instead.
 *
 * Renders inside `.pba-root` (which carries data-theme="dark"), so every token
 * resolves to the dark palette exactly as the real console does — the skeleton
 * is dark even when the operator's own workspace is on the light theme.
 *
 * The default section is "accounts" (parseSection in admin/page.tsx), so this
 * is the accounts view, in the real .pba-* classes so admin.css and
 * console.css lay it out and nothing jumps on arrival:
 *
 *   - the sidebar: brand, four nav rows (Overview, Accounts with its count,
 *     Billing, Deliverability) and the one log-out button;
 *   - a title-only header (the search and "New account" left it in Sep 2026);
 *   - the four account totals (KpiGrid in admin/ui.tsx);
 *   - .pba-tabrow: five filter tabs and the search beside them;
 *   - the accounts table inside .pba-scroll / .pba-grid, eight columns:
 *     company, owner, plan, enquiries, open, created, status, Details;
 *   - the "New account" card under the table.
 *
 * No side panel: account details open in a modal since 16 Nov 2026, so the
 * table runs the full width.
 *
 * The nav labels are static and known, but they are drawn as blocks rather
 * than as text: a nav row that reads "Accounts" but does not navigate is worse
 * than one that plainly says nothing yet.
 */
export default function AdminLoading() {
  return (
    <div className="pba-page pbk" role="status" aria-busy="true" aria-label="Loading the admin console">
      <div className="pba-shell">
        <nav className="pba-side" aria-hidden>
          <div className="pba-brand">
            <span className="pba-brand-tile pbk-fill" />
            <span>
              <span className="pba-brand-name pbk-text" style={{ width: 88 }}>
                &nbsp;
              </span>
              <span className="pba-brand-sub pbk-text" style={{ width: 104, marginTop: 2 }}>
                &nbsp;
              </span>
            </span>
          </div>

          <div className="pba-divider" />

          <div className="pba-nav">
            {[84, 92, 64, 112].map((w, i) => (
              <span key={i} className="pba-navrow">
                <span className="pba-navlabel pbk-text pbk-text--fixed" style={{ width: w }}>
                  &nbsp;
                </span>
              </span>
            ))}
          </div>

          <div className="pba-side-foot">
            <div className="pba-btn pba-logout pbk-fill">&nbsp;</div>
          </div>
        </nav>

        <div className="pba-main">
          <header className="pba-header" aria-hidden>
            <div className="pba-htitles">
              <div className="pba-htitle pbk-text" style={{ width: 132 }}>
                &nbsp;
              </div>
            </div>
          </header>

          <div className="pba-body">
            <main className="pba-content" aria-hidden>
              <div className="pba-kpis">
                {[96, 80, 120, 128].map((w, i) => (
                  <div key={i} className="pba-kpi">
                    <div className="pba-kpi-label pbk-text" style={{ width: w }}>
                      &nbsp;
                    </div>
                    <div className="pba-kpi-value pbk-text" style={{ width: 40 }}>
                      &nbsp;
                    </div>
                    <div className="pba-kpi-note pbk-text" style={{ width: 132 }}>
                      &nbsp;
                    </div>
                  </div>
                ))}
              </div>

              <div className="pba-tabrow">
                <div className="pba-tabs">
                  {[118, 112, 78, 150, 150].map((w, i) => (
                    <span key={i} className="pba-tab pbk-fill" style={{ width: w }} />
                  ))}
                </div>
                {/* The bar goes INSIDE the real box: .pbk-fill's flex: none
                    would cancel admin.css's full-width row on a phone. */}
                <span className="pba-tabsearch">
                  <span className="pbk-fill" style={{ width: "100%", height: 44, borderRadius: 12 }} />
                </span>
              </div>

              <div className="pba-table">
                <div className="pba-scroll">
                  <div className="pba-grid pba-grid-accounts">
                    <div className="pba-thead">
                      <div className="pba-row pba-row-accounts pba-th">
                        {[64, 48, 36, 68, 36, 56, 48, 0].map((w, i) => (
                          <div key={i}>
                            {w > 0 && (
                              <span className="pbk-text" style={{ width: w }}>
                                &nbsp;
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="pba-tbody">
                      {ROWS.map((r, i) => (
                        <div key={i} className="pba-row pba-row-accounts">
                          <div>
                            <div className="pba-cell-main pbk-text" style={{ width: r.name }}>
                              &nbsp;
                            </div>
                            <div className="pba-cell-sub pbk-text" style={{ width: r.sub }}>
                              &nbsp;
                            </div>
                          </div>
                          <div className="pba-td pbk-text" style={{ width: r.owner }}>
                            &nbsp;
                          </div>
                          <div className="pba-td pbk-text" style={{ width: 64 }}>
                            &nbsp;
                          </div>
                          <div className="pba-num pbk-text" style={{ width: 28 }}>
                            &nbsp;
                          </div>
                          <div className="pba-num pbk-text" style={{ width: 20 }}>
                            &nbsp;
                          </div>
                          <div className="pba-td pbk-text" style={{ width: 72 }}>
                            &nbsp;
                          </div>
                          <div>
                            <span className="pba-pill pbk-fill" style={{ width: 64 }} />
                          </div>
                          <div>
                            <span className="pba-btn pba-btn-details pbk-fill" style={{ width: 72 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pba-card">
                <div className="pba-card-head">
                  <div className="pba-card-title pbk-text" style={{ width: 104 }}>
                    &nbsp;
                  </div>
                </div>
                <div className="pba-form">
                  {/* .pbk-fill sets flex: none; the real inputs grow. */}
                  <span className="pba-input pba-input-grow pbk-fill" style={{ flex: "2 1 220px", height: 44 }} />
                  <span className="pba-input pba-input-grow pbk-fill" style={{ flex: "2 1 220px", height: 44 }} />
                  <span className="pba-btn pba-btn-primary pbk-fill" style={{ width: 132 }} />
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

const ROWS = [
  { name: 148, sub: 186, owner: 176 },
  { name: 112, sub: 214, owner: 150 },
  { name: 176, sub: 168, owner: 188 },
  { name: 128, sub: 202, owner: 140 },
  { name: 158, sub: 178, owner: 164 },
  { name: 104, sub: 226, owner: 172 },
];
