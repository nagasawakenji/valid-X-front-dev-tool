"use client";

import { useState } from "react";

const BASE = process.env.NEXT_PUBLIC_API || "https://localhost:8443";

export default function VerifyPage() {
  const [verifyToken, setVerifyToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState("");

  async function handleVerify(e) {
    e?.preventDefault?.();
    if (loading) return;
    setLoading(true);
    try {
      // フォームから確実に値を取得（AutoFill/Safari 対策）
      let token = verifyToken;
      const form = e?.currentTarget;
      if (form && form instanceof HTMLFormElement) {
        const fd = new FormData(form);
        token = (fd.get("verifyToken") || verifyToken || "").toString().trim();
      }
      if (!token) throw new Error("verify token を入力してください");

      const res = await fetch(`${BASE}/v1/auth/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        // Verify はサーバ側で CSRF 無効/permitAll の想定。Cookie が必要なら credentials を on に。
        credentials: "include",
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${msg}`);
      }

      const result = await res.json().catch(() => ({}));
      setLog((s) => `${s}${s ? "\n" : ""}[OK] verify success\n${JSON.stringify(result, null, 2)}`);
    } catch (err) {
      setLog((s) => `${s}${s ? "\n" : ""}[NG] ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Verify</h1>

      <form onSubmit={handleVerify} className="space-y-3 max-w-xl">
        <label className="block text-sm font-medium">Verify Token</label>
        <input
          name="verifyToken"
          className="border rounded px-3 py-2 w-full"
          placeholder="ペーストしてください"
          value={verifyToken}
          onChange={(e) => setVerifyToken(e.target.value)}
          onInput={(e) => setVerifyToken(e.currentTarget.value)}
        />

        <button
          type="submit"
          disabled={loading}
          className={`px-4 py-2 rounded text-white ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:opacity-90"}`}
        >
          {loading ? "送信中..." : "Verify"}
        </button>
      </form>

      <section>
        <h2 className="font-semibold mb-2">Log</h2>
        <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto min-h-[160px] whitespace-pre-wrap text-black">{log || "(no logs)"}</pre>
      </section>
    </main>
  );
}