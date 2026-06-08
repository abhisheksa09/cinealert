import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "https://cinealert-api.onrender.com";

const PLATFORMS = [
  { id: "netflix",  label: "Netflix",     color: "#e50914", bg: "#1a0002" },
  { id: "prime",    label: "Prime Video", color: "#00a8e0", bg: "#00101a" },
  { id: "disney",   label: "Disney+",     color: "#4a90e2", bg: "#000d1a" },
  { id: "apple",    label: "Apple TV+",   color: "#a0a0a0", bg: "#111111" },
  { id: "hbo",      label: "HBO Max",     color: "#a855f7", bg: "#0f0018" },
  { id: "hotstar",  label: "Jio Hotstar", color: "#1d9bf0", bg: "#001018" },
  { id: "zee5",     label: "Zee5",        color: "#9b59b6", bg: "#0d0015" },
  { id: "sonyliv",  label: "SonyLIV",     color: "#ff4757", bg: "#1a0005" },
];

const LANGUAGES = ["English", "Hindi", "Tamil", "Telugu", "Kannada", "Korean", "Japanese"];
const CONTENT_TYPES = ["Movies", "Series", "Documentaries", "Anime"];

const PLATFORM_ICONS = {
  netflix: "N",
  prime: "▶",
  disney: "✦",
  apple: "",
  hbo: "H",
  hotstar: "★",
  zee5: "Z",
  sonyliv: "S",
};

function Toggle({ on, onChange }) {
  return (
    <div onClick={onChange} style={{
      width: 44, height: 24, borderRadius: 999,
      background: on ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : "#2a2a3a",
      position: "relative", cursor: "pointer", flexShrink: 0,
      transition: "background 0.3s", boxShadow: on ? "0 0 12px rgba(124,58,237,0.4)" : "none"
    }}>
      <div style={{
        position: "absolute", width: 18, height: 18, borderRadius: "50%",
        background: "#fff", top: 3, left: on ? 23 : 3, transition: "left 0.3s",
        boxShadow: "0 2px 4px rgba(0,0,0,0.3)"
      }} />
    </div>
  );
}

