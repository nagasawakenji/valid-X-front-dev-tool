"use client";

import { useState } from "react";

const BASE = process.env.NEXT_PUBLIC_API || "https://localhost:8443";

export default function RequestMagicPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState("");

  async function handleRequest(e) {
    e?.preventDefault?.();
    if (loading) return;
    setLoading(true);
    try {
      // フォームから確実に値を取得（Safari/AutoFill 対策）
      let value = email;
      const form = e?.currentTarget;
      if (form && form instanceof HTMLFormElement) {
        const fd = new FormData(form);
        value = (fd.get("email") || email || "").toString().trim();
      }
      if (!value) throw new Error("メールアドレスを入力してください");

      const res = await fetch(`${BASE}/v1/auth/magic-link/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include", // Cookie を使う運用にしても安全
        body: JSON.stringify({ email: value }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${msg}`);
      }

      setLog((s) => `${s}${s ? "\n" : ""}[OK] リンク発行リクエストを受け付けました。開発環境ではサーバログにトークンが出力されます。`);
    } catch (err) {
      setLog((s) => `${s}${s ? "\n" : ""}[NG] ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Magic Link Request</h1>

      <form onSubmit={handleRequest} className="space-y-3 max-w-xl">
        <label className="block text-sm font-medium">メールアドレス</label>
        <input
          name="email"
          type="email"
          autoComplete="email"
          className="border rounded px-3 py-2 w-full"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onInput={(e) => setEmail(e.currentTarget.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className={`px-3 py-2 rounded text-white border border-white ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:opacity-90"}`}
        >
          {loading ? "送信中..." : "リンクを送る"}
        </button>
      </form>

      <section>
        <h2 className="font-semibold mb-2">Log</h2>
        <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto min-h-[160px] whitespace-pre-wrap text-black">{log || "(no logs)"}</pre>
      </section>

      <p className="text-sm text-gray-600">
        次のステップ: トークンを取得したら <code>/consume</code> 画面に貼り付けてアクセストークンを発行してください。
      </p>
    </main>
  );
}