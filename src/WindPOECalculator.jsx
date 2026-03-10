import { useState, useCallback } from "react";

const PVAL = [0, 1, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 99, 100];
const ZVAL = [-3.4, -2.33, -1.645, -1.28, -0.84, -0.67, -0.52, -0.25, 0, 0.25, 0.52, 0.67, 0.84, 1.28, 1.645, 2.33, 3.4];

const CARDS = [
  { p: 50, label: "P50", sublabel: "Expected / Median", description: "50% chance generation will exceed this", accent: "#166534", bg: "#f0fdf4", border: "#bbf7d0", badge: "#166534", badgeBg: "#dcfce7" },
  { p: 75, label: "P75", sublabel: "Conservative Estimate", description: "75% chance generation will exceed this", accent: "#92400e", bg: "#fffbeb", border: "#fde68a", badge: "#92400e", badgeBg: "#fef3c7" },
  { p: 90, label: "P90", sublabel: "Lender / Bankable Case", description: "90% chance generation will exceed this", accent: "#1e3a8a", bg: "#eff6ff", border: "#bfdbfe", badge: "#1e3a8a", badgeBg: "#dbeafe" },
];

function getZ(p) { const i = PVAL.indexOf(p); return i >= 0 ? ZVAL[i] : null; }
function fmt(n, d = 2) { return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); }

