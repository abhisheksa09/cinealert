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

const PLATFORM_META = {
  netflix:  { label: "Netflix",     color: "#e50914", icon: "N", logo: "https://www.google.com/s2/favicons?sz=64&domain=netflix.com" },
  prime:    { label: "Prime Video", color: "#00a8e0", icon: "▶", logo: "https://www.google.com/s2/favicons?sz=64&domain=primevideo.com" },
  disney:   { label: "Disney+",     color: "#4a90e2", icon: "D+", logo: "https://www.google.com/s2/favicons?sz=64&domain=disneyplus.com" },
  apple:    { label: "Apple TV+",   color: "#a0a0a0", icon: "🍎", logo: "https://www.google.com/s2/favicons?sz=64&domain=tv.apple.com" },
  hbo:      { label: "HBO Max",     color: "#a855f7", icon: "H", logo: "https://www.google.com/s2/favicons?sz=64&domain=max.com" },
  hotstar:  { label: "Jio Hotstar", color: "#1d9bf0", icon: "★", logo: "https://www.google.com/s2/favicons?sz=64&domain=jiohotstar.com" },
  zee5:     { label: "Zee5",        color: "#9b59b6", icon: "Z", logo: "https://www.google.com/s2/favicons?sz=64&domain=zee5.com" },
  sonyliv:  { label: "SonyLIV",     color: "#ff4757", icon: "S", logo: "https://www.google.com/s2/favicons?sz=64&domain=sonyliv.com" },
};

const LANGUAGES = ["Kannada", "Hindi", "English", "Telugu", "Malayalam", "Tamil", "Korean"];
const CONTENT_TYPES = ["Movies", "Series", "Documentaries", "Anime"];

const LANG_CODES = {
  en: "English", hi: "Hindi", ta: "Tamil", te: "Telugu",
  kn: "Kannada", ko: "Korean", ja: "Japanese", ml: "Malayalam",
};

const GENRE_MAP = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance",
  878: "Sci-Fi", 53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
  10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics",
};

// Reverse lookup: display name OR key → PLATFORM_META entry
const PLATFORM_BY_NAME = Object.fromEntries(
  Object.entries(PLATFORM_META).flatMap(([key, meta]) => [
    [key, meta],
    [meta.label.toLowerCase(), meta],
    [meta.label, meta],
  ])
);

const THEMES = {
  dark: {
    bg: "#0a0a0f",
    headerBg: "linear-gradient(180deg, #13131f 0%, #0a0a0f 100%)",
    headerBorder: "#1e1e2e",
    cardBg: "#13131f",
    cardBorder: "#1e1e2e",
    sectionBg: "#13131f",
    inputBg: "#0a0a0f",
    inputBorder: "#2a2a3a",
    text: "#e2e8f0",
    textMuted: "#64748b",
    textSecondary: "#94a3b8",
    tabActive: "#1a1a2e",
    tabActiveBorder: "#7c3aed",
    tabActiveColor: "#a78bfa",
    tabInactiveColor: "#64748b",
    pillBg: "#1e1e2e",
    pillText: "#a78bfa",
    pillBorder: "#2d2d4e",
    dateBg: "#1e1e2e",
    toggleOff: "#2a2a3a",
    sectionLabel: "#4a5568",
    iconBg: "#1e1e2e",
    preText: "#7c3aed",
    preBg: "#13131f",
    preBorder: "#1e1e2e",
  },
  light: {
    bg: "#f4f6fb",
    headerBg: "linear-gradient(180deg, #ffffff 0%, #f4f6fb 100%)",
    headerBorder: "#e2e8f0",
    cardBg: "#ffffff",
    cardBorder: "#e2e8f0",
    sectionBg: "#ffffff",
    inputBg: "#f8fafc",
    inputBorder: "#cbd5e1",
    text: "#1e293b",
    textMuted: "#94a3b8",
    textSecondary: "#64748b",
    tabActive: "#f0f4ff",
    tabActiveBorder: "#7c3aed",
    tabActiveColor: "#6d28d9",
    tabInactiveColor: "#94a3b8",
    pillBg: "#ede9fe",
    pillText: "#6d28d9",
    pillBorder: "#c4b5fd",
    dateBg: "#f1f5f9",
    toggleOff: "#cbd5e1",
    sectionLabel: "#94a3b8",
    iconBg: "#f1f5f9",
    preText: "#7c3aed",
    preBg: "#faf5ff",
    preBorder: "#e9d5ff",
  },
};

