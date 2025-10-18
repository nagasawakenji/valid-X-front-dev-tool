

"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// API base URL (frontend からも参照できる公開変数)
const BASE = process.env.NEXT_PUBLIC_API || "https://localhost:8443";

// 共通: JSON取得ヘルパ
async function jsonFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include", // Cookie を送受信（refresh_token など）
    ...options,
  });
  const text = await res.text();
  const ct = res.headers.get("content-type") || "";
  const body = ct.includes("application/json") && text ? JSON.parse(text) : text;
  if (!res.ok) {
    const detail = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${detail}`);
  }
  return body;
}

export default function ConsumePage() {
  const search = useSearchParams();
  const router = useRouter();

  const [token, setToken] = useState(""); // magic link の token
  const [accessToken, setAccessToken] = useState(""); // レスポンスの access_token
  const [ttlSec, setTtlSec] = useState(null); // 有効期限(秒)
  const [log, setLog] = useState("");
  const appendLog = (msg) => setLog((s) => s + (s ? "\n" : "") + msg);

  // URL クエリ (?token=xxxx) で来た場合は自動セット
  useEffect(() => {
    const t = search.get("token");
    if (t) setToken(t);
  }, [search]);

  const handleConsume = useCallback(async () => {
    try {
      if (!token) throw new Error("token を入力してください");
      const body = await jsonFetch(`${BASE}/v1/auth/magic-link/consume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      // サーバ実装にあわせてフィールド名を吸収
      const at = body.accessToken || body.access_token || body.token || "";
      const ttl = body.expiresInSeconds || body.expires_in_seconds || body.expires_in || null;

      if (!at) throw new Error("access_token がレスポンスに見つかりませんでした");

      setAccessToken(at);
      setTtlSec(ttl ?? null);
      appendLog(`CONSUME OK: ${JSON.stringify(body)}`);

      // 便利のため localStorage にも保存（Follow 画面で使い回し）
      try {
        localStorage.setItem("access_token", at);
      } catch {}
    } catch (e) {
      appendLog(`CONSUME NG: ${e.message}`);
      setAccessToken("");
      setTtlSec(null);
    }
  }, [token]);

  // 今は使っていない
  const goFollow = useCallback(() => {
    // /follow に遷移（クエリで渡す or localStorage 参照でもOK）
    const q = accessToken ? `?access_token=${encodeURIComponent(accessToken)}` : "";
    router.push(`/follow${q}`);
  }, [router, accessToken]);

  const copyAT = useCallback(async () => {
    try {
      if (!accessToken) return;
      await navigator.clipboard.writeText(accessToken);
      appendLog("access_token をクリップボードへコピーしました");
    } catch (e) {
      appendLog("クリップボードコピーに失敗しました");
    }
  }, [accessToken]);

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Magic Link Consume</h1>
      <p className="text-sm text-gray-600">
        メールで受け取ったリンクに含まれる <code>token</code> を貼り付けて、
        <code>/v1/auth/magic-link/consume</code> を叩きます。
      </p>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Token</label>
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="貼り付けてください"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <button onClick={handleConsume} className="px-4 py-2 rounded bg-black text-white border border-white">
          Consume
        </button>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">Access Token</h2>
        <div className="border rounded p-3 bg-gray-50 break-all select-all">
          {accessToken || <span className="text-black">(not issued yet)</span>}
        </div>
        <div className="text-sm text-gray-600">TTL: {ttlSec ?? "-"} sec</div>
        <div className="flex gap-2">
          <button
            disabled={!accessToken}
            onClick={copyAT}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            Copy
          </button>
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Log</h2>
        <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto min-h-[120px] whitespace-pre-wrap text-black">
{log || "(no logs)"}
        </pre>
      </section>
    </main>
  );
}