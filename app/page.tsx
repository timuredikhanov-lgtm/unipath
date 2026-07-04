"use client";

import { useChat } from "ai/react";
import type { Message as UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Profile = { name: string; countries: string[]; level: string; year: string };
type Mode = "advisor" | "mock_admissions" | "essay_editor";

const COUNTRIES = ["США", "ЕС"];
const LEVELS = ["Бакалавриат", "Магистратура"];
const YEARS = ["2025", "2026", "2027", "2028"];
const DAILY_LIMIT = 20;

const MODES: { id: Mode; label: string; empty: string }[] = [
  {
    id: "advisor",
    label: "Консультант",
    empty: "С чего начнём? Расскажи, куда хочешь поступать.",
  },
  {
    id: "mock_admissions",
    label: "Симуляция",
    empty: "Расскажи о своей заявке — вуз, программу, оценки, опыт и черновик эссе. Разберу глазами admissions officer.",
  },
  {
    id: "essay_editor",
    label: "Эссе",
    empty: "Вставь черновик эссе, укажи вуз и тип эссе. Разберу по методу «И что?» и помогу усилить.",
  },
];

// ─── Logo ─────────────────────────────────────────────────────────────────────

export function Logo({ size = 22 }: { size?: number }) {
  const lineW = Math.round(size * 1.2);
  const dotR = Math.round(size * 0.18);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      {/* мини-иконка пути */}
      <svg
        width={lineW + dotR * 4}
        height={dotR * 2 + 2}
        viewBox={`0 0 ${lineW + dotR * 4} ${dotR * 2 + 2}`}
        style={{ flexShrink: 0 }}
      >
        {/* стартовая точка — коралл */}
        <circle cx={dotR + 1} cy={dotR + 1} r={dotR} fill="var(--accent)" />
        {/* линия */}
        <line
          x1={dotR * 2 + 3}
          y1={dotR + 1}
          x2={lineW + dotR}
          y2={dotR + 1}
          stroke="var(--border)"
          strokeWidth={1.5}
        />
        {/* конечная точка — зелёная */}
        <circle cx={lineW + dotR * 3 + 1} cy={dotR + 1} r={dotR} fill="var(--green)" />
      </svg>

      {/* слово */}
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
      {/* hero */}
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

      {/* карточка */}
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

// ─── Chat ─────────────────────────────────────────────────────────────────────

function Chat({ profile }: { profile: Profile }) {
  const [ready, setReady] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [remaining, setRemaining] = useState(DAILY_LIMIT);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((data) => {
        if (data.sessionId) setSessionId(data.sessionId);
        if (data.messages?.length) setInitialMessages(data.messages);
        if (typeof data.remaining === "number") setRemaining(data.remaining);
      })
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div
        style={{
          height: "100%",
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

  return (
    <ChatUI
      profile={profile}
      sessionId={sessionId}
      onSessionId={setSessionId}
      initialMessages={initialMessages}
      remaining={remaining}
      onRemaining={setRemaining}
    />
  );
}

function ChatUI({
  profile,
  sessionId,
  onSessionId,
  initialMessages,
  remaining,
  onRemaining,
}: {
  profile: Profile;
  sessionId: string;
  onSessionId: (id: string) => void;
  initialMessages: UIMessage[];
  remaining: number;
  onRemaining: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [mode, setMode] = useState<Mode>("advisor");
  const currentMode = MODES.find((m) => m.id === mode)!;

  const { messages, input, handleInputChange, handleSubmit: chatSubmit, isLoading, setMessages } =
    useChat({
      api: "/api/chat",
      initialMessages,
      body: { userProfile: profile, sessionId, mode },
      onResponse: (response) => {
        const newSid = response.headers.get("X-Session-Id");
        if (newSid) onSessionId(newSid);
      },
    });

  const mainRef = useRef<HTMLElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // слушаем скролл — обновляем флаг «внизу»
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => {
      setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 120);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // автоскролл только если пользователь внизу
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
    chatSubmit(e);
    onRemaining((prev) => Math.max(0, prev - 1));
    setIsAtBottom(true);
    setTimeout(() => scrollToBottom(), 50);
  }

  function switchMode(newMode: Mode) {
    if (newMode === mode) return;
    setMode(newMode);
    setMessages([]);
    onSessionId("");
  }

  const limitReached = remaining <= 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        background: "var(--bg)",
      }}
    >
      {/* шапка — на всю ширину */}
      <header
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            maxWidth: 820,
            margin: "0 auto",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Logo size={20} />

          {/* переключатель режимов */}
          <div
            style={{
              display: "flex",
              background: "var(--bg)",
              borderRadius: "var(--radius-btn)",
              padding: 3,
              gap: 2,
              border: "1px solid var(--border)",
            }}
          >
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => switchMode(m.id)}
                style={{
                  background: mode === m.id ? "var(--surface)" : "transparent",
                  color: mode === m.id ? "var(--accent)" : "var(--muted)",
                  border: "none",
                  borderRadius: 8,
                  padding: "5px 14px",
                  fontSize: 13,
                  fontWeight: mode === m.id ? 500 : 400,
                  fontFamily: "var(--font-body)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  boxShadow: mode === m.id ? "var(--shadow-card)" : "none",
                  whiteSpace: "nowrap",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              fontSize: 13,
              color: "var(--muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              padding: "4px 8px",
              borderRadius: 6,
              transition: "color 0.15s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
          >
            Выйти
          </button>
        </div>
      </header>

      {/* лента — скролл, контент по центру */}
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
              {currentMode.label}
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.6 }}>{currentMode.empty}</p>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            /* пузырь пользователя */
            <div key={m.id} style={{ display: "flex", justifyContent: "flex-end" }}>
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
            /* карточка UniPath */
            <div key={m.id} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              {/* аватар */}
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
                        <table
                          style={{
                            borderCollapse: "collapse",
                            width: "100%",
                            fontSize: 14,
                          }}
                        >
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead style={{ background: "var(--bg)" }}>{children}</thead>
                    ),
                    th: ({ children }) => (
                      <th
                        style={{
                          border: "1px solid var(--border)",
                          padding: "8px 12px",
                          textAlign: "left",
                          fontWeight: 500,
                          color: "var(--text)",
                        }}
                      >
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td
                        style={{
                          border: "1px solid var(--border)",
                          padding: "7px 12px",
                          color: "var(--text)",
                        }}
                      >
                        {children}
                      </td>
                    ),
                    h1: ({ children }) => (
                      <h1
                        style={{
                          fontFamily: "var(--font-heading)",
                          fontSize: 18,
                          fontWeight: 500,
                          marginTop: 14,
                          marginBottom: 6,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2
                        style={{
                          fontFamily: "var(--font-heading)",
                          fontSize: 16,
                          fontWeight: 500,
                          marginTop: 12,
                          marginBottom: 4,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3
                        style={{
                          fontSize: 15,
                          fontWeight: 500,
                          marginTop: 10,
                          marginBottom: 4,
                        }}
                      >
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p style={{ marginBottom: 10, marginTop: 0 }}>{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul style={{ paddingLeft: 20, marginBottom: 10 }}>{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol style={{ paddingLeft: 20, marginBottom: 10 }}>{children}</ol>
                    ),
                    li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
                    strong: ({ children }) => (
                      <strong style={{ fontWeight: 500, color: "var(--text)" }}>{children}</strong>
                    ),
                    hr: () => (
                      <hr
                        style={{
                          border: "none",
                          borderTop: "1px solid var(--border)",
                          margin: "12px 0",
                        }}
                      />
                    ),
                    code: ({ children }) => (
                      <code
                        style={{
                          background: "var(--tag-beige)",
                          borderRadius: 5,
                          padding: "1px 6px",
                          fontSize: 13,
                          fontFamily: "monospace",
                        }}
                      >
                        {children}
                      </code>
                    ),
                    a: ({ children, href }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--accent)", textDecoration: "underline" }}
                      >
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
        <div ref={bottomRef} />
        </div>

        {/* кнопка возврата вниз */}
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

      {/* поле ввода — на всю ширину, safe-area для iPhone */}
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
            На сегодня всё. Возвращайся завтра — маршрут никуда не денется.{" "}
            <a
              href="mailto:support@example.com"
              style={{ color: "var(--accent)", textDecoration: "underline" }}
            >
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
                  transition: "opacity 0.15s, background 0.15s",
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
