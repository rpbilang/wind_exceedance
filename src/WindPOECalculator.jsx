import { useState, useCallback } from "react";

const PVAL = [0, 1, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 99, 100];
const ZVAL = [-3.4, -2.33, -1.645, -1.28, -0.84, -0.67, -0.52, -0.25, 0, 0.25, 0.52, 0.67, 0.84, 1.28, 1.645, 2.33, 3.4];

// P90 first — that's what lenders care about most
const CARDS = [
  { p: 50, label: "P50", sublabel: "Expected / Median",      description: "50% chance generation will exceed this", accent: "#166534", bg: "#f0fdf4", border: "#bbf7d0", badge: "#166534", badgeBg: "#dcfce7" },
  { p: 75, label: "P75", sublabel: "Company Standard",       description: "75% chance generation will exceed this", accent: "#92400e", bg: "#fffbeb", border: "#f59e0b", badge: "#92400e", badgeBg: "#fef3c7" },
  { p: 90, label: "P90", sublabel: "Lender / Bankable Case", description: "90% chance generation will exceed this", accent: "#1e3a8a", bg: "#eff6ff", border: "#bfdbfe", badge: "#1e3a8a", badgeBg: "#dbeafe" },
];

function getZ(p) { const i = PVAL.indexOf(p); return i >= 0 ? ZVAL[i] : null; }
function fmt(n, d = 2) { return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); }
function calcGen(p50, u, z) { return p50 * (1 - z * u); }

// Interpolate P-value from a given generation target
function genToPvalue(p50, u, targetGen) {
  // targetGen = p50 * (1 - z * u)  =>  z = (p50 - targetGen) / (p50 * u)
  const z = (p50 - targetGen) / (p50 * u);
  // Clamp z to our table range
  if (z <= ZVAL[0]) return PVAL[0];
  if (z >= ZVAL[ZVAL.length - 1]) return PVAL[PVAL.length - 1];
  // Linear interpolation between nearest z values
  for (let i = 0; i < ZVAL.length - 1; i++) {
    if (z >= ZVAL[i] && z <= ZVAL[i + 1]) {
      const t = (z - ZVAL[i]) / (ZVAL[i + 1] - ZVAL[i]);
      return PVAL[i] + t * (PVAL[i + 1] - PVAL[i]);
    }
  }
  return null;
}

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

const Toggle = ({ label, value, onChange }) => (
  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
    <div onClick={() => onChange(!value)} style={{ width: "44px", height: "24px", borderRadius: "12px", background: value ? "#2563eb" : "#d1d5db", transition: "background 0.2s", position: "relative", cursor: "pointer", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: "3px", left: value ? "23px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s" }} />
    </div>
    <span style={{ fontSize: "13px", color: "#374151", fontWeight: "500", fontFamily: "'DM Sans',sans-serif" }}>{label}</span>
  </label>
);

