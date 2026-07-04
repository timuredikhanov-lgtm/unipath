"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "../page";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontWeight: 500,
    fontSize: 14,
    color: "var(--text)",
    marginBottom: 8,
    fontFamily: "var(--font-body)",
  };

  if (!token) {
    return (
      <div style={{ textAlign: "center", fontFamily: "var(--font-body)" }}>
        <p style={{ fontSize: 15, color: "var(--text)", marginBottom: 16 }}>
          Ссылка недействительна. Запроси новую.
        </p>
        <Link href="/forgot-password" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
          Сбросить пароль
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Пароль должен быть не короче 6 символов");
      return;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Что-то пошло не так. Попробуй ещё раз.");
        return;
      }

      // Успех — редирект на вход
      router.push("/login?reset=success");
    } catch {
      setError("Что-то пошло не так. Попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <label style={labelStyle}>Новый пароль</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Минимум 6 символов"
          style={inputStyle}
          required
          minLength={6}
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
          placeholder="••••••"
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
        {loading ? "Сохраняем…" : "Сохранить пароль"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
          Новый пароль
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
        {/* Suspense нужен для useSearchParams в Next.js App Router */}
        <Suspense fallback={<p style={{ fontFamily: "var(--font-body)", color: "var(--muted)" }}>Загрузка…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