const Field = ({ label, value, onChange, placeholder, unit, hint }) => (
  <div style={{ marginBottom: "16px" }}>
    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px", fontFamily: "'DM Sans',sans-serif" }}>{label}</label>
    <div style={{ position: "relative" }}>
      <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", boxSizing: "border-box", padding: unit ? "11px 46px 11px 13px" : "11px 13px", fontSize: "15px", fontFamily: "'DM Sans',sans-serif", color: "#111827", background: "#fff", border: "1.5px solid #d1d5db", borderRadius: "10px", outline: "none" }}
        onFocus={e => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.12)"; }}
        onBlur={e => { e.target.style.borderColor = "#d1d5db"; e.target.style.boxShadow = "none"; }} />
      {unit && <span style={{ position: "absolute", right: "13px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: "#9ca3af", fontFamily: "'DM Sans',sans-serif", pointerEvents: "none" }}>{unit}</span>}
    </div>
    {hint && <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px", fontFamily: "'DM Sans',sans-serif" }}>{hint}</div>}
  </div>
);

const Divider = ({ label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "18px 0 14px" }}>
    <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
    <span style={{ fontSize: "10px", fontWeight: "700", color: "#9ca3af", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>{label}</span>
    <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
  </div>
);

export default function WindPOECalculator() {
  const [useGross, setUseGross] = useState(true);
  const [grossAEP, setGrossAEP] = useState("");
  const [netAEP, setNetAEP] = useState("");
  const [wakes, setWakes] = useState("");
  const [otherLosses, setOtherLosses] = useState("");
  const [uncertainty, setUncertainty] = useState("");
  const [numTurb, setNumTurb] = useState("");
  const [ratedMW, setRatedMW] = useState("");
  const [hours, setHours] = useState("8760");
  const [showRanges, setShowRanges] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  const calculate = useCallback(() => {
    setError("");
    try {
      const uncert = parseFloat(uncertainty), nTurb = parseInt(numTurb), rated = parseFloat(ratedMW), hrs = parseFloat(hours) || 8760;
      if (isNaN(uncert) || isNaN(nTurb) || isNaN(rated)) { setError("Please fill in Uncertainty, Number of Turbines, and Rated Capacity."); return; }
      let p50;
      if (useGross) {
        const gross = parseFloat(grossAEP);
        if (isNaN(gross)) { setError("Please enter Gross Wind AEP."); return; }
        p50 = gross * (1 - ((parseFloat(wakes) || 0) + (parseFloat(otherLosses) || 0)) / 100);
      } else {
        const net = parseFloat(netAEP);
        if (isNaN(net)) { setError("Please enter Net Wind AEP."); return; }
        p50 = net;
      }
      const u = uncert / 100, ratedCap = (rated * hrs / 1000) * nTurb;
      const cards = CARDS.map(c => {
        const z = getZ(c.p), gen = p50 * (1 - z * u), cf = ratedCap > 0 ? gen / ratedCap * 100 : 0;
        let genRange = null, cfRange = null;
        if (showRanges) {
          const lo = p50 * (1 - (z - 0.1) * u), hi = p50 * (1 - (z + 0.1) * u);
          genRange = [Math.min(lo, hi), Math.max(lo, hi)];
          cfRange = [genRange[0] / ratedCap * 100, genRange[1] / ratedCap * 100];
        }
        return { ...c, gen, cf, genRange, cfRange };
      });
      const allRows = PVAL.map((p, i) => { const gen = p50 * (1 - ZVAL[i] * u); return { p, z: ZVAL[i], gen, cf: ratedCap > 0 ? gen / ratedCap * 100 : 0 }; });
      setResults({ cards, allRows, p50, ratedCap, totalMW: rated * nTurb, uncert });
    } catch (e) { setError("Error: " + e.message); }
  }, [useGross, grossAEP, netAEP, wakes, otherLosses, uncertainty, numTurb, ratedMW, hours, showRanges]);

  const p90 = results?.cards.find(c => c.p === 90);
  const p50c = results?.cards.find(c => c.p === 50);

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet" />

      {/* Nav */}
      <div style={{ background: "#0f2744", padding: "0 28px", display: "flex", alignItems: "center", height: "56px", gap: "14px" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg,#3b82f6,#60a5fa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>🌬️</div>
        <div>
          <div style={{ color: "#fff", fontSize: "15px", fontWeight: "700", lineHeight: 1.1 }}>Wind Farm POE Calculator</div>
          <div style={{ color: "#64748b", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase" }}>Aboitiz Renewables · Project Development</div>
        </div>
      </div>

      <div style={{ maxWidth: "1060px", margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "20px", alignItems: "start" }}>

          {/* INPUT */}
          <div style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg,#0f2744,#1e3a5f)", padding: "18px 22px" }}>
              <div style={{ color: "#fff", fontSize: "16px", fontWeight: "700" }}>Input Parameters</div>
              <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>Fill in all required fields</div>
            </div>
            <div style={{ padding: "22px" }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>Energy Estimate Source</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "18px" }}>
                {[["Gross AEP", true], ["Net AEP", false]].map(([lbl, v]) => (
                  <button key={lbl} onClick={() => setUseGross(v)} style={{ padding: "9px", borderRadius: "9px", border: `2px solid ${useGross === v ? "#2563eb" : "#e5e7eb"}`, background: useGross === v ? "#eff6ff" : "#fff", color: useGross === v ? "#1d4ed8" : "#6b7280", fontWeight: useGross === v ? "700" : "500", fontSize: "13px", fontFamily: "'DM Sans',sans-serif", cursor: "pointer", transition: "all 0.15s" }}>{lbl}</button>
                ))}
              </div>

              {useGross ? (<>
                <Field label="Gross Wind AEP" value={grossAEP} onChange={setGrossAEP} placeholder="e.g. 280.0" unit="GWh" />
                <Field label="Wake Losses" value={wakes} onChange={setWakes} placeholder="e.g. 5.0" unit="%" hint="Typical range: 3–8%" />
                <Field label="Other Losses" value={otherLosses} onChange={setOtherLosses} placeholder="e.g. 3.0" unit="%" hint="Electrical, availability, etc." />
              </>) : (
                <Field label="Net Wind AEP" value={netAEP} onChange={setNetAEP} placeholder="e.g. 250.0" unit="GWh" hint="Post-losses energy estimate" />
              )}

              <Divider label="Project Details" />
              <Field label="Uncertainty (1σ)" value={uncertainty} onChange={setUncertainty} placeholder="e.g. 8.0" unit="%" hint="From energy assessment report" />
              <Field label="Number of Turbines" value={numTurb} onChange={setNumTurb} placeholder="e.g. 20" />
              <Field label="Rated Turbine Capacity" value={ratedMW} onChange={setRatedMW} placeholder="e.g. 3.6" unit="MW" />
              <Field label="Hours per Year" value={hours} onChange={setHours} placeholder="8760" unit="hrs" hint="8,760 for a standard year" />

              <Divider label="Options" />
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginBottom: "18px" }}>
                <div onClick={() => setShowRanges(!showRanges)} style={{ width: "44px", height: "24px", borderRadius: "12px", background: showRanges ? "#2563eb" : "#d1d5db", transition: "background 0.2s", position: "relative", cursor: "pointer", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: "3px", left: showRanges ? "23px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s" }} />
                </div>
                <span style={{ fontSize: "13px", color: "#374151", fontWeight: "500" }}>Show ±0.1σ sensitivity range</span>
              </label>

              {error && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "10px", padding: "11px 13px", fontSize: "13px", color: "#b91c1c", marginBottom: "14px" }}>⚠️ {error}</div>}

              <button onClick={calculate} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", border: "none", borderRadius: "11px", color: "#fff", fontSize: "15px", fontWeight: "700", fontFamily: "'DM Sans',sans-serif", cursor: "pointer", boxShadow: "0 4px 14px rgba(37,99,235,0.3)", letterSpacing: "0.01em" }}>
                Calculate Results
              </button>
            </div>
          </div>

          {/* RESULTS */}
          <div>
            {results ? (<>
              {/* Summary bar */}
              <div style={{ background: "linear-gradient(135deg,#0f2744,#1e3a5f)", borderRadius: "16px", padding: "20px 28px", marginBottom: "18px", display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
                {[
                  { lbl: "P50 Net AEP", val: fmt(results.p50) + " GWh", sub: "Expected annual output" },
                  { lbl: "Installed Capacity", val: fmt(results.totalMW) + " MW", sub: "Total nameplate" },
                  { lbl: "Uncertainty (1σ)", val: fmt(results.uncert, 1) + "%", sub: "Energy estimate spread" },
                ].map((s, i) => (
                  <div key={i} style={{ padding: "0 20px", borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
                    <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "5px" }}>{s.lbl}</div>
                    <div style={{ fontSize: "24px", fontWeight: "800", color: "#fff", fontFamily: "'Playfair Display',serif", lineHeight: 1.1 }}>{s.val}</div>
                    <div style={{ fontSize: "11px", color: "#475569", marginTop: "3px" }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* P50 / P75 / P90 cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "16px" }}>
                {results.cards.map(c => (
                  <div key={c.p} style={{ background: "#fff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: `1.5px solid ${c.border}` }}>
                    <div style={{ background: c.bg, borderBottom: `1.5px solid ${c.border}`, padding: "14px 18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "3px" }}>
                        <span style={{ fontSize: "30px", fontWeight: "800", color: c.accent, fontFamily: "'Playfair Display',serif", lineHeight: 1 }}>{c.label}</span>
                        <span style={{ background: c.badgeBg, color: c.badge, fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "20px", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "4px" }}>{c.p}%</span>
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: c.accent }}>{c.sublabel}</div>
                      <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "3px", lineHeight: 1.4 }}>{c.description}</div>
                    </div>
                    <div style={{ padding: "16px 18px" }}>
                      <div style={{ marginBottom: "14px" }}>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "3px" }}>Annual Generation</div>
                        <div style={{ fontSize: "30px", fontWeight: "800", color: "#111827", lineHeight: 1, fontFamily: "'Playfair Display',serif" }}>{fmt(c.gen)}</div>
                        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>GWh / year</div>
                      </div>
                      <div style={{ height: "1px", background: "#f3f4f6", margin: "12px 0" }} />
                      <div style={{ marginBottom: "12px" }}>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "3px" }}>Capacity Factor</div>
                        <div style={{ fontSize: "30px", fontWeight: "800", color: "#111827", lineHeight: 1, fontFamily: "'Playfair Display',serif" }}>{fmt(c.cf)}%</div>
                        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>of rated capacity</div>
                      </div>
                      <div style={{ height: "8px", background: "#f3f4f6", borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(c.cf, 60) / 60 * 100}%`, background: `linear-gradient(90deg,${c.border},${c.accent})`, borderRadius: "4px" }} />
                      </div>
                      {showRanges && c.genRange && (
                        <div style={{ marginTop: "12px", background: "#f9fafb", borderRadius: "8px", padding: "9px 11px" }}>
                          <div style={{ fontSize: "10px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "5px" }}>±0.1σ Sensitivity</div>
                          <div style={{ fontSize: "12px", color: "#374151" }}>{fmt(c.genRange[0])} – {fmt(c.genRange[1])} GWh</div>
                          <div style={{ fontSize: "12px", color: "#374151", marginTop: "2px" }}>{fmt(c.cfRange[0])}% – {fmt(c.cfRange[1])}% CF</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Executive summary */}
              <div style={{ background: "#fff", borderRadius: "16px", padding: "18px 22px", marginBottom: "16px", border: "1.5px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#6b7280", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>📋 Key Takeaway</div>
                <div style={{ fontSize: "15px", color: "#374151", lineHeight: "1.75" }}>
                  Under the <strong style={{ color: "#166534" }}>expected scenario (P50)</strong>, the project will generate <strong>{fmt(p50c?.gen)} GWh/year</strong> at a capacity factor of <strong>{fmt(p50c?.cf)}%</strong>.
                  For lender assessments, the <strong style={{ color: "#1e3a8a" }}>P90 bankable case is {fmt(p90?.gen)} GWh/year</strong> ({fmt(p90?.cf)}% CF) — a level that can be exceeded with 90% confidence.
                </div>
              </div>

              {/* Full table */}
              <div style={{ background: "#fff", borderRadius: "16px", border: "1.5px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <button onClick={() => setShowTable(!showTable)} style={{ width: "100%", padding: "15px 22px", background: "none", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>Full Exceedance Table — All P-Values</span>
                  <span style={{ fontSize: "12px", color: "#6b7280", background: "#f3f4f6", padding: "4px 12px", borderRadius: "20px" }}>{showTable ? "Hide ▲" : "Show ▼"}</span>
                </button>
                {showTable && (
                  <div style={{ borderTop: "1px solid #e5e7eb", overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                      <thead>
                        <tr style={{ background: "#f9fafb" }}>
                          {["P-Value", "Z-Score", "Generation (GWh)", "Capacity Factor"].map(h => (
                            <th key={h} style={{ padding: "11px 18px", textAlign: "left", fontSize: "11px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {results.allRows.map(({ p, z, gen, cf }) => {
                          const card = CARDS.find(c => c.p === p);
                          return (
                            <tr key={p} style={{ background: card ? card.bg : "transparent" }}>
                              <td style={{ padding: "10px 18px", fontWeight: card ? "700" : "400", color: card ? card.accent : "#374151", borderBottom: "1px solid #f3f4f6", fontSize: card ? "15px" : "14px" }}>P{p}{card ? <span style={{ fontSize: "11px", marginLeft: "6px", fontWeight: "500", color: card.accent + "bb" }}>— {card.sublabel}</span> : null}</td>
                              <td style={{ padding: "10px 18px", color: "#6b7280", borderBottom: "1px solid #f3f4f6", fontFamily: "monospace", fontSize: "13px" }}>{z.toFixed(3)}</td>
                              <td style={{ padding: "10px 18px", fontWeight: card ? "700" : "400", color: "#111827", borderBottom: "1px solid #f3f4f6" }}>{fmt(gen)}</td>
                              <td style={{ padding: "10px 18px", borderBottom: "1px solid #f3f4f6" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <span style={{ fontWeight: card ? "700" : "400", color: card ? card.accent : "#111827" }}>{fmt(cf)}%</span>
                                  <div style={{ width: "64px", height: "6px", background: "#e5e7eb", borderRadius: "3px", overflow: "hidden", flexShrink: 0 }}>
                                    <div style={{ height: "100%", width: `${Math.min(cf, 60) / 60 * 100}%`, background: card ? card.accent : "#94a3b8", borderRadius: "3px" }} />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>) : (
              <div style={{ background: "#fff", borderRadius: "16px", minHeight: "380px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "2px dashed #e5e7eb", gap: "14px", padding: "40px" }}>
                <div style={{ fontSize: "48px" }}>🌬️</div>
                <div style={{ fontSize: "22px", fontWeight: "700", color: "#1f2937", fontFamily: "'Playfair Display',serif" }}>Ready to Calculate</div>
                <div style={{ fontSize: "15px", color: "#9ca3af", textAlign: "center", maxWidth: "300px", lineHeight: "1.65" }}>Enter your project parameters on the left, then click <strong>Calculate Results</strong> to view P50, P75, and P90 exceedance values.</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "28px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: "1.8" }}>© 2024 Aboitiz Renewables Inc — Wind Project Development Team &nbsp;·&nbsp; Developed by Ronald Gil Joy Bilang</div>
        </div>
      </div>
    </div>
  );
}
