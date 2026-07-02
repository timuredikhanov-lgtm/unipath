"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "../page";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Пароли не совпадают — проверь ещё раз");
      return;
    }
    if (password.length < 6) {
      setError("Пароль слишком короткий — минимум 6 символов");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Что-то пошло не так — попробуй ещё раз");
      setLoading(false);
      return;
    }

    await signIn("credentials", { email, password, redirect: false });
    router.push("/");
    router.refresh();
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
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontWeight: 500,
    fontSize: 14,
    color: "var(--text)",
    marginBottom: 8,
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
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <Logo size={24} />
        <p style={{ color: "var(--muted)", fontSize: 16, marginTop: 12, fontFamily: "var(--font-body)" }}>
          Создай аккаунт — это бесплатно
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
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div>
            <label style={labelStyle}>Email</label>
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

          <div>
            <label style={labelStyle}>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              style={inputStyle}
              required
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          <div>
            <label style={labelStyle}>Повтори пароль</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Ещё раз"
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
            {loading ? "Создаём аккаунт…" : "Зарегистрироваться"}
          </button>
        </form>

        <p
          style={{
            fontSize: 14,
            color: "var(--muted)",
            textAlign: "center",
            marginTop: 24,
            fontFamily: "var(--font-body)",
          }}
        >
          Уже есть аккаунт?{" "}
          <Link href="/login" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