// ── BANKER-FOCUSED SENSITIVITY ANALYSIS ──────────────────────────────────────
const SensitivityAnalysis = ({ p50, uncert, ratedCap, sigDelta, aepDelta, breakeven }) => {
  const sd = Math.abs(parseFloat(sigDelta) || 1);
  const ad = Math.abs(parseFloat(aepDelta) || 5);
  const u  = uncert / 100;

  // For each P-value, compute gen under 9 scenarios (3 sigma × 3 AEP)
  // We display 3 rows: Downside / Base / Upside — for each of P90, P75, P50
  const scenarios = [
    { key: "upside",   label: "Upside",   note: `σ−${fmt(sd,1)}%  ·  AEP+${fmt(ad,1)}%`, p50adj: p50 * (1 + ad/100), u: (uncert - sd) / 100, textColor: "#166534", rowBg: "#f0fdf4", border: "#bbf7d0", icon: "▲" },
    { key: "base",     label: "Base",     note: `σ=${fmt(uncert,1)}%  ·  AEP as entered`,  p50adj: p50,                  u: u,                   textColor: "#1e3a8a", rowBg: "#f8faff", border: "#bfdbfe", icon: "—", bold: true },
    { key: "downside", label: "Downside", note: `σ+${fmt(sd,1)}%  ·  AEP−${fmt(ad,1)}%`, p50adj: p50 * (1 - ad/100), u: (uncert + sd) / 100, textColor: "#991b1b", rowBg: "#fff5f5", border: "#fecaca", icon: "▼" },
  ];

  const pValues = [50, 75, 90];
  const baseScenario = scenarios.find(s => s.key === "base");

  // P90 stress range for the visual bar
  const p75z        = getZ(75);
  const p90z        = getZ(90);
  const p75upside   = calcGen(scenarios[0].p50adj, scenarios[0].u, p75z);
  const p75base     = calcGen(baseScenario.p50adj, baseScenario.u, p75z);
  const p90base     = calcGen(baseScenario.p50adj, baseScenario.u, p90z);
  const p75downside = calcGen(scenarios[2].p50adj, scenarios[2].u, p75z);
  const p75swing    = p75upside - p75downside;

  // Break-even analysis
  const beGen = parseFloat(breakeven);
  const beValid = !isNaN(beGen) && beGen > 0;
  const bePval  = beValid ? genToPvalue(p50, u, beGen) : null;
  const beAboveP90 = beValid && beGen > p90base;
  // Higher break-even GWh = harder to exceed = riskier (lower P-value = easier to exceed = safer)
  // beGen > P50 gen means company needs MORE than expected output -> risky
  // beGen < P75 gen means company only needs LESS than P75 output -> very comfortable
  const p75gen = calcGen(p50, u, getZ(75));
  // P75 is the company standard — break-even must be BELOW P75 gen to be comfortable
  // P75 gen > P50 gen (P75 is more conservative, lower output)
  // beGen < p75gen  → >75% chance of exceeding → ✅ Meets standard
  // beGen >= p75gen && beGen <= p50 → 50–75% chance → ⚠️ Below standard
  // beGen > p50     → <50% chance → 🚨 High Risk
  const p50gen = calcGen(p50, u, getZ(50));
  const beHighRisk    = beValid && beGen > p50gen;       // needs more than expected P50
  const beComfortable = beValid && beGen <= p75gen;      // exceeds P75 standard
  const beCaution     = beValid && !beHighRisk && !beComfortable; // between P75 and P50

  return (
    <div style={{ background: "#fff", borderRadius: "16px", border: "1.5px solid #e5e7eb", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: "16px", minWidth: 0, width: "100%" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb)", padding: "16px 22px" }}>
        <div style={{ color: "#fff", fontSize: "15px", fontWeight: "700" }}>📊 Sensitivity Analysis — Banker's View</div>
        <div style={{ color: "#93c5fd", fontSize: "12px", marginTop: "3px" }}>
          Stress-testing P90, P75 & P50 across uncertainty (±{fmt(sd,1)}%) and AEP estimate (±{fmt(ad,1)}%)
        </div>
      </div>

      {/* ── P90 STRESS RANGE BAR ── */}
      <div style={{ padding: "18px 22px", borderBottom: "1px solid #e5e7eb", background: "#f8faff" }}>
        <div style={{ fontSize: "12px", fontWeight: "700", color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
          P75 Risk Band — Company Standard Generation Range
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div style={{ fontSize: "13px", color: "#991b1b", fontWeight: "700", whiteSpace: "nowrap", minWidth: "80px" }}>
            ▼ {fmt(p75downside)} MWh
          </div>
          <div style={{ flex: 1, position: "relative", height: "28px" }}>
            {/* Background track */}
            <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: 0, right: 0, height: "10px", background: "#e5e7eb", borderRadius: "5px" }} />
            {/* Stress band */}
            <div style={{
              position: "absolute", top: "50%", transform: "translateY(-50%)",
              left: 0, right: 0, height: "10px", borderRadius: "5px",
              background: "linear-gradient(90deg, #fecaca, #bfdbfe, #bbf7d0)"
            }} />
            {/* Base marker */}
            {p75swing > 0 && (() => {
              const pct = ((p75base - p75downside) / p75swing) * 100;
              return (
                <div style={{ position: "absolute", top: "50%", transform: "translate(-50%,-50%)", left: `${pct}%` }}>
                  <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#1e3a8a", border: "3px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }} />
                </div>
              );
            })()}
          </div>
          <div style={{ fontSize: "13px", color: "#166534", fontWeight: "700", whiteSpace: "nowrap", minWidth: "80px", textAlign: "right" }}>
            ▲ {fmt(p75upside)} MWh
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", alignItems: "center" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#1e3a8a", flexShrink: 0 }} />
          <span style={{ fontSize: "12px", color: "#374151" }}>Base P75: <strong>{fmt(p75base)} MWh</strong></span>
          <span style={{ fontSize: "12px", color: "#9ca3af", marginLeft: "8px" }}>
            Swing: <strong style={{ color: "#374151" }}>{fmt(p75swing)} MWh</strong> ({fmt(p75swing / p75base * 100, 1)}% of base)
          </span>
        </div>
      </div>

      {/* ── SCENARIO TABLE: Upside / Base / Downside × P50, P75, P90 ── */}
      <div>
        <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th style={{ width: "22%", padding: "8px 10px", textAlign: "left", fontSize: "10px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb" }}>Scenario</th>
              {pValues.map(pv => {
                const card = CARDS.find(c => c.p === pv);
                return (
                  <th key={pv} colSpan={3} style={{ padding: "8px 4px", textAlign: "center", fontSize: "10px", fontWeight: "700", color: card.accent, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #e5e7eb", background: card.bg, borderLeft: "1px solid #e5e7eb" }}>
                    {card.label} — {card.sublabel}
                  </th>
                );
              })}
            </tr>
            <tr style={{ background: "#f9fafb" }}>
              <th style={{ padding: "4px 10px", borderBottom: "1px solid #e5e7eb", fontSize: "9px", color: "#9ca3af", fontWeight: "600", textAlign: "left" }}>Assumptions</th>
              {pValues.map(pv => {
                const card = CARDS.find(c => c.p === pv);
                return (
                  <>
                    <th key={`${pv}-gen`} style={{ padding: "4px 4px", textAlign: "center", fontSize: "9px", fontWeight: "600", color: "#9ca3af", borderBottom: "1px solid #e5e7eb", background: card.bg, borderLeft: "1px solid #e5e7eb" }}>MWh/yr</th>
                    <th key={`${pv}-cf`}  style={{ padding: "4px 4px", textAlign: "center", fontSize: "9px", fontWeight: "600", color: "#9ca3af", borderBottom: "1px solid #e5e7eb", background: card.bg }}>CF%</th>
                    <th key={`${pv}-delta`} style={{ padding: "4px 4px", textAlign: "center", fontSize: "9px", fontWeight: "600", color: "#9ca3af", borderBottom: "1px solid #e5e7eb", background: card.bg }}>vs Base</th>
                  </>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => {
              const baseRow = scenarios.find(x => x.key === "base");
              return (
                <tr key={s.key} style={{ background: s.rowBg, borderLeft: `4px solid ${s.border}` }}>
                  <td style={{ padding: "10px 10px", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "13px", color: s.textColor, fontWeight: "800", flexShrink: 0 }}>{s.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "12px", fontWeight: s.bold ? "700" : "600", color: s.textColor }}>{s.label}</div>
                        <div style={{ fontSize: "9px", color: "#9ca3af", marginTop: "1px", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.note}</div>
                      </div>
                    </div>
                  </td>
                  {pValues.map(pv => {
                    const z       = getZ(pv);
                    const gen     = calcGen(s.p50adj, s.u, z);
                    const baseGen = calcGen(baseRow.p50adj, baseRow.u, z);
                    const diff    = gen - baseGen;
                    const pct     = baseGen > 0 ? diff / baseGen * 100 : 0;
                    const card    = CARDS.find(c => c.p === pv);
                    return (
                      <>
                        <td key={`${pv}-gen`} style={{ padding: "8px 4px", textAlign: "center", borderBottom: "1px solid #f3f4f6", borderLeft: "1px solid #f3f4f6" }}>
                          <div style={{ fontSize: "12px", fontWeight: s.bold ? "700" : "500", color: s.bold ? card.accent : "#111827" }}>{fmt(gen)}</div>
                        </td>
                        <td key={`${pv}-cf`} style={{ padding: "8px 4px", textAlign: "center", borderBottom: "1px solid #f3f4f6" }}>
                          <div style={{ fontSize: "11px", fontWeight: s.bold ? "700" : "400", color: s.bold ? card.accent : "#6b7280" }}>{fmt(ratedCap > 0 ? gen / ratedCap * 100 : 0)}%</div>
                        </td>
                        <td key={`${pv}-delta`} style={{ padding: "8px 4px", textAlign: "center", borderBottom: "1px solid #f3f4f6" }}>
                          {s.bold ? (
                            <span style={{ fontSize: "10px", color: "#9ca3af" }}>—</span>
                          ) : (
                            <div>
                              <div style={{ fontSize: "11px", fontWeight: "700", color: diff > 0 ? "#166534" : "#b91c1c" }}>
                                {diff > 0 ? "+" : ""}{fmt(diff, 1)}
                              </div>
                              <div style={{ fontSize: "9px", color: diff > 0 ? "#166534" : "#b91c1c", marginTop: "1px" }}>
                                ({pct > 0 ? "+" : ""}{fmt(pct, 1)}%)
                              </div>
                            </div>
                          )}
                        </td>
                      </>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── BREAK-EVEN FINDER — only shown when a value is entered ── */}
      {beValid && (
      <div style={{ padding: "18px 22px", borderTop: "1px solid #e5e7eb", background: "#fffbf0" }}>
        <div style={{ fontSize: "12px", fontWeight: "700", color: "#92400e", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
          🎯 Break-Even Finder
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ flex: "1", minWidth: "200px" }}>
            <div style={{ fontSize: "12px", color: "#374151", marginBottom: "6px", fontWeight: "500" }}>
              Minimum required generation (from financial model)
            </div>
            <div style={{ position: "relative" }}>
              <input
                type="number"
                value={breakeven}
                readOnly
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 52px 10px 13px", fontSize: "14px", fontFamily: "'DM Sans',sans-serif", color: "#111827", background: "#fff", border: "1.5px solid #fde68a", borderRadius: "9px", outline: "none" }}
              />
              <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#9ca3af", pointerEvents: "none" }}>MWh/yr</span>
            </div>
          </div>
          <div style={{ flex: "2", minWidth: "260px" }}>
            <div style={{ background: beHighRisk ? "#fef2f2" : beComfortable ? "#f0fdf4" : "#fffbeb", border: `1.5px solid ${beHighRisk ? "#fca5a5" : beComfortable ? "#bbf7d0" : "#f59e0b"}`, borderRadius: "10px", padding: "12px 16px" }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: beHighRisk ? "#991b1b" : beComfortable ? "#166534" : "#92400e", marginBottom: "4px" }}>
                {beHighRisk
                  ? "🚨 High Risk — Less than 50% chance of meeting target"
                  : beComfortable
                  ? "✅ Meets P75 Company Standard"
                  : "⚠️ Caution — Below P75 Standard (50–75% exceedance)"}
              </div>
              <div style={{ fontSize: "14px", color: "#374151", lineHeight: "1.6" }}>
                A minimum of <strong>{fmt(beGen)} MWh/yr</strong> corresponds to
                exceedance probability <strong style={{ fontSize: "16px" }}>P{fmt(bePval, 1)}</strong>.
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>
                {beHighRisk
                  ? `Only ${fmt(bePval, 1)}% probability of exceeding this — requires more than the expected P50 output. Revise the financial model.`
                  : beComfortable
                  ? `${fmt(bePval, 1)}% probability of exceeding this target — comfortably meets the P75 company standard.`
                  : `${fmt(bePval, 1)}% probability of exceeding this target — falls short of the 75% confidence required by company standard.`}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Footer note */}
      <div style={{ padding: "10px 22px", background: "#f9fafb", borderTop: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: "11px", color: "#6b7280", lineHeight: "1.6" }}>
          <strong>Upside:</strong> Lower uncertainty + higher AEP estimate (optimistic). &nbsp;
          <strong>Base:</strong> Your inputs as entered. &nbsp;
          <strong>Downside:</strong> Higher uncertainty + lower AEP estimate (stress case). &nbsp;
          "vs Base" shows MWh and % change relative to the base case.
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

export default function WindPOECalculator() {
  const [useGross, setUseGross]       = useState(true);
  const [grossAEP, setGrossAEP]       = useState("");
  const [netAEP, setNetAEP]           = useState("");
  const [wakes, setWakes]             = useState("");
  const [otherLosses, setOtherLosses] = useState("");
  const [uncertainty, setUncertainty] = useState("");
  const [numTurb, setNumTurb]         = useState("");
  const [ratedMW, setRatedMW]         = useState("");
  const [hours, setHours]             = useState("8760");

  const [showSensitivity, setShowSensitivity] = useState(false);
  const [sigDelta, setSigDelta]       = useState("1");
  const [aepDelta, setAepDelta]       = useState("5");
  const [breakeven, setBreakeven]     = useState("");

  const [showTable, setShowTable]     = useState(false);
  const [results, setResults]         = useState(null);
  const [error, setError]             = useState("");

  const calculate = useCallback(() => {
    setError("");
    try {
      const uncert = parseFloat(uncertainty), nTurb = parseInt(numTurb), rated = parseFloat(ratedMW), hrs = parseFloat(hours) || 8760;
      if (isNaN(uncert) || isNaN(nTurb) || isNaN(rated)) { setError("Please fill in Uncertainty, Number of Turbines, and Rated Capacity."); return; }
      let p50;
      if (useGross) {
        const gross = parseFloat(grossAEP);
        if (isNaN(gross)) { setError("Please enter Gross Wind AEP."); return; }
        p50 = gross * (1 - (parseFloat(wakes) || 0) / 100) * (1 - (parseFloat(otherLosses) || 0) / 100);
      } else {
        const net = parseFloat(netAEP);
        if (isNaN(net)) { setError("Please enter Net Wind AEP."); return; }
        p50 = net;
      }
      const u = uncert / 100, ratedCap = (rated * hrs) * nTurb;
      const cards   = CARDS.map(c => { const z = getZ(c.p), gen = calcGen(p50, u, z), cf = ratedCap > 0 ? gen / ratedCap * 100 : 0; return { ...c, gen, cf }; });
      const allRows = PVAL.map((p, i) => { const gen = p50 * (1 - ZVAL[i] * u); return { p, z: ZVAL[i], gen, cf: ratedCap > 0 ? gen / ratedCap * 100 : 0 }; });
      setResults({ cards, allRows, p50, ratedCap, totalMW: rated * nTurb, uncert });
    } catch (e) { setError("Error: " + e.message); }
  }, [useGross, grossAEP, netAEP, wakes, otherLosses, uncertainty, numTurb, ratedMW, hours]);

  const p50c = results?.cards.find(c => c.p === 50);
  const p75c = results?.cards.find(c => c.p === 75);
  const p90c = results?.cards.find(c => c.p === 90);

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet" />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { width: 100%; min-height: 100vh; background: #f1f5f9; overflow-x: hidden; }
        body { margin: 0; padding: 0; }
      `}</style>

      {/* Nav */}
      <div style={{ background: "#0f2744", padding: "0 28px", display: "flex", alignItems: "center", height: "56px", gap: "14px" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg,#3b82f6,#60a5fa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>🌬️</div>
        <div>
          <div style={{ color: "#fff", fontSize: "15px", fontWeight: "700", lineHeight: 1.1 }}>Wind Farm POE Calculator</div>
          <div style={{ color: "#64748b", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase" }}>Aboitiz Renewables · Project Development</div>
        </div>
      </div>

      <div style={{ width: "100%", padding: "16px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "320px minmax(0,1fr)", gap: "20px", alignItems: "start" }}>

          {/* ── INPUT PANEL ── */}
          <div style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg,#0f2744,#1e3a5f)", padding: "18px 22px" }}>
              <div style={{ color: "#fff", fontSize: "16px", fontWeight: "700" }}>Input Parameters</div>
              <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>Fill in all required fields</div>
            </div>
            <div style={{ padding: "20px 22px" }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>Energy Estimate Source</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "18px" }}>
                {[["Gross AEP", true], ["Net AEP", false]].map(([lbl, v]) => (
                  <button key={lbl} onClick={() => setUseGross(v)} style={{ padding: "9px", borderRadius: "9px", border: `2px solid ${useGross === v ? "#2563eb" : "#e5e7eb"}`, background: useGross === v ? "#eff6ff" : "#fff", color: useGross === v ? "#1d4ed8" : "#6b7280", fontWeight: useGross === v ? "700" : "500", fontSize: "13px", fontFamily: "'DM Sans',sans-serif", cursor: "pointer" }}>{lbl}</button>
                ))}
              </div>

              {useGross ? (<>
                <Field label="Gross Wind AEP"  value={grossAEP}   onChange={setGrossAEP}   placeholder="e.g. 280000" unit="MWh" />
                <Field label="Wake Losses"     value={wakes}       onChange={setWakes}       placeholder="e.g. 5.0"   unit="%" hint="Standalone factor from energy report (e.g. 1 − internal wake%)" />
                <Field label="Other Losses"    value={otherLosses} onChange={setOtherLosses} placeholder="e.g. 3.0"   unit="%" hint="Product of all non-wake losses (e.g. power curve × availability × electrical)" />
              </>) : (
                <Field label="Net Wind AEP" value={netAEP} onChange={setNetAEP} placeholder="e.g. 250000" unit="MWh" hint="Post-losses energy estimate" />
              )}

              <Divider label="Project Details" />
              <Field label="Uncertainty (1σ)"      value={uncertainty} onChange={setUncertainty} placeholder="e.g. 8.0" unit="%" hint="From energy assessment report" />
              <Field label="Number of Turbines"     value={numTurb}     onChange={setNumTurb}     placeholder="e.g. 20" />
              <Field label="Rated Turbine Capacity" value={ratedMW}     onChange={setRatedMW}     placeholder="e.g. 3.6" unit="MW" />
              <Field label="Hours per Year"         value={hours}       onChange={setHours}       placeholder="8760"    unit="hrs" hint="8,760 for a standard year" />

              <Divider label="Options" />

              {/* Sensitivity toggle */}
              <div style={{ marginBottom: "18px" }}>
                <Toggle label="Show Sensitivity Analysis" value={showSensitivity} onChange={setShowSensitivity} />

                {showSensitivity && (
                  <div style={{ marginTop: "12px", background: "#f8faff", border: "1.5px solid #bfdbfe", borderRadius: "12px", padding: "14px" }}>

                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#1e3a8a", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Stress Parameters</div>

                    <div style={{ marginBottom: "12px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "5px" }}>Uncertainty Variance</label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: "#6b7280", pointerEvents: "none" }}>±</span>
                        <input type="number" value={sigDelta} onChange={e => setSigDelta(e.target.value)} placeholder="1" min="0.1" step="0.5"
                          style={{ width: "100%", boxSizing: "border-box", padding: "9px 42px 9px 28px", fontSize: "14px", fontFamily: "'DM Sans',sans-serif", color: "#111827", background: "#fff", border: "1.5px solid #bfdbfe", borderRadius: "8px", outline: "none" }}
                          onFocus={e => { e.target.style.borderColor = "#2563eb"; }} onBlur={e => { e.target.style.borderColor = "#bfdbfe"; }} />
                        <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#9ca3af", pointerEvents: "none" }}>%</span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>Shifts σ up/down by this amount</div>
                    </div>

                    <div style={{ marginBottom: "12px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "5px" }}>AEP Estimate Variance</label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: "#6b7280", pointerEvents: "none" }}>±</span>
                        <input type="number" value={aepDelta} onChange={e => setAepDelta(e.target.value)} placeholder="5" min="0.1" step="0.5"
                          style={{ width: "100%", boxSizing: "border-box", padding: "9px 42px 9px 28px", fontSize: "14px", fontFamily: "'DM Sans',sans-serif", color: "#111827", background: "#fff", border: "1.5px solid #bfdbfe", borderRadius: "8px", outline: "none" }}
                          onFocus={e => { e.target.style.borderColor = "#2563eb"; }} onBlur={e => { e.target.style.borderColor = "#bfdbfe"; }} />
                        <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#9ca3af", pointerEvents: "none" }}>%</span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>Shifts P50 AEP up/down by this %</div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "5px" }}>Break-Even Generation <span style={{ color: "#9ca3af", fontWeight: "400" }}>(optional)</span></label>
                      <div style={{ position: "relative" }}>
                        <input type="number" value={breakeven} onChange={e => setBreakeven(e.target.value)} placeholder="Min. MWh from fin. model"
                          style={{ width: "100%", boxSizing: "border-box", padding: "9px 52px 9px 13px", fontSize: "14px", fontFamily: "'DM Sans',sans-serif", color: "#111827", background: "#fff", border: "1.5px solid #fde68a", borderRadius: "8px", outline: "none" }}
                          onFocus={e => { e.target.style.borderColor = "#f59e0b"; }} onBlur={e => { e.target.style.borderColor = "#fde68a"; }} />
                        <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#9ca3af", pointerEvents: "none" }}>MWh/yr</span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>Finds the corresponding P-value</div>
                    </div>
                  </div>
                )}
              </div>

              {error && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "10px", padding: "11px 13px", fontSize: "13px", color: "#b91c1c", marginBottom: "14px" }}>⚠️ {error}</div>}

              <button onClick={calculate} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", border: "none", borderRadius: "11px", color: "#fff", fontSize: "15px", fontWeight: "700", fontFamily: "'DM Sans',sans-serif", cursor: "pointer", boxShadow: "0 4px 14px rgba(37,99,235,0.3)" }}>
                Calculate Results
              </button>
            </div>
          </div>

          {/* ── RESULTS ── */}
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            {results ? (<>

              {/* Summary bar */}
              <div style={{ background: "linear-gradient(135deg,#0f2744,#1e3a5f)", borderRadius: "16px", padding: "20px 28px", marginBottom: "18px", display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
                {[
                  { lbl: "P75 Net AEP",       val: fmt(results.cards.find(c=>c.p===75)?.gen) + " MWh", sub: "Company standard output" },
                  { lbl: "Installed Capacity", val: fmt(results.totalMW)  + " MW",  sub: "Total nameplate" },
                  { lbl: "Uncertainty (1σ)",   val: fmt(results.uncert,1) + "%",    sub: "Energy estimate spread" },
                ].map((s, i) => (
                  <div key={i} style={{ padding: "0 20px", borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
                    <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "5px" }}>{s.lbl}</div>
                    <div style={{ fontSize: "24px", fontWeight: "800", color: "#fff", fontFamily: "'Playfair Display',serif", lineHeight: 1.1 }}>{s.val}</div>
                    <div style={{ fontSize: "11px", color: "#475569", marginTop: "3px" }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* P90 / P75 / P50 cards — P90 first */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "16px" }}>
                {results.cards.map(c => (
                  <div key={c.p} style={{ background: "#fff", borderRadius: "16px", overflow: "hidden", boxShadow: c.p === 75 ? "0 4px 20px rgba(146,64,14,0.18)" : "0 1px 4px rgba(0,0,0,0.08)", border: `1.5px solid ${c.border}` }}>
                    <div style={{ background: c.bg, borderBottom: `1.5px solid ${c.border}`, padding: "14px 18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "3px" }}>
                        <span style={{ fontSize: "30px", fontWeight: "800", color: c.accent, fontFamily: "'Playfair Display',serif", lineHeight: 1 }}>{c.label}</span>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px" }}>
                          {c.p === 75 && <span style={{ fontSize: "9px", fontWeight: "700", color: "#92400e", background: "#fef3c7", padding: "2px 6px", borderRadius: "10px", letterSpacing: "0.06em" }}>COMPANY STANDARD</span>}
                          {c.p === 90 && <span style={{ fontSize: "9px", fontWeight: "700", color: "#1e3a8a", background: "#dbeafe", padding: "2px 6px", borderRadius: "10px", letterSpacing: "0.06em" }}>LENDER KEY</span>}
                          <span style={{ background: c.badgeBg, color: c.badge, fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "20px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{c.p}%</span>
                        </div>
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: c.accent }}>{c.sublabel}</div>
                      <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "3px", lineHeight: 1.4 }}>{c.description}</div>
                    </div>
                    <div style={{ padding: "16px 18px" }}>
                      <div style={{ marginBottom: "14px" }}>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "3px" }}>Annual Generation</div>
                        <div style={{ fontSize: "30px", fontWeight: "800", color: "#111827", lineHeight: 1, fontFamily: "'Playfair Display',serif" }}>{fmt(c.gen)}</div>
                        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>MWh / year</div>
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
                    </div>
                  </div>
                ))}
              </div>

              {/* Key Takeaway */}
              <div style={{ background: "#fff", borderRadius: "16px", padding: "18px 22px", marginBottom: "16px", border: "1.5px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#6b7280", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>📋 Key Takeaway</div>
                <div style={{ fontSize: "15px", color: "#374151", lineHeight: "1.75" }}>
                  The company's <strong style={{ fontSize: "17px", color: "#92400e", background: "#fef3c7", padding: "1px 6px", borderRadius: "4px" }}>P75 target is {fmt(p75c?.gen)} MWh/year</strong> ({fmt(p75c?.cf)}% CF) — a conservative estimate with 75% confidence of exceedance, and <strong>Aboitiz's primary planning basis</strong>.{" "}
                  The expected output (P50) is <strong style={{ color: "#166534" }}>{fmt(p50c?.gen)} MWh/year</strong> ({fmt(p50c?.cf)}% CF), while the lender's bankable floor (P90) is <strong style={{ color: "#1e3a8a" }}>{fmt(p90c?.gen)} MWh/year</strong> ({fmt(p90c?.cf)}% CF).
                </div>
              </div>

              {/* Sensitivity Analysis — only when toggled */}
              {showSensitivity && (
                <SensitivityAnalysis
                  p50={results.p50}
                  uncert={results.uncert}
                  ratedCap={results.ratedCap}
                  sigDelta={sigDelta}
                  aepDelta={aepDelta}
                  breakeven={breakeven}
                />
              )}

              {/* Full exceedance table */}
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
                          {["P-Value", "Z-Score", "Generation (MWh)", "Capacity Factor"].map(h => (
                            <th key={h} style={{ padding: "11px 18px", textAlign: "left", fontSize: "11px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {results.allRows.map(({ p, z, gen, cf }) => {
                          const card = CARDS.find(c => c.p === p);
                          return (
                            <tr key={p} style={{ background: card ? card.bg : "transparent" }}>
                              <td style={{ padding: "10px 18px", fontWeight: card ? "700" : "400", color: card ? card.accent : "#374151", borderBottom: "1px solid #f3f4f6", fontSize: card ? "15px" : "14px" }}>
                                P{p}{card ? <span style={{ fontSize: "11px", marginLeft: "6px", fontWeight: "500", color: card.accent + "bb" }}>— {card.sublabel}</span> : null}
                              </td>
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
                <div style={{ fontSize: "15px", color: "#9ca3af", textAlign: "center", maxWidth: "300px", lineHeight: "1.65" }}>
                  Enter your project parameters on the left, then click <strong>Calculate Results</strong> to view P90, P75, and P50 exceedance values.
                </div>
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
