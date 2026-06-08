import { useState } from "react";

const PLATFORMS = [
  { id: "netflix", label: "Netflix", color: "#e50914" },
  { id: "prime", label: "Prime Video", color: "#00a8e0" },
  { id: "disney", label: "Disney+", color: "#113ccf" },
  { id: "apple", label: "Apple TV+", color: "#333" },
  { id: "hbo", label: "HBO Max", color: "#6d00cc" },
  { id: "hotstar", label: "Hotstar", color: "#1f80e0" },
];

const LANGUAGES = ["English", "Hindi", "Dutch", "Tamil", "Telugu", "Korean", "Spanish", "Japanese", "French", "German"];

const CONTENT_TYPES = ["Movies", "Series", "Documentaries", "Anime"];

const SAMPLE_RELEASES = [
  { title: "Paatal Lok S2", platform: "prime", lang: "Hindi", type: "Series", date: "Jun 14", status: "new", emoji: "🔍" },
  { title: "Maharaj", platform: "netflix", lang: "Hindi", type: "Movie", date: "Jun 21", status: "soon", emoji: "⚔️" },
  { title: "House of the Dragon S3", platform: "hbo", lang: "English", type: "Series", date: "Jun 16", status: "new", emoji: "🐉" },
  { title: "Presumed Innocent S2", platform: "apple", lang: "English", type: "Series", date: "Jun 25", status: "soon", emoji: "⚖️" },
  { title: "IC 814: Kandahar Hijack", platform: "netflix", lang: "Hindi", type: "Series", date: "Jun 29", status: "soon", emoji: "✈️" },
  { title: "The Boys S5", platform: "prime", lang: "English", type: "Series", date: "Jul 4", status: "soon", emoji: "💥" },
];

function Toggle({ on, onChange }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 36, height: 20, borderRadius: 999, background: on ? "#1d9e75" : "#ccc",
        position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s"
      }}
    >
      <div style={{
        position: "absolute", width: 14, height: 14, borderRadius: "50%", background: "#fff",
        top: 3, left: on ? 19 : 3, transition: "left 0.2s"
      }} />
    </div>
  );
}

