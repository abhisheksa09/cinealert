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

// Funny rotating messages shown while the free-tier server wakes from its nap
const WAKE_MESSAGES = [
  "🍿 Waking the projectionist up from their nap…",
  "☕ The server is brewing a coffee — give it a sec.",
  "🐹 Our free-tier hamster is back on the wheel, running as fast as it can.",
  "🛌 This app is 100% free, so the server snoozes when nobody's watching.",
  "💸 Free hosting perk: blockbuster catalog, occasional 30-second yawns.",
  "🎟️ Rolling out the red carpet… almost showtime.",
  "🎬 Loading reels… first show after a break always takes a moment.",
  "🐢 Slow and free beats fast and pricey. Hang tight!",
];

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
  const [tab, setTab] = useState("releases");
  const [platforms, setPlatforms] = useState(saved?.platforms || ["netflix", "prime", "hbo", "hotstar", "zee5", "sonyliv"]);
  const [languages, setLanguages] = useState(saved?.languages || ["Kannada", "Hindi", "English"]);
  const [types, setTypes] = useState(saved?.types || ["Movies", "Series", "Documentaries", "Anime"]);
  // Cold-start wake-up: free-tier server sleeps when idle (~30-40s to spin up)
  const [serverReady, setServerReady] = useState(false);
  const [waking, setWaking] = useState(false);
  const [wakeSeconds, setWakeSeconds] = useState(0);

  const [releases, setReleases] = useState([]);
  const [loadingReleases, setLoadingReleases] = useState(false);
  const [streamingItems, setStreamingItems] = useState([]);
  const [loadingStreaming, setLoadingStreaming] = useState(false);

  // Upcoming tab filters
  const [filterType, setFilterType] = useState("all");
  const [filterSort, setFilterSort] = useState("date");
  const [filterSearch, setFilterSearch] = useState("");

  // Released tab
  const [released, setReleased] = useState([]);
  const [loadingReleased, setLoadingReleased] = useState(false);
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

  // Ping the backend on load; show a friendly waiting overlay if it's asleep.
  useEffect(() => {
    let cancelled = false;
    let tickTimer;
    const ready = { current: false };

    // Only reveal the overlay if the server doesn't answer within a short grace
    // period — keeps a warm server from flashing the screen.
    const graceTimer = setTimeout(() => {
      if (!cancelled && !ready.current) {
        setWaking(true);
        tickTimer = setInterval(() => setWakeSeconds(s => s + 1), 1000);
      }
    }, 2500);

    (async () => {
      for (let attempt = 0; attempt < 40 && !cancelled; attempt++) {
        try {
          const r = await fetch(`${API_BASE}/health`, { cache: "no-store" });
          if (r.ok) break;
        } catch {}
        await new Promise(res => setTimeout(res, 2000));
      }
      if (cancelled) return;
      ready.current = true;
      setServerReady(true);
      setWaking(false);
    })();

    return () => {
      cancelled = true;
      clearTimeout(graceTimer);
      if (tickTimer) clearInterval(tickTimer);
    };
  }, []);

  useEffect(() => {
    if (!serverReady || tab !== "releases") return;
    setLoadingReleases(true);
    const wantMovie = types.includes("Movies");
    const wantTV = types.includes("Series") || types.includes("Anime") || types.includes("Documentaries");
    const fetches = [];
    if (wantMovie) fetches.push(fetchWithRetry(`${API_BASE}/releases?languages=${languages.join(",")}&platforms=${platforms.join(",")}&media_type=movie`).then(d => d?.releases || []));
    if (wantTV)    fetches.push(fetchWithRetry(`${API_BASE}/releases?languages=${languages.join(",")}&platforms=${platforms.join(",")}&media_type=tv`).then(d => d?.releases || []));
    if (!fetches.length) { setReleases([]); setLoadingReleases(false); }
    else Promise.all(fetches).then(results => setReleases(results.flat())).finally(() => setLoadingReleases(false));
  }, [serverReady, tab, languages, platforms, types]);

  useEffect(() => {
    if (!serverReady || tab !== "streaming") return;
    setLoadingStreaming(true);
    fetchWithRetry(`${API_BASE}/streaming-upcoming?platforms=${platforms.join(",")}&country=in`)
      .then(d => setStreamingItems(d?.items || []))
      .finally(() => setLoadingStreaming(false));
  }, [serverReady, tab, platforms]);

  useEffect(() => {
    if (!serverReady || tab !== "released") return;
    setLoadingReleased(true);
    const wantMovie = types.includes("Movies");
    const wantTV = types.includes("Series") || types.includes("Anime") || types.includes("Documentaries");
    const fetches = [];
    if (wantMovie) fetches.push(fetchWithRetry(`${API_BASE}/released?languages=${languages.join(",")}&media_type=movie&from_year=2020`).then(d => d?.releases || []));
    if (wantTV)    fetches.push(fetchWithRetry(`${API_BASE}/released?languages=${languages.join(",")}&media_type=tv&from_year=2020`).then(d => d?.releases || []));
    if (!fetches.length) { setReleased([]); setLoadingReleased(false); return; }
    Promise.all(fetches)
      .then(results => setReleased(results.flat()))
      .finally(() => setLoadingReleased(false));
  }, [serverReady, tab, languages, types]);

  // Auto-save preferences whenever they change
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, platforms, languages, types }));
    } catch {}
  }, [platforms, languages, types]);

  // Rotate the funny message every ~4s while waiting
  const wakeMessage = WAKE_MESSAGES[Math.floor(wakeSeconds / 4) % WAKE_MESSAGES.length];

  return (
    <div style={{
      minHeight: "100vh", background: t.bg,
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      color: t.text, transition: "background 0.3s, color 0.3s"
    }}>
      {/* ── Cold-start wake-up overlay (free-tier server spin-up) ── */}
      {waking && !serverReady && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 2000,
          background: t.bg,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "32px 24px", textAlign: "center",
        }}>
          <style>{`
            @keyframes cineSpin { to { transform: rotate(360deg); } }
            @keyframes cinePulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
          `}</style>

          {/* Spinning logo */}
          <div style={{ position: "relative", width: 84, height: 84, marginBottom: 28 }}>
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              border: "3px solid " + t.cardBorder,
              borderTopColor: "#7c3aed",
              animation: "cineSpin 0.9s linear infinite",
            }} />
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 34, animation: "cinePulse 1.6s ease-in-out infinite",
            }}>🎬</div>
          </div>

          <div style={{
            fontSize: 19, fontWeight: 700, letterSpacing: "-0.3px",
            color: isDark ? "#fff" : "#1e293b", marginBottom: 10,
          }}>
            Waking up CineAlert…
          </div>

          <div style={{
            fontSize: 14, color: t.textSecondary, maxWidth: 360,
            lineHeight: 1.55, marginBottom: 20, minHeight: 44,
          }}>
            {wakeMessage}
          </div>

          {/* Timer */}
          <div style={{
            fontSize: 13, fontWeight: 700, color: "#a78bfa",
            background: t.pillBg, border: `1px solid ${t.pillBorder}`,
            padding: "6px 16px", borderRadius: 999, marginBottom: 22,
            fontVariantNumeric: "tabular-nums",
          }}>
            ⏱ {wakeSeconds}s — usually ready in 30–40s
          </div>

          <div style={{
            fontSize: 12, color: t.textMuted, maxWidth: 320, lineHeight: 1.6,
          }}>
            This app is hosted <strong style={{ color: t.textSecondary }}>100% free</strong>, so the
            server takes a little nap when no one's around. Thanks for your patience! 💜
          </div>
        </div>
      )}

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
              { id: "releases", label: "In Theatres" },
              { id: "streaming", label: "Coming to OTT" },
              { id: "released", label: "Out Now" },
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

        {/* UPCOMING RELEASES TAB */}
        {tab === "releases" && (() => {
          // Client-side filter + sort
          const matchesFilter = (r, titleKey = "title", overviewKey = "overview", typeKey = "media_type") => {
            if (filterSearch) {
              const q = filterSearch.toLowerCase();
              if (!(r[titleKey] || "").toLowerCase().includes(q) &&
                  !(r[overviewKey] || "").toLowerCase().includes(q)) return false;
            }
            if (filterType !== "all" && r[typeKey] !== filterType) return false;
            return true;
          };

          const filtered = releases
            .filter(r => matchesFilter(r))
            .slice()
            .sort((a, b) => {
              if (filterSort === "rating") return (b.rating || 0) - (a.rating || 0);
              return (a.release_date || "9999") < (b.release_date || "9999") ? -1 : 1;
            });

          const hasActiveFilter = filterSearch || filterType !== "all";

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

                {/* Row 3: platforms */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Platforms</span>
                  {PLATFORMS.map(p => {
                    const on = platforms.includes(p.id);
                    const meta = PLATFORM_META[p.id];
                    return (
                      <button key={p.id} onClick={() => toggleSet(platforms, setPlatforms, p.id)} title={p.label} style={{
                        width: 28, height: 28, borderRadius: 8, border: "none", cursor: "pointer",
                        background: on ? "#a0a0a0" : t.inputBg,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.18s", overflow: "hidden", flexShrink: 0,
                        boxShadow: on ? `0 0 0 2px #a0a0a055` : `0 0 0 1px ${t.cardBorder}`,
                        opacity: on ? 1 : 0.45,
                      }}>
                        {meta?.logo
                          ? <img src={meta.logo} alt={p.label} style={{ width: 18, height: 18, objectFit: "contain", borderRadius: 3 }} />
                          : <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{meta?.icon}</span>
                        }
                      </button>
                    );
                  })}
                  {platforms.length > 0 && (
                    <button onClick={() => setPlatforms([])} title="Clear platforms" style={{
                      width: 20, height: 20, borderRadius: "50%", border: "none", cursor: "pointer",
                      background: "#444", color: "#ccc", fontSize: 12, lineHeight: 1,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      marginLeft: 2, transition: "background 0.15s",
                    }}>×</button>
                  )}
                </div>

                {/* Row 4: languages */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Languages</span>
                  {LANGUAGES.map(lang => {
                    const on = languages.includes(lang);
                    return (
                      <button key={lang} onClick={() => toggleSet(languages, setLanguages, lang)} style={{
                        padding: "4px 11px", borderRadius: 999, fontSize: 11, fontWeight: on ? 700 : 400,
                        border: on ? "1.5px solid #0ea5e9" : `1.5px solid ${t.cardBorder}`,
                        background: on ? "#0ea5e9" : t.inputBg,
                        color: on ? "#fff" : t.textMuted,
                        cursor: "pointer", transition: "all 0.18s",
                      }}>{lang}</button>
                    );
                  })}
                  {languages.length > 0 && (
                    <button onClick={() => setLanguages([])} title="Clear languages" style={{
                      width: 20, height: 20, borderRadius: "50%", border: "none", cursor: "pointer",
                      background: "#444", color: "#ccc", fontSize: 12, lineHeight: 1,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      marginLeft: 2, transition: "background 0.15s",
                    }}>×</button>
                  )}
                </div>
              </div>

              {/* ── Results count ── */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: t.textMuted }}>
                  {loadingReleases ? "Loading…" : `${filtered.length}${hasActiveFilter ? ` of ${releases.length}` : ""} titles`}
                </span>
                {hasActiveFilter && (
                  <button onClick={() => { setFilterSearch(""); setFilterType("all"); }} style={{
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

        {/* STREAMING TAB */}
        {tab === "streaming" && (() => {
          const filteredStreaming = streamingItems.filter(r => {
            if (filterSearch) {
              const q = filterSearch.toLowerCase();
              if (!(r.title || "").toLowerCase().includes(q) && !(r.overview || "").toLowerCase().includes(q)) return false;
            }
            if (filterType !== "all" && r.media_type !== filterType) return false;
            return true;
          });
          const hasActiveFilter = filterSearch || filterType !== "all";

          return (
            <div>
              {/* Filter bar */}
              <div style={{
                background: t.cardBg, border: `1px solid ${t.cardBorder}`,
                borderRadius: 14, padding: "12px 14px", marginBottom: 14,
                display: "flex", flexDirection: "column", gap: 10,
              }}>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: t.textMuted, pointerEvents: "none" }}>🔍</span>
                  <input
                    value={filterSearch}
                    onChange={e => setFilterSearch(e.target.value)}
                    placeholder="Search titles…"
                    style={{ width: "100%", padding: "8px 10px 8px 32px", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, color: t.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                  {filterSearch && (
                    <button onClick={() => setFilterSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: t.textMuted, fontSize: 14, lineHeight: 1 }}>✕</button>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  {[{ val: "all", label: "All" }, { val: "movie", label: "🎬 Movies" }, { val: "tv", label: "📺 Series" }].map(opt => (
                    <button key={opt.val} onClick={() => setFilterType(opt.val)} style={{
                      padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: filterType === opt.val ? 700 : 400,
                      border: filterType === opt.val ? "1.5px solid #7c3aed" : `1.5px solid ${t.cardBorder}`,
                      background: filterType === opt.val ? "#7c3aed" : t.inputBg,
                      color: filterType === opt.val ? "#fff" : t.textMuted,
                      cursor: "pointer", transition: "all 0.18s",
                    }}>{opt.label}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Platforms</span>
                  {PLATFORMS.map(p => {
                    const on = platforms.includes(p.id);
                    const meta = PLATFORM_META[p.id];
                    return (
                      <button key={p.id} onClick={() => toggleSet(platforms, setPlatforms, p.id)} title={p.label} style={{
                        width: 28, height: 28, borderRadius: 8, border: "none", cursor: "pointer",
                        background: on ? "#a0a0a0" : t.inputBg,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.18s", overflow: "hidden", flexShrink: 0,
                        boxShadow: on ? `0 0 0 2px #a0a0a055` : `0 0 0 1px ${t.cardBorder}`,
                        opacity: on ? 1 : 0.45,
                      }}>
                        {meta?.logo
                          ? <img src={meta.logo} alt={p.label} style={{ width: 18, height: 18, objectFit: "contain", borderRadius: 3 }} />
                          : <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{meta?.icon}</span>
                        }
                      </button>
                    );
                  })}
                  {platforms.length > 0 && (
                    <button onClick={() => setPlatforms([])} title="Clear platforms" style={{
                      width: 20, height: 20, borderRadius: "50%", border: "none", cursor: "pointer",
                      background: "#444", color: "#ccc", fontSize: 12, lineHeight: 1,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      marginLeft: 2, transition: "background 0.15s",
                    }}>×</button>
                  )}
                </div>
              </div>

              {/* Results count */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: t.textMuted }}>
                  {loadingStreaming ? "Loading…" : `${filteredStreaming.length}${hasActiveFilter ? ` of ${streamingItems.length}` : ""} titles`}
                </span>
                {hasActiveFilter && (
                  <button onClick={() => { setFilterSearch(""); setFilterType("all"); }} style={{ fontSize: 11, color: "#f87171", background: "none", border: "none", cursor: "pointer", padding: 0 }}>✕ Clear filters</button>
                )}
              </div>

              {loadingStreaming && streamingItems.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{ height: 76, borderRadius: 14, background: t.cardBg, border: `1px solid ${t.cardBorder}`, opacity: 0.5 }} />
                  ))}
                </div>
              ) : filteredStreaming.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem 2rem", background: t.cardBg, borderRadius: 16, border: `1px solid ${t.cardBorder}`, color: t.textMuted }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📺</div>
                  <div style={{ fontSize: 14 }}>No streaming titles match your filters.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredStreaming.map((item, i) => {
                    const meta = PLATFORM_META[item.platform] || { label: item.platform_name || item.platform, color: "#7c3aed", icon: "▶" };
                    const dateStr = item.available_date
                      ? new Date(item.available_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : "Coming Soon";
                    return (
                      <a key={i} href={item.link || `https://www.themoviedb.org/search?query=${encodeURIComponent(item.title)}`} target="_blank" rel="noreferrer" style={{
                        display: "flex", gap: 14, padding: "12px 14px",
                        background: t.cardBg, border: `1px solid ${t.cardBorder}`,
                        borderRadius: 14, textDecoration: "none", cursor: "pointer",
                        transition: "border-color 0.2s, box-shadow 0.2s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = meta.color; e.currentTarget.style.boxShadow = `0 0 0 1px ${meta.color}22`; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = t.cardBorder; e.currentTarget.style.boxShadow = "none"; }}
                      >
                        {item.poster ? (
                          <img src={item.poster} alt={item.title} style={{ width: 44, height: 60, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 44, height: 60, borderRadius: 8, background: t.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🎬</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: isDark ? "#f1f5f9" : "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
                          <div style={{ marginTop: 5 }}>
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 5,
                              fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6,
                              background: meta.color + "18", color: meta.color,
                              border: `1px solid ${meta.color}44`,
                            }}>
                              <span style={{ fontSize: 9 }}>⏰</span>
                              Coming to {meta.label} · {dateStr}
                            </span>
                          </div>
                          {item.overview && <div style={{ fontSize: 11, color: t.textMuted, marginTop: 5, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.overview}</div>}
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          <span style={{ fontSize: 11, color: t.textMuted, textTransform: "capitalize", background: t.dateBg, padding: "3px 8px", borderRadius: 6 }}>{item.media_type}</span>
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
          const filtered = released
            .filter(r => {
              if (rFilterSearch) {
                const q = rFilterSearch.toLowerCase();
                if (!(r.title || "").toLowerCase().includes(q) &&
                    !(r.overview || "").toLowerCase().includes(q)) return false;
              }
              if (rFilterType !== "all" && r.media_type !== rFilterType) return false;
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

          const hasActiveFilter = rFilterSearch || rFilterType !== "all" || rFilterPlatforms.length > 0;

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
                  </div>
                </div>
              </div>

              {/* Count row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: t.textMuted }}>
                  {loadingReleased ? "Loading…" : `${filtered.length}${hasActiveFilter ? ` of ${released.length}` : ""} titles`}
                </span>
                {hasActiveFilter && (
                  <button onClick={() => { setRFilterSearch(""); setRFilterType("all"); setRFilterPlatforms([]); }} style={{ fontSize: 11, color: "#f87171", background: "none", border: "none", cursor: "pointer", padding: 0 }}>✕ Clear all</button>
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
