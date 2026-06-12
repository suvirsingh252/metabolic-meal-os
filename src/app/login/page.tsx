"use client";

import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token })
      });

      if (response.ok) {
        const data = (await response.json()) as { redirectTo?: string };
        window.location.assign(data.redirectTo ?? "/today");
        return;
      }

      if (response.status === 401) {
        setError("That token is not valid. Check it and try again.");
      } else if (response.status === 429) {
        setError("Too many attempts. Wait a minute and try again.");
      } else {
        setError("Login is unavailable right now. Try again later.");
      }
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border bg-white p-6 shadow-sm"
      >
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Metabolic Meal OS</h1>
          <p className="text-sm text-gray-600">Enter app access token</p>
        </div>
        <input
          type="password"
          inputMode="text"
          autoComplete="current-password"
          autoFocus
          required
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="App access token"
          aria-label="App access token"
          className="w-full rounded-lg border px-3 py-2 text-base"
        />
        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting || token.trim().length === 0}
          className="w-full rounded-lg bg-gray-900 px-3 py-2 text-base font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
