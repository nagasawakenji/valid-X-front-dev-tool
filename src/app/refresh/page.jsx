"use client";

import { useState } from "react";

const BASE = process.env.NEXT_PUBLIC_API || "https://localhost:8443";

export default function RefreshTokenPage() {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState("");

  async function handleRefresh() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${msg}`);
      }

      const data = await res.json();
      localStorage.setItem("access_token", data.accessToken || data.jwt);
      localStorage.setItem("access_ttl", data.expiresInSeconds || data.accessTtlSecond);

      setLog((s) => `${s}${s ? "\n" : ""}[OK] アクセストークンを更新しました。\n${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      setLog((s) => `${s}${s ? "\n" : ""}[NG] ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Refresh Access Token</h1>

      <button
        onClick={handleRefresh}
        disabled={loading}
        className={`px-3 py-2 rounded text-white border border-white ${
          loading ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:opacity-90"
        }`}
      >
        {loading ? "更新中..." : "アクセストークンをリフレッシュ"}
      </button>

      <section>
        <h2 className="font-semibold mb-2">Log</h2>
        <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto min-h-[160px] whitespace-pre-wrap text-black">
          {log || "(no logs)"}
        </pre>
      </section>

      <p className="text-sm text-gray-600">
        Cookie 内の refresh_token を使って新しいアクセストークンを取得します。
      </p>
    </main>
  );
}