function Toggle({ on, onChange, theme }) {
  const t = THEMES[theme];
  return (
    <div onClick={onChange} style={{
      width: 44, height: 24, borderRadius: 999,
      background: on ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : t.toggleOff,
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

function PlatformBadge({ platformKey }) {
  const meta = PLATFORM_BY_NAME[platformKey] || PLATFORM_BY_NAME[platformKey?.toLowerCase()] || {
    label: platformKey, color: "#7c3aed", icon: "?"
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
      background: meta.color + "22",
      color: meta.color,
      border: `1px solid ${meta.color}55`,
      letterSpacing: "0.02em",
    }}>
      <span style={{ fontSize: 9 }}>{meta.icon}</span>
      {meta.label}
    </span>
  );
}

const STORAGE_KEY = "cinealert_prefs";

async function fetchWithRetry(url, retries = 3, delayMs = 20000) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return r.json();
    } catch {}
    if (i < retries - 1) await new Promise(res => setTimeout(res, delayMs));
  }
  return null;
}

function loadPrefs() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

export default function CineAlert() {
  const saved = loadPrefs();
  const [theme, setTheme] = useState(saved?.theme || "dark");
  const [tab, setTab] = useState("prefs");
  const [platforms, setPlatforms] = useState(saved?.platforms || ["netflix", "prime", "hbo", "hotstar", "zee5", "sonyliv"]);
  const [languages, setLanguages] = useState(saved?.languages || ["Kannada", "Hindi", "English"]);
  const [types, setTypes] = useState(saved?.types || ["Movies", "Series", "Documentaries", "Anime"]);
  const [telegramOn, setTelegramOn] = useState(saved?.telegramOn ?? true);
  const [emailOn, setEmailOn] = useState(saved?.emailOn ?? true);
  const [chatId, setChatId] = useState(saved?.chatId || "");
  const [email, setEmail] = useState(saved?.email || "");
  const [freq, setFreq] = useState(saved?.freq || "instant");
  const [notifyNew, setNotifyNew] = useState(saved?.notifyNew ?? true);
  const [notifySoon, setNotifySoon] = useState(saved?.notifySoon ?? true);
  const [notifyTrailer, setNotifyTrailer] = useState(saved?.notifyTrailer ?? false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [releases, setReleases] = useState([]);
  const [loadingReleases, setLoadingReleases] = useState(false);

  // Upcoming tab filters
  const [filterLangs, setFilterLangs] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [filterSort, setFilterSort] = useState("date");
  const [filterSearch, setFilterSearch] = useState("");

  // Released tab
  const [released, setReleased] = useState([]);
  const [loadingReleased, setLoadingReleased] = useState(false);
  const [rFilterLangs, setRFilterLangs] = useState([]);
  const [rFilterPlatforms, setRFilterPlatforms] = useState([]);
  const [rFilterType, setRFilterType] = useState("all");
  const [rFilterSort, setRFilterSort] = useState("date");
  const [rFilterSearch, setRFilterSearch] = useState("");
  const [rFilterOpen, setRFilterOpen] = useState(false);
  const [collapsedYears, setCollapsedYears] = useState({});

  const t = THEMES[theme];
  const isDark = theme === "dark";

  const toggleSet = (set, setter, val) =>
    setter(set.includes(val) ? set.filter(x => x !== val) : [...set, val]);

  useEffect(() => {
    if (tab !== "releases") return;
    setLoadingReleases(true);
    const mediaType = types.includes("Movies") ? "movie" : "tv";
    fetchWithRetry(`${API_BASE}/releases?languages=${languages.join(",")}&platforms=${platforms.join(",")}&media_type=${mediaType}`)
      .then(data => setReleases(data?.releases || []))
      .finally(() => setLoadingReleases(false));
  }, [tab, languages, platforms, types]);

  useEffect(() => {
    if (tab !== "released") return;
    setLoadingReleased(true);
    const mediaType = types.includes("Movies") ? "movie" : "tv";
    fetchWithRetry(`${API_BASE}/released?languages=${languages.join(",")}&media_type=${mediaType}&from_year=2020`)
      .then(data => setReleased(data?.releases || []))
      .finally(() => setLoadingReleased(false));
  }, [tab, languages, types]);

  const handleSave = () => {
    const prefs = {
      theme, platforms, languages, types,
      telegramOn, emailOn, chatId, email, freq,
      notifyNew, notifySoon, notifyTrailer,
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch {}
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2500);
  };

  const inputStyle = {
    width: "100%", padding: "9px 12px",
    background: t.inputBg, border: `1px solid ${t.inputBorder}`,
    borderRadius: 8, color: t.text, fontSize: 13, outline: "none",
  };

  return (
    <div style={{
      minHeight: "100vh", background: t.bg,
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      color: t.text, transition: "background 0.3s, color 0.3s"
    }}>
      {/* Header */}
      <div style={{
        background: t.headerBg,
        borderBottom: `1px solid ${t.headerBorder}`, padding: "20px 0 0"
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
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.3px", color: isDark ? "#fff" : "#1e293b" }}>CineAlert</div>
              <div style={{ fontSize: 12, color: t.textMuted, marginTop: 1 }}>Discover what's showing &amp; streaming</div>
            </div>

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              {saveFlash && (
                <div style={{
                  fontSize: 12, color: "#4ade80",
                  background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)",
                  padding: "5px 14px", borderRadius: 999, fontWeight: 500
                }}>✓ Saved</div>
              )}
              {/* Theme toggle */}
              <button onClick={() => {
                const next = isDark ? "light" : "dark";
                setTheme(next);
                try {
                  const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
                  localStorage.setItem(STORAGE_KEY, JSON.stringify({...p, theme: next}));
                } catch {}
              }} style={{
                width: 36, height: 36, borderRadius: 10, border: `1px solid ${t.headerBorder}`,
                background: t.iconBg, cursor: "pointer", fontSize: 17,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: t.text, transition: "all 0.2s"
              }} title="Toggle theme">
                {isDark ? "☀️" : "🌙"}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4 }}>
            {[
              { id: "prefs",    label: "Preferences" },
              { id: "releases", label: "Upcoming" },
              { id: "released", label: "Releases" },
              { id: "alerts",   label: "Alerts" },
            ].map(tab_ => (
              <button key={tab_.id} onClick={() => setTab(tab_.id)} style={{
                padding: "9px 20px", fontSize: 13, border: "none", borderRadius: "10px 10px 0 0",
                background: tab === tab_.id ? t.tabActive : "transparent",
                color: tab === tab_.id ? t.tabActiveColor : t.tabInactiveColor,
                fontWeight: tab === tab_.id ? 600 : 400,
                cursor: "pointer", transition: "all 0.2s",
                borderBottom: tab === tab_.id ? `2px solid ${t.tabActiveBorder}` : "2px solid transparent",
              }}>{tab_.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 20px" }}>

        {/* PREFERENCES TAB */}
        {tab === "prefs" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Section title="Streaming Platforms" t={t}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {PLATFORMS.map(p => {
                  const on = platforms.includes(p.id);
                  return (
                    <button key={p.id} onClick={() => toggleSet(platforms, setPlatforms, p.id)} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px", borderRadius: 12,
                      border: "none",
                      background: on ? (isDark ? p.bg : p.color + "18") : t.cardBg,
                      cursor: "pointer", transition: "all 0.2s",
                      boxShadow: on ? `0 0 0 1.5px ${p.color}60, 0 2px 8px ${p.color}20` : `0 0 0 1px ${t.cardBorder}`,
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: on ? p.color : t.iconBg,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, transition: "all 0.2s", overflow: "hidden",
                      }}>
                        {PLATFORM_META[p.id]?.logo
                          ? <img src={PLATFORM_META[p.id].logo} alt={p.label} style={{ width: 20, height: 20, objectFit: "contain", borderRadius: 4 }} />
                          : <span style={{ fontSize: 13, fontWeight: 800, color: on ? "#fff" : t.textMuted }}>{PLATFORM_META[p.id]?.icon}</span>
                        }
                      </div>
                      <span style={{
                        fontSize: 13, fontWeight: on ? 600 : 400,
                        color: on ? (isDark ? "#fff" : "#1e293b") : t.textMuted, transition: "color 0.2s"
                      }}>{p.label}</span>
                      {on && <div style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: p.color, flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="Languages" t={t}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {LANGUAGES.map(l => {
                  const on = languages.includes(l);
                  return (
                    <button key={l} onClick={() => toggleSet(languages, setLanguages, l)} style={{
                      padding: "7px 16px", borderRadius: 999,
                      border: on ? "1.5px solid #7c3aed" : `1.5px solid ${t.cardBorder}`,
                      background: on ? "#7c3aed" : t.cardBg,
                      cursor: "pointer", fontSize: 13,
                      fontWeight: on ? 600 : 400,
                      color: on ? "#fff" : t.textMuted,
                      transition: "all 0.2s",
                      boxShadow: on ? "0 0 12px rgba(124,58,237,0.2)" : "none",
                    }}>{l}</button>
                  );
                })}
              </div>
            </Section>

            <Section title="Content Types" t={t}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {CONTENT_TYPES.map((ct, i) => {
                  const on = types.includes(ct);
                  const icons = ["🎬", "📺", "🎙️", "⛩️"];
                  return (
                    <button key={ct} onClick={() => toggleSet(types, setTypes, ct)} style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 18px", borderRadius: 10,
                      border: "none",
                      background: on ? (isDark ? "#1e3a5f" : "#dbeafe") : t.cardBg,
                      cursor: "pointer", fontSize: 13,
                      fontWeight: on ? 600 : 400,
                      color: on ? (isDark ? "#93c5fd" : "#1d4ed8") : t.textMuted,
                      transition: "all 0.2s",
                      boxShadow: on ? `0 0 0 1.5px #3b82f660, 0 2px 6px #3b82f620` : `0 0 0 1px ${t.cardBorder}`,
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
        {tab === "releases" && (() => {
          // Show all user-selected languages + any extra languages found in results
          const resultLangs = releases.map(r => {
            const code = r.language || r.original_language;
            return code ? (LANG_CODES[code] || code.toUpperCase()) : null;
          }).filter(Boolean);
          const availLangs = [...new Set([...languages, ...resultLangs])].sort();

          // Client-side filter + sort
          const filtered = releases
            .filter(r => {
              if (filterSearch) {
                const q = filterSearch.toLowerCase();
                if (!(r.title || "").toLowerCase().includes(q) &&
                    !(r.overview || "").toLowerCase().includes(q)) return false;
              }
              if (filterType !== "all" && r.media_type !== filterType) return false;
              if (filterLangs.length > 0) {
                const code = r.language || r.original_language || "";
                const label = LANG_CODES[code] || code.toUpperCase();
                if (!filterLangs.includes(label)) return false;
              }
              return true;
            })
            .slice()
            .sort((a, b) => {
              if (filterSort === "rating") return (b.rating || 0) - (a.rating || 0);
              return (a.release_date || "9999") < (b.release_date || "9999") ? -1 : 1;
            });

          const hasActiveFilter = filterSearch || filterType !== "all" || filterLangs.length > 0;

          return (
            <div>
              {/* ── Filter bar ── */}
              <div style={{
                background: t.cardBg, border: `1px solid ${t.cardBorder}`,
                borderRadius: 14, padding: "12px 14px", marginBottom: 14,
                display: "flex", flexDirection: "column", gap: 10,
              }}>
                {/* Search */}
                <div style={{ position: "relative" }}>
                  <span style={{
                    position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                    fontSize: 14, color: t.textMuted, pointerEvents: "none"
                  }}>🔍</span>
                  <input
                    value={filterSearch}
                    onChange={e => setFilterSearch(e.target.value)}
                    placeholder="Search titles…"
                    style={{
                      width: "100%", padding: "8px 10px 8px 32px",
                      background: t.inputBg, border: `1px solid ${t.inputBorder}`,
                      borderRadius: 8, color: t.text, fontSize: 13, outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  {filterSearch && (
                    <button onClick={() => setFilterSearch("")} style={{
                      position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      color: t.textMuted, fontSize: 14, lineHeight: 1,
                    }}>✕</button>
                  )}
                </div>

                {/* Row 2: type + sort */}
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  {[
                    { val: "all",   label: "All" },
                    { val: "movie", label: "🎬 Movies" },
                    { val: "tv",    label: "📺 Series" },
                  ].map(opt => (
                    <button key={opt.val} onClick={() => setFilterType(opt.val)} style={{
                      padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: filterType === opt.val ? 700 : 400,
                      border: filterType === opt.val ? "1.5px solid #7c3aed" : `1.5px solid ${t.cardBorder}`,
                      background: filterType === opt.val ? "#7c3aed" : t.inputBg,
                      color: filterType === opt.val ? "#fff" : t.textMuted,
                      cursor: "pointer", transition: "all 0.18s",
                    }}>{opt.label}</button>
                  ))}

                  <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    {[
                      { val: "date",   label: "📅 Date" },
                      { val: "rating", label: "⭐ Rating" },
                    ].map(opt => (
                      <button key={opt.val} onClick={() => setFilterSort(opt.val)} style={{
                        padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: filterSort === opt.val ? 700 : 400,
                        border: filterSort === opt.val ? `1.5px solid #4f46e5` : `1.5px solid ${t.cardBorder}`,
                        background: filterSort === opt.val ? "#4f46e5" : t.inputBg,
                        color: filterSort === opt.val ? "#fff" : t.textMuted,
                        cursor: "pointer", transition: "all 0.18s",
                      }}>{opt.label}</button>
                    ))}
                  </div>
                </div>

                {/* Row 3: language chips (only show languages present in results) */}
                {availLangs.length > 1 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {availLangs.map(lang => {
                      const on = filterLangs.includes(lang);
                      return (
                        <button key={lang} onClick={() =>
                          setFilterLangs(on ? filterLangs.filter(l => l !== lang) : [...filterLangs, lang])
                        } style={{
                          padding: "4px 11px", borderRadius: 999, fontSize: 11, fontWeight: on ? 700 : 400,
                          border: on ? "1.5px solid #0ea5e9" : `1.5px solid ${t.cardBorder}`,
                          background: on ? "#0ea5e9" : t.inputBg,
                          color: on ? "#fff" : t.textMuted,
                          cursor: "pointer", transition: "all 0.18s",
                        }}>{lang}</button>
                      );
                    })}
                    {filterLangs.length > 0 && (
                      <button onClick={() => setFilterLangs([])} style={{
                        padding: "4px 11px", borderRadius: 999, fontSize: 11,
                        border: `1.5px solid ${t.cardBorder}`, background: "none",
                        color: "#f87171", cursor: "pointer",
                      }}>✕ Clear</button>
                    )}
                  </div>
                )}
              </div>

              {/* ── Results count ── */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: t.textMuted }}>
                  {loadingReleases ? "Loading…" : `${filtered.length}${hasActiveFilter ? ` of ${releases.length}` : ""} titles`}
                </span>
                {hasActiveFilter && (
                  <button onClick={() => { setFilterSearch(""); setFilterType("all"); setFilterLangs([]); }} style={{
                    fontSize: 11, color: "#f87171", background: "none", border: "none", cursor: "pointer", padding: 0
                  }}>✕ Clear all filters</button>
                )}
              </div>

              {/* ── Cards ── */}
              {filtered.length === 0 && !loadingReleases ? (
                <div style={{
                  textAlign: "center", padding: "3rem 2rem",
                  background: t.cardBg, borderRadius: 16,
                  border: `1px solid ${t.cardBorder}`, color: t.textMuted
                }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                  <div style={{ fontSize: 14 }}>No results match your filters.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {filtered.map((r, i) => {
                    const code = r.language || r.original_language;
                    const langLabel = code ? (LANG_CODES[code] || code.toUpperCase()) : null;

                    return (
                      <a key={i} href={r.tmdb_url} target="_blank" rel="noreferrer" style={{
                        display: "flex", gap: 14, padding: "14px",
                        background: t.cardBg, border: `1px solid ${t.cardBorder}`,
                        borderRadius: 14, transition: "border-color 0.2s, box-shadow 0.2s",
                        textDecoration: "none", cursor: "pointer",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#7c3aed"; e.currentTarget.style.boxShadow = "0 0 0 1px #7c3aed22"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = t.cardBorder; e.currentTarget.style.boxShadow = "none"; }}
                      >
                        {r.poster ? (
                          <img src={r.poster} alt={r.title} style={{ width: 48, height: 64, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 48, height: 64, borderRadius: 8, background: t.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🎬</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: isDark ? "#f1f5f9" : "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
                          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <span style={{ textTransform: "capitalize" }}>{r.media_type}</span>
                            {r.rating ? <><span>·</span><span style={{ color: "#fbbf24" }}>★ {r.rating.toFixed(1)}</span></> : null}
                            {langLabel && (
                              <>
                                <span>·</span>
                                <span style={{
                                  fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
                                  background: isDark ? "#1e293b" : "#f1f5f9",
                                  color: isDark ? "#94a3b8" : "#64748b",
                                  border: `1px solid ${t.cardBorder}`,
                                }}>{langLabel}</span>
                              </>
                            )}
                          </div>
                          {r.genre_ids && r.genre_ids.length > 0 && (
                            <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
                              {r.genre_ids.slice(0, 3).map(gid => GENRE_MAP[gid]).filter(Boolean).map(g => (
                                <span key={g} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: isDark ? "#1e1e35" : "#ede9fe", color: isDark ? "#a78bfa" : "#7c3aed", fontWeight: 500 }}>{g}</span>
                              ))}
                            </div>
                          )}
                          {r.platforms && r.platforms.length > 0 && (
                            <div style={{ display: "flex", gap: 5, marginTop: 7, flexWrap: "wrap" }}>
                              {r.platforms.map(p => <PlatformBadge key={p} platformKey={p} />)}
                            </div>
                          )}
                          {r.overview && <div style={{ fontSize: 12, color: t.textMuted, marginTop: 6, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.overview}</div>}
                        </div>
                        <div style={{ flexShrink: 0, textAlign: "right" }}>
                          <div style={{ fontSize: 11, color: t.textSecondary, background: t.dateBg, padding: "3px 8px", borderRadius: 6 }}>{r.release_date || "TBA"}</div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* RELEASED TAB */}
        {tab === "released" && (() => {
          const resultLangs = released.map(r => {
            const code = r.language || r.original_language;
            return code ? (LANG_CODES[code] || code.toUpperCase()) : null;
          }).filter(Boolean);
          const availLangs = [...new Set([...languages, ...resultLangs])].sort();

          const filtered = released
            .filter(r => {
              if (rFilterSearch) {
                const q = rFilterSearch.toLowerCase();
                if (!(r.title || "").toLowerCase().includes(q) &&
                    !(r.overview || "").toLowerCase().includes(q)) return false;
              }
              if (rFilterType !== "all" && r.media_type !== rFilterType) return false;
              if (rFilterLangs.length > 0) {
                const code = r.language || r.original_language || "";
                const label = LANG_CODES[code] || code.toUpperCase();
                if (!rFilterLangs.includes(label)) return false;
              }
              if (rFilterPlatforms.length > 0) {
                if (!rFilterPlatforms.some(p => (r.platforms || []).includes(p))) return false;
              }
              return true;
            })
            .slice()
            .sort((a, b) => {
              if (rFilterSort === "rating") return (b.rating || 0) - (a.rating || 0);
              return (a.release_date || "9999") > (b.release_date || "9999") ? -1 : 1; // newest first
            });

          // Group by year
          const byYear = {};
          filtered.forEach(r => {
            const yr = (r.release_date || "").slice(0, 4) || "Unknown";
            if (!byYear[yr]) byYear[yr] = [];
            byYear[yr].push(r);
          });
          const years = Object.keys(byYear).sort((a, b) => b - a); // 2026 → 2020

          const hasActiveFilter = rFilterSearch || rFilterType !== "all" || rFilterLangs.length > 0 || rFilterPlatforms.length > 0;

          return (
            <div>
              {/* Filter bar */}
              <div style={{
                background: t.cardBg, border: `1px solid ${t.cardBorder}`,
                borderRadius: 14, padding: "12px 14px", marginBottom: 14,
                display: "flex", flexDirection: "column", gap: 10,
              }}>
                {/* Search */}
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: t.textMuted, pointerEvents: "none" }}>🔍</span>
                  <input value={rFilterSearch} onChange={e => setRFilterSearch(e.target.value)}
                    placeholder="Search titles…"
                    style={{ width: "100%", padding: "8px 10px 8px 32px", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, color: t.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                  {rFilterSearch && (
                    <button onClick={() => setRFilterSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: t.textMuted, fontSize: 14 }}>✕</button>
                  )}
                </div>

                {/* Type + Sort + Filters button row */}
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  {[{ val: "all", label: "All" }, { val: "movie", label: "🎬 Movies" }, { val: "tv", label: "📺 Series" }].map(opt => (
                    <button key={opt.val} onClick={() => setRFilterType(opt.val)} style={{
                      padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: rFilterType === opt.val ? 700 : 400,
                      border: rFilterType === opt.val ? "1.5px solid #7c3aed" : `1.5px solid ${t.cardBorder}`,
                      background: rFilterType === opt.val ? "#7c3aed" : t.inputBg,
                      color: rFilterType === opt.val ? "#fff" : t.textMuted, cursor: "pointer", transition: "all 0.18s",
                    }}>{opt.label}</button>
                  ))}
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
                    {[{ val: "date", label: "📅 Date" }, { val: "rating", label: "⭐ Rating" }].map(opt => (
                      <button key={opt.val} onClick={() => setRFilterSort(opt.val)} style={{
                        padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: rFilterSort === opt.val ? 700 : 400,
                        border: rFilterSort === opt.val ? "1.5px solid #4f46e5" : `1.5px solid ${t.cardBorder}`,
                        background: rFilterSort === opt.val ? "#4f46e5" : t.inputBg,
                        color: rFilterSort === opt.val ? "#fff" : t.textMuted, cursor: "pointer", transition: "all 0.18s",
                      }}>{opt.label}</button>
                    ))}
                    {/* Filters dropdown button */}
                    <button onClick={() => setRFilterOpen(o => !o)} style={{
                      padding: "5px 12px", borderRadius: 999, fontSize: 12, display: "flex", alignItems: "center", gap: 5,
                      border: (rFilterLangs.length > 0 || rFilterPlatforms.length > 0) ? "1.5px solid #0ea5e9" : `1.5px solid ${t.cardBorder}`,
                      background: (rFilterLangs.length > 0 || rFilterPlatforms.length > 0) ? "#0ea5e920" : t.inputBg,
                      color: (rFilterLangs.length > 0 || rFilterPlatforms.length > 0) ? "#0ea5e9" : t.textMuted,
                      cursor: "pointer", transition: "all 0.18s", fontWeight: 500,
                    }}>
                      ⚙ Filters
                      {(rFilterLangs.length + rFilterPlatforms.length) > 0 && (
                        <span style={{ background: "#0ea5e9", color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>
                          {rFilterLangs.length + rFilterPlatforms.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Collapsible filter panel */}
                {rFilterOpen && (
                  <div style={{ borderTop: `1px solid ${t.cardBorder}`, paddingTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Language */}
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>Language</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {availLangs.map(lang => {
                          const on = rFilterLangs.includes(lang);
                          return (
                            <button key={lang} onClick={() => setRFilterLangs(on ? rFilterLangs.filter(l => l !== lang) : [...rFilterLangs, lang])} style={{
                              padding: "4px 11px", borderRadius: 999, fontSize: 11, fontWeight: on ? 700 : 400,
                              border: "none",
                              background: on ? (isDark ? "#0c3547" : "#e0f2fe") : t.inputBg,
                              color: on ? (isDark ? "#38bdf8" : "#0369a1") : t.textMuted, cursor: "pointer", transition: "all 0.18s",
                              boxShadow: on ? "0 0 0 1.5px #0ea5e980" : `0 0 0 1px ${t.cardBorder}`,
                            }}>{lang}</button>
                          );
                        })}
                      </div>
                    </div>
                    {/* Platform */}
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>Platform</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {PLATFORMS.map(p => {
                          const on = rFilterPlatforms.includes(p.id);
                          const meta = PLATFORM_META[p.id];
                          return (
                            <button key={p.id} onClick={() => setRFilterPlatforms(on ? rFilterPlatforms.filter(x => x !== p.id) : [...rFilterPlatforms, p.id])} style={{
                              padding: "4px 11px", borderRadius: 999, fontSize: 11, fontWeight: on ? 700 : 400,
                              border: "none",
                              background: on ? (isDark ? p.bg : p.color + "18") : t.inputBg,
                              color: on ? (isDark ? "#fff" : p.color) : t.textMuted, cursor: "pointer", transition: "all 0.18s",
                              display: "flex", alignItems: "center", gap: 4,
                              boxShadow: on ? `0 0 0 1.5px ${p.color}80` : `0 0 0 1px ${t.cardBorder}`,
                            }}>
                              {meta?.logo
                                ? <img src={meta.logo} alt="" style={{ width: 12, height: 12, objectFit: "contain", borderRadius: 2 }} />
                                : <span style={{ fontSize: 10, fontWeight: 800 }}>{meta?.icon}</span>
                              }
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {(rFilterLangs.length > 0 || rFilterPlatforms.length > 0) && (
                      <button onClick={() => { setRFilterLangs([]); setRFilterPlatforms([]); }} style={{ alignSelf: "flex-start", padding: "4px 11px", borderRadius: 999, fontSize: 11, border: `1.5px solid ${t.cardBorder}`, background: "none", color: "#f87171", cursor: "pointer" }}>✕ Clear all filters</button>
                    )}
                  </div>
                )}
              </div>

              {/* Count row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: t.textMuted }}>
                  {loadingReleased ? "Loading…" : `${filtered.length}${hasActiveFilter ? ` of ${released.length}` : ""} titles`}
                </span>
                {hasActiveFilter && (
                  <button onClick={() => { setRFilterSearch(""); setRFilterType("all"); setRFilterLangs([]); setRFilterPlatforms([]); }} style={{ fontSize: 11, color: "#f87171", background: "none", border: "none", cursor: "pointer", padding: 0 }}>✕ Clear all</button>
                )}
              </div>

              {/* Empty state */}
              {filtered.length === 0 && !loadingReleased ? (
                <div style={{ textAlign: "center", padding: "3rem 2rem", background: t.cardBg, borderRadius: 16, border: `1px solid ${t.cardBorder}`, color: t.textMuted }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🎬</div>
                  <div style={{ fontSize: 14 }}>No results match your filters.</div>
                </div>
              ) : (
                /* Grouped by year */
                years.map(yr => (
                  <div key={yr} style={{ marginBottom: 24 }}>
                    {/* Year header */}
                    <div onClick={() => setCollapsedYears(prev => ({ ...prev, [yr]: !prev[yr] }))} style={{
                      display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer", userSelect: "none",
                    }}>
                      <div style={{
                        fontSize: 18, fontWeight: 800, color: isDark ? "#fff" : "#1e293b",
                        letterSpacing: "-0.5px",
                      }}>{yr}</div>
                      <div style={{ flex: 1, height: 1, background: t.cardBorder }} />
                      <div style={{ fontSize: 11, color: t.textMuted, background: t.dateBg, padding: "2px 8px", borderRadius: 6 }}>{byYear[yr].length} titles</div>
                      <div style={{ fontSize: 11, color: t.textMuted, transition: "transform 0.2s", transform: collapsedYears[yr] ? "rotate(-90deg)" : "rotate(0deg)" }}>▾</div>
                    </div>

                    {/* Cards */}
                    {!collapsedYears[yr] && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {byYear[yr].map((r, i) => {
                        const code = r.language || r.original_language;
                        const langLabel = code ? (LANG_CODES[code] || code.toUpperCase()) : null;
                        return (
                          <a key={i} href={r.tmdb_url} target="_blank" rel="noreferrer" style={{
                            display: "flex", gap: 14, padding: "14px",
                            background: t.cardBg, border: `1px solid ${t.cardBorder}`,
                            borderRadius: 14, textDecoration: "none", cursor: "pointer",
                            transition: "border-color 0.2s, box-shadow 0.2s",
                          }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "#7c3aed"; e.currentTarget.style.boxShadow = "0 0 0 1px #7c3aed22"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = t.cardBorder; e.currentTarget.style.boxShadow = "none"; }}
                          >
                            {r.poster
                              ? <img src={r.poster} alt={r.title} style={{ width: 48, height: 64, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                              : <div style={{ width: 48, height: 64, borderRadius: 8, background: t.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🎬</div>
                            }
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: isDark ? "#f1f5f9" : "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
                              <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                <span style={{ textTransform: "capitalize" }}>{r.media_type}</span>
                                {r.rating ? <><span>·</span><span style={{ color: "#fbbf24" }}>★ {r.rating.toFixed(1)}</span></> : null}
                                {langLabel && <><span>·</span><span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: isDark ? "#1e293b" : "#f1f5f9", color: isDark ? "#94a3b8" : "#64748b", border: `1px solid ${t.cardBorder}` }}>{langLabel}</span></>}
                              </div>
                              {r.genre_ids && r.genre_ids.length > 0 && (
                                <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
                                  {r.genre_ids.slice(0, 3).map(gid => GENRE_MAP[gid]).filter(Boolean).map(g => (
                                    <span key={g} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: isDark ? "#1e1e35" : "#ede9fe", color: isDark ? "#a78bfa" : "#7c3aed", fontWeight: 500 }}>{g}</span>
                                  ))}
                                </div>
                              )}
                              {r.platforms && r.platforms.length > 0 && (
                                <div style={{ display: "flex", gap: 5, marginTop: 7, flexWrap: "wrap" }}>
                                  {r.platforms.map(p => <PlatformBadge key={p} platformKey={p} />)}
                                </div>
                              )}
                              {r.overview && <div style={{ fontSize: 12, color: t.textMuted, marginTop: 6, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.overview}</div>}
                            </div>
                            <div style={{ flexShrink: 0, textAlign: "right" }}>
                              <div style={{ fontSize: 11, color: t.textSecondary, background: t.dateBg, padding: "3px 8px", borderRadius: 6 }}>{r.release_date || "TBA"}</div>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                    )}
                  </div>
                ))
              )}
            </div>
          );
        })()}

        {/* ALERTS TAB */}
        {tab === "alerts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Section title="Notification Channels" t={t}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <AlertCard
                  icon="📬" title="Telegram" sub="Instant push notifications"
                  on={telegramOn} toggle={() => setTelegramOn(x => !x)} t={t} theme={theme}
                >
                  {telegramOn && (
                    <input value={chatId} onChange={e => setChatId(e.target.value)}
                      placeholder="Your Telegram chat ID"
                      style={inputStyle} />
                  )}
                </AlertCard>

                <AlertCard
                  icon="✉️" title="Email" sub="via Resend"
                  on={emailOn} toggle={() => setEmailOn(x => !x)} t={t} theme={theme}
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

            <Section title="Notify Me When" t={t}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <NotifyRow icon="🟢" title="New release drops" sub="Content is now available to stream" on={notifyNew} toggle={() => setNotifyNew(x => !x)} t={t} theme={theme} />
                <NotifyRow icon="🔜" title="Coming soon" sub="7 days before release" on={notifySoon} toggle={() => setNotifySoon(x => !x)} t={t} theme={theme} />
                <NotifyRow icon="🎞️" title="Trailer drops" sub="When official trailers release" on={notifyTrailer} toggle={() => setNotifyTrailer(x => !x)} t={t} theme={theme} />
              </div>
            </Section>

            <div style={{ background: t.preBg, border: `1px solid ${t.preBorder}`, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.sectionLabel, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>.env snippet</div>
              <pre style={{ fontSize: 11, color: t.preText, margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{`MY_TELEGRAM_ID=${chatId || "your_chat_id"}
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

function Section({ title, children, t }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.sectionLabel, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function AlertCard({ icon, title, sub, on, toggle, children, t, theme }) {
  return (
    <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: t.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme === "dark" ? "#f1f5f9" : "#1e293b" }}>{title}</div>
          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 1 }}>{sub}</div>
        </div>
        <Toggle on={on} onChange={toggle} theme={theme} />
      </div>
      {children}
    </div>
  );
}

function NotifyRow({ icon, title, sub, on, toggle, t, theme }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: "12px 16px" }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: theme === "dark" ? "#f1f5f9" : "#1e293b" }}>{title}</div>
        <div style={{ fontSize: 12, color: t.textMuted, marginTop: 1 }}>{sub}</div>
      </div>
      <Toggle on={on} onChange={toggle} theme={theme} />
    </div>
  );
}
