"use client";

import { useChat } from "ai/react";
import type { Message as UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { declineName } from "@/lib/declineName";
import { Compass, PenLine, Trophy, Plane } from "lucide-react";

type Profile = { name: string; countries: string[]; level: string; year: string };
type Mode = "advisor" | "essay_editor" | "athlete_mode" | "visa_mode";

const COUNTRIES = ["США", "Великобритания", "ЕС"];
const LEVELS = ["Бакалавриат", "Магистратура", "PhD / Аспирантура"];
const YEARS = Array.from({ length: 3 }, (_, i) => String(new Date().getFullYear() + i));
const DAILY_LIMIT = 20;

const MODES: { id: Mode; label: string; empty: string }[] = [
  {
    id: "advisor",
    label: "Консультант",
    empty: "С чего начнём? Расскажи, куда хочешь поступать.",
  },
  {
    id: "essay_editor",
    label: "Эссе",
    empty: "Вставь черновик эссе, укажи вуз и тип эссе. Разберу по методу «И что?» и помогу усилить.",
  },
  {
    id: "athlete_mode",
    label: "Спорт",
    empty: "Расскажи про свой вид спорта, уровень, результаты и куда хочешь поступить. Разберём рекрутинг и варианты.",
  },
  {
    id: "visa_mode",
    label: "Виза",
    empty: "Расскажи, в какую страну едешь учиться и на каком этапе сейчас — помогу разобраться с визой по шагам.",
  },
];

// ─── Logo ─────────────────────────────────────────────────────────────────────

export function Logo({ size = 22 }: { size?: number }) {
  const lineW = Math.round(size * 1.2);
  const dotR = Math.round(size * 0.18);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <svg
        width={lineW + dotR * 4}
        height={dotR * 2 + 2}
        viewBox={`0 0 ${lineW + dotR * 4} ${dotR * 2 + 2}`}
        style={{ flexShrink: 0 }}
      >
        <circle cx={dotR + 1} cy={dotR + 1} r={dotR} fill="var(--accent)" />
        <line
          x1={dotR * 2 + 3} y1={dotR + 1}
          x2={lineW + dotR} y2={dotR + 1}
          stroke="var(--border)" strokeWidth={1.5}
        />
        <circle cx={lineW + dotR * 3 + 1} cy={dotR + 1} r={dotR} fill="var(--green)" />
      </svg>
      <span
        style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 500,
          fontSize: size,
          color: "var(--text)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        UniPath
      </span>
    </span>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "9px 20px",
        borderRadius: "var(--radius-btn)",
        border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
        background: active ? "var(--tag-coral)" : "var(--surface)",
        color: active ? "var(--accent)" : "var(--text)",
        fontSize: 14,
        fontWeight: 500,
        fontFamily: "var(--font-body)",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

function Onboarding({ onDone }: { onDone: (p: Profile) => void }) {
  const [name, setName] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [level, setLevel] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState("");

  function toggleCountry(c: string) {
    setCountries((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || countries.length === 0 || !level || !year) {
      setError("Заполни все поля, чтобы двигаться дальше");
      return;
    }
    const profile = { name: name.trim(), countries, level, year };
    localStorage.setItem("profile", JSON.stringify(profile));
    onDone(profile);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: "var(--radius-btn)",
    border: "1.5px solid var(--border)",
    padding: "13px 16px",
    fontSize: 15,
    color: "var(--text)",
    background: "var(--surface)",
    outline: "none",
    fontFamily: "var(--font-body)",
    transition: "border-color 0.15s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontWeight: 500,
    fontSize: 14,
    color: "var(--text)",
    marginBottom: 10,
    fontFamily: "var(--font-body)",
  };

  return (
    <div
      style={{
        minHeight: "100%",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 16px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <Logo size={24} />
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 500,
            fontSize: "clamp(24px, 5vw, 34px)",
            color: "var(--text)",
            marginTop: 24,
            marginBottom: 10,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
          }}
        >
          Твой маршрут в университет мечты
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 16, maxWidth: 360, margin: "0 auto" }}>
          Пара вопросов — и мы построим план под тебя. Без стресса.
        </p>
      </div>

      <div
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius-outer)",
          boxShadow: "var(--shadow-card)",
          border: "1px solid var(--border)",
          padding: "36px 32px",
          width: "100%",
          maxWidth: 460,
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div>
            <label style={labelStyle}>Как тебя зовут?</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например, Алия"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Куда хочешь поступать?{" "}
              <span style={{ color: "var(--muted)", fontWeight: 400 }}>можно несколько</span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {COUNTRIES.map((c) => (
                <Chip key={c} active={countries.includes(c)} onClick={() => toggleCountry(c)}>
                  {c}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Уровень программы</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {LEVELS.map((l) => (
                <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
                  {l}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Год поступления</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {YEARS.map((y) => (
                <Chip key={y} active={year === y} onClick={() => setYear(y)}>
                  {y}
                </Chip>
              ))}
            </div>
          </div>

          {error && (
            <p style={{ color: "var(--accent)", fontSize: 14, margin: "-12px 0 0" }}>{error}</p>
          )}

          <button
            type="submit"
            style={{
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-btn)",
              padding: "15px 24px",
              fontSize: 15,
              fontWeight: 500,
              fontFamily: "var(--font-body)",
              cursor: "pointer",
              transition: "background 0.15s",
              marginTop: 4,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
          >
            Построить маршрут →
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Thinking indicator ───────────────────────────────────────────────────────

function ThinkingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
      <div style={{ display: "flex", gap: 5 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#E8846B", animation: "up-dots 1.4s ease-in-out infinite", display: "inline-block" }} />
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#E8846B", animation: "up-dots 1.4s ease-in-out 0.2s infinite", display: "inline-block" }} />
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#5B8A72", animation: "up-dots 1.4s ease-in-out 0.4s infinite", display: "inline-block" }} />
      </div>
      <span style={{ fontSize: 14, color: "#8A8078" }}>UniPath думает…</span>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  profile,
  mode,
  onModeChange,
  isGenerating,
  isMobile,
  open,
  onClose,
}: {
  profile: Profile;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  isGenerating: boolean;
  isMobile: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const modeIcons: Record<Mode, React.ReactNode> = {
    advisor: <Compass size={16} strokeWidth={1.5} />,
    essay_editor: <PenLine size={16} strokeWidth={1.5} />,
    athlete_mode: <Trophy size={16} strokeWidth={1.5} />,
    visa_mode: <Plane size={16} strokeWidth={1.5} />,
  };

  // закрытие быстрее открытия — интерфейс должен реагировать мгновенно
  const sidebarStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: 260,
        zIndex: 100,
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: open
          ? "transform 250ms var(--ease-drawer)"
          : "transform 200ms var(--ease-drawer)",
      }
    : {
        width: 220,
        flexShrink: 0,
        position: "relative",
      };

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(46,42,51,0.38)",
            zIndex: 99,
          }}
        />
      )}

      <aside
        style={{
          ...sidebarStyle,
          display: "flex",
          flexDirection: "column",
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          overflowY: "auto",
        }}
      >
        {/* Логотип */}
        <div
          style={{
            padding: "18px 18px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Logo size={18} />
          {isMobile && (
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--muted)",
                fontSize: 20,
                lineHeight: 1,
                padding: "0 4px",
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Список режимов */}
        <nav style={{ flex: 1, padding: "10px 10px 0" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: "var(--muted)",
              padding: "8px 10px 6px",
              fontFamily: "var(--font-body)",
            }}
          >
            Режим
          </p>
          {MODES.map((m) => {
            const isActive = mode === m.id;
            const disabled = isGenerating && !isActive;
            return (
              <button
                key={m.id}
                className="mode-btn interactive"
                onClick={() => {
                  onModeChange(m.id);
                  if (isMobile) onClose();
                }}
                disabled={disabled}
                title={disabled ? "Подождите окончания ответа" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  textAlign: "left",
                  padding: "9px 10px",
                  borderRadius: 8,
                  border: "none",
                  background: isActive ? "var(--tag-coral)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--muted)",
                  fontWeight: isActive ? 500 : 400,
                  fontSize: 14,
                  fontFamily: "var(--font-body)",
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.45 : 1,
                  marginBottom: 2,
                }}
                onMouseEnter={(e) => {
                  if (!isActive && !disabled)
                    e.currentTarget.style.background = "var(--bg)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexShrink: 0,
                    color: isActive ? "var(--accent)" : "#8A8078",
                  }}
                >
                  {modeIcons[m.id]}
                </span>
                <span>{m.label}</span>
                {isActive && (
                  <span
                    style={{
                      marginLeft: "auto",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      flexShrink: 0,
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Профиль + выход */}
        <div
          style={{
            padding: "14px 18px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text)",
                fontFamily: "var(--font-body)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {profile.name}
            </p>
            <p
              style={{
                fontSize: 11,
                color: "var(--muted)",
                fontFamily: "var(--font-body)",
                marginTop: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {profile.level}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              fontSize: 12,
              color: "var(--muted)",
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 6,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              padding: "5px 10px",
              transition: "color 0.15s, border-color 0.15s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text)";
              e.currentTarget.style.borderColor = "var(--muted)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--muted)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            Выйти
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

type ModeData = { sessionId: string; messages: UIMessage[] };

function Chat({ profile }: { profile: Profile }) {
  const [ready, setReady] = useState(false);
  const [remaining, setRemaining] = useState(DAILY_LIMIT);
  const [mode, setMode] = useState<Mode>("advisor");
  const [isGenerating, setIsGenerating] = useState(false);
  // кеш истории: mode → { sessionId, messages }
  const [cache, setCache] = useState<Partial<Record<Mode, ModeData>>>({});
  const fetchingRef = useRef<Set<Mode>>(new Set());

  // мобильный сайдбар
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  async function fetchMode(m: Mode): Promise<void> {
    if (fetchingRef.current.has(m)) return;
    fetchingRef.current.add(m);
    try {
      const data = await fetch(`/api/history?mode=${m}`).then((r) => r.json());
      setCache((prev) => ({
        ...prev,
        [m]: { sessionId: data.sessionId ?? "", messages: data.messages ?? [] },
      }));
      if (typeof data.remaining === "number") setRemaining(data.remaining);
    } finally {
      fetchingRef.current.delete(m);
    }
  }

  useEffect(() => {
    fetchMode("advisor").finally(() => setReady(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchMode(newMode: Mode) {
    // блокируем переключение пока идёт генерация — иначе race condition
    if (newMode === mode || isGenerating) return;
    setMode(newMode);
    if (!cache[newMode]) fetchMode(newMode);
  }

  function updateSessionId(newId: string) {
    setCache((prev) => ({
      ...prev,
      [mode]: { ...(prev[mode] ?? { messages: [] }), sessionId: newId },
    }));
  }

  if (!ready) {
    return (
      <div
        style={{
          height: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--muted)",
          fontFamily: "var(--font-body)",
          fontSize: 14,
          background: "var(--bg)",
        }}
      >
        Загрузка…
      </div>
    );
  }

  const current = cache[mode] ?? { sessionId: "", messages: [] };

  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden" }}>
      {/* Сайдбар — снаружи ChatUI, не ремонтируется при смене режима */}
      <Sidebar
        profile={profile}
        mode={mode}
        onModeChange={switchMode}
        isGenerating={isGenerating}
        isMobile={isMobile}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Область чата */}
      <div style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
        {/* key={mode} перемонтирует ChatUI при смене режима — useChat получает
            свежие initialMessages для нужного режима */}
        <ChatUI
          key={mode}
          profile={profile}
          mode={mode}
          isGenerating={isGenerating}
          onGeneratingChange={setIsGenerating}
          sessionId={current.sessionId}
          onSessionId={updateSessionId}
          initialMessages={current.messages}
          remaining={remaining}
          onRemaining={setRemaining}
          isMobile={isMobile}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
      </div>
    </div>
  );
}

// ─── ChatUI ───────────────────────────────────────────────────────────────────

function ChatUI({
  profile,
  mode,
  isGenerating,
  onGeneratingChange,
  sessionId,
  onSessionId,
  initialMessages,
  remaining,
  onRemaining,
  isMobile,
  onOpenSidebar,
}: {
  profile: Profile;
  mode: Mode;
  isGenerating: boolean;
  onGeneratingChange: (v: boolean) => void;
  sessionId: string;
  onSessionId: (id: string) => void;
  initialMessages: UIMessage[];
  remaining: number;
  onRemaining: React.Dispatch<React.SetStateAction<number>>;
  isMobile: boolean;
  onOpenSidebar: () => void;
}) {
  const currentMode = MODES.find((m) => m.id === mode)!;
  const [chatError, setChatError] = useState<string | null>(null);
  const lastInputRef = useRef<string>("");

  const { messages, input, handleInputChange, handleSubmit: chatSubmit, isLoading, setInput } =
    useChat({
      api: "/api/chat",
      initialMessages,
      body: { userProfile: profile, sessionId, mode },
      onResponse: (response) => {
        const newSid = response.headers.get("X-Session-Id");
        if (newSid) onSessionId(newSid);
        setChatError(null);
      },
      onError: (error) => {
        console.error("[chat] ошибка:", error.message);
        setChatError("Не удалось получить ответ. Попробуйте ещё раз.");
        onRemaining((prev) => Math.min(prev + 1, DAILY_LIMIT));
      },
    });

  // сообщаем родителю о статусе генерации чтобы он мог блокировать переключение
  useEffect(() => {
    onGeneratingChange(isLoading);
  }, [isLoading, onGeneratingChange]);

  const mainRef = useRef<HTMLElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => {
      setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 120);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isAtBottom || !mainRef.current) return;
    mainRef.current.scrollTop = mainRef.current.scrollHeight;
  }, [messages, isAtBottom]);

  function scrollToBottom() {
    if (!mainRef.current) return;
    mainRef.current.scrollTo({ top: mainRef.current.scrollHeight, behavior: "smooth" });
    setIsAtBottom(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (remaining <= 0 || isLoading) return;
    lastInputRef.current = input;
    setChatError(null);
    // передаём body в момент отправки — гарантирует актуальный mode
    chatSubmit(e, { body: { userProfile: profile, sessionId, mode } });
    onRemaining((prev) => Math.max(0, prev - 1));
    setIsAtBottom(true);
    setTimeout(() => scrollToBottom(), 50);
  }

  function handleRetry() {
    setChatError(null);
    setInput(lastInputRef.current);
  }

  const limitReached = remaining <= 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg)",
      }}
    >
      {/* Мобильная шапка с бургером — только на мобиле */}
      {isMobile && (
        <header
          style={{
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 16px",
            height: 52,
          }}
        >
          <button
            onClick={onOpenSidebar}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text)",
              fontSize: 20,
              lineHeight: 1,
              padding: "4px",
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
            aria-label="Открыть меню"
          >
            ☰
          </button>
          <span
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 15,
              fontWeight: 500,
              color: "var(--text)",
              letterSpacing: "-0.01em",
            }}
          >
            {currentMode.label}
          </span>
        </header>
      )}

      {/* Лента сообщений */}
      <main
        ref={mainRef}
        style={{
          flex: 1,
          overflowY: "auto",
          position: "relative",
        }}
      >
        <div
          style={{
            maxWidth: 820,
            margin: "0 auto",
            padding: "28px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: "var(--muted)",
                marginTop: 72,
                maxWidth: 380,
                margin: "72px auto 0",
                fontFamily: "var(--font-body)",
              }}
            >
              <p style={{ fontSize: 16, color: "var(--text)", marginBottom: 8, fontWeight: 500 }}>
                Привет, {profile.name}!
              </p>
              <p style={{ fontSize: 15, lineHeight: 1.6 }}>{currentMode.empty}</p>
            </div>
          )}

          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="msg-enter" style={{ display: "flex", justifyContent: "flex-end" }}>
                <div
                  style={{
                    maxWidth: "72%",
                    background: "var(--green)",
                    color: "#fff",
                    borderRadius: "14px 4px 14px 14px",
                    padding: "11px 16px",
                    fontSize: 15,
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={m.id} className="msg-enter" style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: "var(--tag-coral)",
                    border: "1.5px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      display: "block",
                    }}
                  />
                </div>

                <div
                  style={{
                    flex: 1,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "4px 14px 14px 14px",
                    padding: "14px 18px",
                    fontSize: 15,
                    lineHeight: 1.65,
                    color: "var(--text)",
                    fontFamily: "var(--font-body)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ children }) => (
                        <div style={{ overflowX: "auto", marginBottom: 10 }}>
                          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead style={{ background: "var(--bg)" }}>{children}</thead>
                      ),
                      th: ({ children }) => (
                        <th style={{ border: "1px solid var(--border)", padding: "8px 12px", textAlign: "left", fontWeight: 500, color: "var(--text)" }}>
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td style={{ border: "1px solid var(--border)", padding: "7px 12px", color: "var(--text)" }}>
                          {children}
                        </td>
                      ),
                      h1: ({ children }) => (
                        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 500, marginTop: 14, marginBottom: 6, letterSpacing: "-0.02em" }}>{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 16, fontWeight: 500, marginTop: 12, marginBottom: 4, letterSpacing: "-0.02em" }}>{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 style={{ fontSize: 15, fontWeight: 500, marginTop: 10, marginBottom: 4 }}>{children}</h3>
                      ),
                      p: ({ children }) => <p style={{ marginBottom: 10, marginTop: 0 }}>{children}</p>,
                      ul: ({ children }) => <ul style={{ paddingLeft: 20, marginBottom: 10 }}>{children}</ul>,
                      ol: ({ children }) => <ol style={{ paddingLeft: 20, marginBottom: 10 }}>{children}</ol>,
                      li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
                      strong: ({ children }) => <strong style={{ fontWeight: 500, color: "var(--text)" }}>{children}</strong>,
                      hr: () => <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />,
                      code: ({ children }) => (
                        <code style={{ background: "var(--tag-beige)", borderRadius: 5, padding: "1px 6px", fontSize: 13, fontFamily: "monospace" }}>
                          {children}
                        </code>
                      ),
                      a: ({ children, href }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            )
          )}

          {isLoading && <ThinkingIndicator />}

          {chatError && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "#FEF2F0",
                border: "1px solid #F5C4BB",
                borderRadius: 12,
                padding: "12px 16px",
                fontFamily: "var(--font-body)",
                fontSize: 14,
                color: "var(--text)",
              }}
            >
              <span style={{ flex: 1 }}>⚠ {chatError}</span>
              <button
                onClick={handleRetry}
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 14px",
                  fontSize: 13,
                  fontFamily: "var(--font-body)",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Повторить
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {!isAtBottom && (
          <button
            onClick={scrollToBottom}
            style={{
              position: "sticky",
              bottom: 16,
              float: "right",
              marginRight: 16,
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "20px",
              padding: "6px 14px",
              fontSize: 13,
              fontFamily: "var(--font-body)",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(46,42,51,0.12)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "box-shadow 0.15s",
            }}
          >
            ↓ К последнему
          </button>
        )}
      </main>

      {/* Поле ввода */}
      <div
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          flexShrink: 0,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "12px 16px 16px" }}>
          {limitReached ? (
            <div
              style={{
                textAlign: "center",
                fontSize: 15,
                color: "var(--muted)",
                fontFamily: "var(--font-body)",
                padding: "8px 0",
              }}
            >
              На сегодня всё. Возвращайся завтра — маршрут {declineName(profile.name, "genitive")} никуда не денется.{" "}
              <a href="mailto:support@example.com" style={{ color: "var(--accent)", textDecoration: "underline" }}>
                Написать нам
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  background: "var(--bg)",
                  border: "1.5px solid var(--border)",
                  borderRadius: "var(--radius-btn)",
                  padding: "6px 6px 6px 16px",
                  transition: "border-color 0.15s",
                }}
                onFocusCapture={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent)")
                }
                onBlurCapture={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)")
                }
              >
                <input
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Напиши вопрос или вставь текст…"
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: "none",
                    border: "none",
                    outline: "none",
                    fontSize: 15,
                    color: "var(--text)",
                    fontFamily: "var(--font-body)",
                    padding: "8px 8px 8px 0",
                  }}
                />
                <button
                  type="submit"
                  className="interactive"
                  disabled={isLoading || !input.trim()}
                  style={{
                    background: "var(--accent)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "var(--radius-btn)",
                    padding: "8px 20px",
                    fontSize: 14,
                    fontWeight: 500,
                    fontFamily: "var(--font-body)",
                    cursor: "pointer",
                    opacity: isLoading || !input.trim() ? 0.4 : 1,
                    transition: "opacity 150ms var(--ease-out), background 150ms var(--ease-out)",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading && input.trim())
                      e.currentTarget.style.background = "var(--accent-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--accent)";
                  }}
                >
                  Отправить
                </button>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  textAlign: "center",
                  marginTop: 8,
                  fontFamily: "var(--font-body)",
                }}
              >
                Осталось сообщений сегодня: {remaining}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("profile");
    if (saved) setProfile(JSON.parse(saved));
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  return profile ? <Chat profile={profile} /> : <Onboarding onDone={setProfile} />;
}