export default function CineAlert() {
  const [tab, setTab] = useState("prefs");
  const [platforms, setPlatforms] = useState(["netflix", "prime", "hbo", "hotstar", "zee5", "sonyliv"]);
  const [languages, setLanguages] = useState(["English", "Hindi", "Kannada"]);
  const [types, setTypes] = useState(["Movies", "Series"]);
  const [telegramOn, setTelegramOn] = useState(true);
  const [emailOn, setEmailOn] = useState(true);
  const [chatId, setChatId] = useState("");
  const [email, setEmail] = useState("");
  const [freq, setFreq] = useState("instant");
  const [notifyNew, setNotifyNew] = useState(true);
  const [notifySoon, setNotifySoon] = useState(true);
  const [notifyTrailer, setNotifyTrailer] = useState(false);
  const [saved, setSaved] = useState(false);
  const [releases, setReleases] = useState([]);
  const [loadingReleases, setLoadingReleases] = useState(false);

  const toggleSet = (set, setter, val) =>
    setter(set.includes(val) ? set.filter(x => x !== val) : [...set, val]);

  useEffect(() => {
    if (tab !== "releases") return;
    setLoadingReleases(true);
    const mediaType = types.includes("Movies") ? "movie" : "tv";
    fetch(`${API_BASE}/releases?languages=${languages.join(",")}&platforms=${platforms.join(",")}&media_type=${mediaType}`)
      .then(r => r.json())
      .then(data => setReleases(data.releases || []))
      .catch(() => setReleases([]))
      .finally(() => setLoadingReleases(false));
  }, [tab, languages, platforms, types]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0f",
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      color: "#e2e8f0"
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg, #13131f 0%, #0a0a0f 100%)",
        borderBottom: "1px solid #1e1e2e", padding: "20px 0 0"
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 14,
              background: "linear-gradient(135deg, #7c3aed 0%, #e50914 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, boxShadow: "0 4px 20px rgba(124,58,237,0.4)"
            }}>🎬</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.3px", color: "#fff" }}>CineAlert</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>Track OTT releases · Get notified instantly</div>
            </div>
            {saved && (
              <div style={{
                marginLeft: "auto", fontSize: 12, color: "#4ade80",
                background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)",
                padding: "5px 14px", borderRadius: 999, fontWeight: 500
              }}>✓ Saved</div>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4 }}>
            {[
              { id: "prefs", label: "Preferences" },
              { id: "releases", label: "Upcoming" },
              { id: "alerts", label: "Alerts" },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "9px 20px", fontSize: 13, border: "none", borderRadius: "10px 10px 0 0",
                background: tab === t.id ? "#1a1a2e" : "transparent",
                color: tab === t.id ? "#a78bfa" : "#64748b",
                fontWeight: tab === t.id ? 600 : 400,
                cursor: "pointer", transition: "all 0.2s",
                borderBottom: tab === t.id ? "2px solid #7c3aed" : "2px solid transparent",
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 20px" }}>

        {/* PREFERENCES TAB */}
        {tab === "prefs" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Section title="Streaming Platforms">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {PLATFORMS.map(p => {
                  const on = platforms.includes(p.id);
                  return (
                    <button key={p.id} onClick={() => toggleSet(platforms, setPlatforms, p.id)} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px", borderRadius: 12,
                      border: on ? `1.5px solid ${p.color}40` : "1.5px solid #1e1e2e",
                      background: on ? p.bg : "#13131f",
                      cursor: "pointer", transition: "all 0.2s",
                      boxShadow: on ? `0 0 16px ${p.color}20` : "none",
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: on ? p.color : "#1e1e2e",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 800, color: on ? "#fff" : "#444",
                        flexShrink: 0, transition: "all 0.2s",
                      }}>{PLATFORM_ICONS[p.id]}</div>
                      <span style={{
                        fontSize: 13, fontWeight: on ? 600 : 400,
                        color: on ? "#fff" : "#64748b", transition: "color 0.2s"
                      }}>{p.label}</span>
                      {on && <div style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: p.color, flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="Languages">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {LANGUAGES.map(l => {
                  const on = languages.includes(l);
                  return (
                    <button key={l} onClick={() => toggleSet(languages, setLanguages, l)} style={{
                      padding: "7px 16px", borderRadius: 999,
                      border: on ? "1.5px solid #7c3aed" : "1.5px solid #1e1e2e",
                      background: on ? "rgba(124,58,237,0.15)" : "#13131f",
                      cursor: "pointer", fontSize: 13,
                      fontWeight: on ? 600 : 400,
                      color: on ? "#a78bfa" : "#64748b",
                      transition: "all 0.2s",
                      boxShadow: on ? "0 0 12px rgba(124,58,237,0.2)" : "none",
                    }}>{l}</button>
                  );
                })}
              </div>
            </Section>

            <Section title="Content Types">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {CONTENT_TYPES.map((ct, i) => {
                  const on = types.includes(ct);
                  const icons = ["🎬", "📺", "🎙️", "⛩️"];
                  return (
                    <button key={ct} onClick={() => toggleSet(types, setTypes, ct)} style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 18px", borderRadius: 10,
                      border: on ? "1.5px solid #3b82f6" : "1.5px solid #1e1e2e",
                      background: on ? "rgba(59,130,246,0.12)" : "#13131f",
                      cursor: "pointer", fontSize: 13,
                      fontWeight: on ? 600 : 400,
                      color: on ? "#60a5fa" : "#64748b",
                      transition: "all 0.2s",
                    }}><span>{icons[i]}</span>{ct}</button>
                  );
                })}
              </div>
            </Section>

            <button onClick={handleSave} style={{
              width: "100%", padding: "14px",
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              border: "none", borderRadius: 12, color: "#fff",
              fontSize: 15, fontWeight: 600, cursor: "pointer",
              boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
              transition: "opacity 0.2s", letterSpacing: "0.2px"
            }}>Save Preferences</button>
          </div>
        )}

        {/* UPCOMING RELEASES TAB */}
        {tab === "releases" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>{releases.length} titles for you</span>
              {loadingReleases && (
                <span style={{ fontSize: 12, color: "#7c3aed" }}>Loading…</span>
              )}
            </div>
            {releases.length === 0 && !loadingReleases ? (
              <div style={{
                textAlign: "center", padding: "3rem 2rem",
                background: "#13131f", borderRadius: 16,
                border: "1px solid #1e1e2e", color: "#64748b"
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🎬</div>
                <div style={{ fontSize: 14 }}>No matches. Adjust your preferences.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {releases.map((r, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 14, padding: "14px",
                    background: "#13131f", border: "1px solid #1e1e2e",
                    borderRadius: 14, transition: "border-color 0.2s",
                  }}>
                    {r.poster ? (
                      <img src={r.poster} alt={r.title} style={{ width: 48, height: 64, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 48, height: 64, borderRadius: 8, background: "#1e1e2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🎬</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, display: "flex", gap: 8 }}>
                        <span>{r.media_type}</span>
                        <span>·</span>
                        <span>{r.language}</span>
                        {r.rating ? <><span>·</span><span style={{ color: "#fbbf24" }}>★ {r.rating.toFixed(1)}</span></> : null}
                      </div>
                      {r.overview && <div style={{ fontSize: 12, color: "#475569", marginTop: 6, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.overview}</div>}
                    </div>
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "#94a3b8", background: "#1e1e2e", padding: "3px 8px", borderRadius: 6 }}>{r.release_date || "TBA"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ALERTS TAB */}
        {tab === "alerts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Section title="Notification Channels">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <AlertCard
                  icon="📬" title="Telegram" sub="Instant push notifications"
                  on={telegramOn} toggle={() => setTelegramOn(x => !x)}
                >
                  {telegramOn && (
                    <input value={chatId} onChange={e => setChatId(e.target.value)}
                      placeholder="Your Telegram chat ID"
                      style={inputStyle} />
                  )}
                </AlertCard>

                <AlertCard
                  icon="✉️" title="Email" sub="via Resend"
                  on={emailOn} toggle={() => setEmailOn(x => !x)}
                >
                  {emailOn && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <input value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        style={{ ...inputStyle, flex: 1 }} />
                      <select value={freq} onChange={e => setFreq(e.target.value)} style={{
                        ...inputStyle, width: "auto", paddingRight: 12
                      }}>
                        <option value="instant">Instant</option>
                        <option value="daily">Daily digest</option>
                        <option value="weekly">Weekly digest</option>
                      </select>
                    </div>
                  )}
                </AlertCard>
              </div>
            </Section>

            <Section title="Notify Me When">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <NotifyRow icon="🟢" title="New release drops" sub="Content is now available to stream" on={notifyNew} toggle={() => setNotifyNew(x => !x)} />
                <NotifyRow icon="🔜" title="Coming soon" sub="7 days before release" on={notifySoon} toggle={() => setNotifySoon(x => !x)} />
                <NotifyRow icon="🎞️" title="Trailer drops" sub="When official trailers release" on={notifyTrailer} toggle={() => setNotifyTrailer(x => !x)} />
              </div>
            </Section>

            <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#4a5568", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>.env snippet</div>
              <pre style={{ fontSize: 11, color: "#7c3aed", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{`MY_TELEGRAM_ID=${chatId || "your_chat_id"}
MY_EMAIL=${email || "you@email.com"}
MY_ALERT_FREQ=${freq}
MY_NOTIFY_NEW=${notifyNew}
MY_NOTIFY_SOON=${notifySoon}
MY_NOTIFY_TRAILER=${notifyTrailer}`}</pre>
            </div>

            <button onClick={handleSave} style={{
              width: "100%", padding: "14px",
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              border: "none", borderRadius: 12, color: "#fff",
              fontSize: 15, fontWeight: 600, cursor: "pointer",
              boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
            }}>Save Alert Settings</button>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "9px 12px",
  background: "#0a0a0f", border: "1px solid #2a2a3a",
  borderRadius: 8, color: "#e2e8f0", fontSize: 13, outline: "none",
};

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#4a5568", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function AlertCard({ icon, title, sub, on, toggle, children }) {
  return (
    <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "#1e1e2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>{title}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>{sub}</div>
        </div>
        <Toggle on={on} onChange={toggle} />
      </div>
      {children}
    </div>
  );
}

function NotifyRow({ icon, title, sub, on, toggle }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 12, padding: "12px 16px" }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#f1f5f9" }}>{title}</div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>{sub}</div>
      </div>
      <Toggle on={on} onChange={toggle} />
    </div>
  );
}
