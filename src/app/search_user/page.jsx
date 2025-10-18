"use client";

import { useState, useCallback } from "react";

const BASE = process.env.NEXT_PUBLIC_API || "https://localhost:8443";

// JSON取得ヘルパ
async function jsonFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await res.json();
  } else {
    return null;
  }
}

// CookieからCSRFトークン取得
function readCookie(name) {
  const match = document.cookie
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(name + "="));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : "";
}

export default function SearchUserPage() {
  const [accessToken, setAccessToken] = useState("");
  const [prefix, setPrefix] = useState("");
  const [cursor, setCursor] = useState("");
  const [limit, setLimit] = useState(30);
  const [results, setResults] = useState([]);
  const [log, setLog] = useState("");

  const appendLog = (msg) => setLog((s) => s + (s ? "\n" : "") + msg);

  // CSRFトークン取得
  const getCsrf = useCallback(async () => {
    const fromCookie =
      typeof document !== "undefined" ? readCookie("XSRF-TOKEN") : "";
    if (fromCookie) return fromCookie;

    try {
      await fetch(`${BASE}/v1/auth/csrf`, { credentials: "include" });
    } catch (_) {}
    return typeof document !== "undefined" ? readCookie("XSRF-TOKEN") : "";
  }, []);

  // 検索実行
  const doSearch = useCallback(async () => {
    try {
      if (!prefix) throw new Error("prefix（検索ワード）を入力してください");
      if (!accessToken) throw new Error("AccessToken を入力してください");

      const csrf = await getCsrf();
      const params = new URLSearchParams();
      params.append("prefix", prefix);
      if (cursor) params.append("cursor", cursor);
      params.append("limit", limit);

      const out = await jsonFetch(`${BASE}/v1/users/search?${params}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-XSRF-TOKEN": csrf,
        },
      });
      setResults(out?.items || []);
      appendLog(`SEARCH OK: ${JSON.stringify(out, null, 2)}`);
    } catch (e) {
      appendLog(`SEARCH NG: ${e.message}`);
      setResults([]);
    }
  }, [accessToken, prefix, cursor, limit, getCsrf]);

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Search Users (Next.js)</h1>

      {/* Token入力 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Access Token (Bearer)</label>
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="貼り付けてください"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
        />
      </div>

      {/* 検索フォーム */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium">Prefix（前方一致）</label>
          <input
            className="border rounded px-3 py-2 w-full"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="alice"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Cursor（任意）</label>
          <input
            type="number"
            className="border rounded px-3 py-2 w-full"
            value={cursor}
            onChange={(e) => setCursor(e.target.value)}
            placeholder="null"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Limit</label>
          <input
            type="number"
            className="border rounded px-3 py-2 w-full"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          />
        </div>
      </div>

      <button
        onClick={doSearch}
        className="px-4 py-2 rounded border border-white mt-3"
      >
        検索する
      </button>

      {/* 結果表示 */}
      <section>
        <h2 className="font-semibold mt-4 mb-2">検索結果</h2>
        <pre className="bg-gray-100 p-3 rounded overflow-auto text-black">
          {results.length > 0
            ? JSON.stringify(results, null, 2)
            : "(no results)"}
        </pre>
      </section>

      {/* ログ */}
      <section>
        <h2 className="font-semibold mb-2">Log</h2>
        <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto min-h-[120px] whitespace-pre-wrap text-black">
          {log || "(no logs)"}
        </pre>
      </section>
    </main>
  );
}