export default function StreamAlert() {
  const [tab, setTab] = useState("prefs");
  const [platforms, setPlatforms] = useState(["netflix", "prime", "hbo"]);
  const [languages, setLanguages] = useState(["English", "Hindi"]);
  const [types, setTypes] = useState(["Movies", "Series"]);
  const [telegramOn, setTelegramOn] = useState(true);
  const [emailOn, setEmailOn] = useState(true);
  const [chatId, setChatId] = useState("");
  const [email, setEmail] = useState("");
  const [freq, setFreq] = useState("Daily digest");
  const [notifyNew, setNotifyNew] = useState(true);
  const [notifySoon, setNotifySoon] = useState(true);
  const [notifyTrailer, setNotifyTrailer] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleSet = (set, setter, val) =>
    setter(set.includes(val) ? set.filter(x => x !== val) : [...set, val]);

  const getPlatform = (id) => PLATFORMS.find(p => p.id === id);

  const filteredReleases = SAMPLE_RELEASES.filter(
    r => platforms.includes(r.platform) && languages.includes(r.lang) && types.includes(r.type)
  );

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 520, margin: "0 auto", padding: "1.5rem 1rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.75rem" }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📡</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#0f172a" }}>StreamAlert</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>Track new OTT releases · Get notified instantly</div>
        </div>
        {saved && (
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#1d9e75", background: "#e1f5ee", padding: "4px 12px", borderRadius: 999 }}>✓ Saved!</div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", marginBottom: "1.5rem" }}>
        {["prefs", "releases", "alerts"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 18px", fontSize: 13, border: "none", background: "none",
            borderBottom: tab === t ? "2px solid #0f172a" : "2px solid transparent",
            color: tab === t ? "#0f172a" : "#64748b", fontWeight: tab === t ? 600 : 400,
            cursor: "pointer", marginBottom: -1, textTransform: "capitalize"
          }}>{t === "prefs" ? "Preferences" : t === "releases" ? "Upcoming" : "Alerts"}</button>
        ))}
      </div>

      {/* PREFERENCES TAB */}
      {tab === "prefs" && (
        <div>
          <Label>Streaming platforms</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "1.5rem" }}>
            {PLATFORMS.map(p => {
              const on = platforms.includes(p.id);
              return (
                <button key={p.id} onClick={() => toggleSet(platforms, setPlatforms, p.id)} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
                  borderRadius: 999, border: on ? `1.5px solid ${p.color}` : "1px solid #e2e8f0",
                  background: on ? p.color + "18" : "#fff", cursor: "pointer",
                  fontSize: 13, fontWeight: on ? 600 : 400, color: on ? p.color : "#64748b",
                  transition: "all 0.15s"
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color }} />
                  {p.label}
                </button>
              );
            })}
          </div>

          <Label>Languages</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "1.5rem" }}>
            {LANGUAGES.map(l => {
              const on = languages.includes(l);
              return (
                <button key={l} onClick={() => toggleSet(languages, setLanguages, l)} style={{
                  padding: "5px 14px", borderRadius: 999,
                  border: on ? "1.5px solid #1d9e75" : "1px solid #e2e8f0",
                  background: on ? "#e1f5ee" : "#fff", cursor: "pointer",
                  fontSize: 13, fontWeight: on ? 600 : 400, color: on ? "#0f6e56" : "#64748b",
                  transition: "all 0.15s"
                }}>{l}</button>
              );
            })}
          </div>

          <Label>Content types</Label>
          <div style={{ display: "flex", gap: 8, marginBottom: "1.75rem", flexWrap: "wrap" }}>
            {CONTENT_TYPES.map(ct => {
              const on = types.includes(ct);
              return (
                <button key={ct} onClick={() => toggleSet(types, setTypes, ct)} style={{
                  padding: "7px 18px", borderRadius: 8,
                  border: on ? "1.5px solid #3b82f6" : "1px solid #e2e8f0",
                  background: on ? "#eff6ff" : "#f8fafc", cursor: "pointer",
                  fontSize: 13, fontWeight: on ? 600 : 400, color: on ? "#1d4ed8" : "#64748b",
                  transition: "all 0.15s"
                }}>{ct}</button>
              );
            })}
          </div>

          <SaveBtn onClick={handleSave}>Save preferences</SaveBtn>
        </div>
      )}

      {/* UPCOMING RELEASES TAB */}
      {tab === "releases" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>{filteredReleases.length} titles matching your preferences</span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>Demo data — TMDB live in backend</span>
          </div>
          {filteredReleases.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8", fontSize: 14 }}>No matches. Adjust platforms or languages.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredReleases.map((r, i) => {
                const plat = getPlatform(r.platform);
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                    background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
                    transition: "border-color 0.15s"
                  }}>
                    <div style={{ width: 42, height: 56, borderRadius: 6, background: plat.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{r.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: plat.color }} />
                        {r.type} · {r.lang}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 999, fontWeight: 600,
                        background: r.status === "new" ? "#dcfce7" : "#fef9c3",
                        color: r.status === "new" ? "#166534" : "#854d0e"
                      }}>{r.status === "new" ? "New" : "Soon"}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{r.date}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ALERTS TAB */}
      {tab === "alerts" && (
        <div>
          <Label>Channels</Label>
          <Card>
            <AlertRow icon="📬" title="Telegram" sub="Instant push alerts" on={telegramOn} toggle={() => setTelegramOn(x => !x)} />
            {telegramOn && (
              <input value={chatId} onChange={e => setChatId(e.target.value)}
                placeholder="Your Telegram chat ID or @username"
                style={{ width: "100%", marginTop: 8, padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }} />
            )}
          </Card>
          <Card style={{ marginTop: 10 }}>
            <AlertRow icon="✉️" title="Email" sub="Digest or instant" on={emailOn} toggle={() => setEmailOn(x => !x)} />
            {emailOn && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }} />
                <select value={freq} onChange={e => setFreq(e.target.value)}
                  style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, background: "#fff", cursor: "pointer" }}>
                  <option>Instant</option>
                  <option>Daily digest</option>
                  <option>Weekly digest</option>
                </select>
              </div>
            )}
          </Card>

          <Label style={{ marginTop: "1.5rem" }}>Notify me when</Label>
          <Card>
            <AlertRow icon="🟢" title="New release drops" sub="Content is now available to stream" on={notifyNew} toggle={() => setNotifyNew(x => !x)} />
            <div style={{ height: 10 }} />
            <AlertRow icon="🔜" title="Coming soon (7 days before)" sub="Advance notice before release" on={notifySoon} toggle={() => setNotifySoon(x => !x)} />
            <div style={{ height: 10 }} />
            <AlertRow icon="🎬" title="Trailer drops" sub="When official trailers are released" on={notifyTrailer} toggle={() => setNotifyTrailer(x => !x)} />
          </Card>

          <SaveBtn onClick={handleSave} style={{ marginTop: "1.5rem" }}>Save alert settings</SaveBtn>
        </div>
      )}
    </div>
  );
}

function Label({ children, style }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10, ...style }}>{children}</div>;
}
function Card({ children, style }) {
  return <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 16px", ...style }}>{children}</div>;
}
function AlertRow({ icon, title, sub, on, toggle }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Toggle on={on} onChange={toggle} />
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>{icon} {title}</div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>{sub}</div>
      </div>
    </div>
  );
}
function SaveBtn({ children, onClick, style }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: "11px", borderRadius: 10, border: "none",
      background: "#0f172a", color: "#fff", fontSize: 14, fontWeight: 600,
      cursor: "pointer", ...style
    }}>{children} →</button>
  );
}
