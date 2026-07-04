"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "../page";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // Всегда показываем одинаковое сообщение — не раскрываем, есть ли email
      setDone(true);
    } catch {
      setError("Что-то пошло не так. Попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 10,
    border: "1.5px solid var(--border)",
    padding: "13px 16px",
    fontSize: 15,
    color: "var(--text)",
    background: "var(--surface)",
    outline: "none",
    fontFamily: "var(--font-body)",
    transition: "border-color 0.15s",
    boxSizing: "border-box",
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
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <Logo size={24} />
        <p style={{ color: "var(--muted)", fontSize: 16, marginTop: 12, fontFamily: "var(--font-body)" }}>
          Восстановление пароля
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
          maxWidth: 420,
        }}
      >
        {done ? (
          <div style={{ textAlign: "center", fontFamily: "var(--font-body)" }}>
            <p style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.6, marginBottom: 24 }}>
              Если этот email зарегистрирован, мы отправили ссылку для сброса пароля. Проверь почту (и папку «Спам»).
            </p>
            <Link
              href="/login"
              style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500, fontSize: 14 }}
            >
              Вернуться ко входу
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <p style={{ fontSize: 14, color: "var(--muted)", fontFamily: "var(--font-body)", margin: 0 }}>
              Введи email, указанный при регистрации. Мы отправим ссылку для сброса пароля.
            </p>

            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: 500,
                  fontSize: 14,
                  color: "var(--text)",
                  marginBottom: 8,
                  fontFamily: "var(--font-body)",
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
                required
                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            {error && (
              <p style={{ color: "var(--accent)", fontSize: 14, margin: "-6px 0 0", fontFamily: "var(--font-body)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-btn)",
                padding: "15px 24px",
                fontSize: 15,
                fontWeight: 500,
                fontFamily: "var(--font-body)",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "background 0.15s, opacity 0.15s",
                marginTop: 4,
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "var(--accent-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent)"; }}
            >
              {loading ? "Отправляем…" : "Отправить ссылку"}
            </button>

            <p style={{ fontSize: 14, color: "var(--muted)", textAlign: "center", margin: 0, fontFamily: "var(--font-body)" }}>
              <Link href="/login" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
                Вернуться ко входу
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
