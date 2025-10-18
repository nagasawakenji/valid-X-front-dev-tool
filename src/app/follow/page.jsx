"use client";

import { useEffect, useState, useCallback } from "react";

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

export default function FollowPage() {
    // アクセストークン(magic-link/consumeで取得したものを貼る)
    const [accessToken, setAccessToken] = useState("");
    // ユーザーのid
    const [viewerId, setViewerId] = useState(2);
    // 相手のid
    const [targetId, setTargetId] = useState(3);
    // フォロワーのid
    const [followers, setFollowers] = useState([]);
    // フォローユーザーのid
    const [following, setFollowing] = useState([]);
    // ログの保持
    const [log, setLog] = useState("");
    const appendLog = (msg) => setLog((s) => s + (s ? "\n" : "") + msg);

    // CSRFトークン取得（Cookie から直接読む。CookieCsrfTokenRepository.withHttpOnlyFalse 前提）
    function readCookie(name) {
        const match = document.cookie
            .split(";")
            .map(v => v.trim())
            .find(v => v.startsWith(name + "="));
        return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : "";
    }

    const getCsrf = useCallback(async () => {
        // まず Cookie の XSRF-TOKEN を読む
        const fromCookie = typeof document !== "undefined" ? readCookie("XSRF-TOKEN") : "";
        if (fromCookie) return fromCookie;
        // それでも無ければ（初回など）軽く叩いて Cookie を発行させる
        try {
            await fetch(`${BASE}/v1/auth/csrf`, { credentials: "include" });
        } catch (_) {}
        return typeof document !== "undefined" ? readCookie("XSRF-TOKEN") : "";
    }, []);

    // フォロー
    const doFollow = useCallback(async () => {
        try {
            if (!accessToken) throw new Error("AccessToken を入力してください");
            const csrf = await getCsrf();
            const out = await jsonFetch(`${BASE}/v1/users/${targetId}/follow`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "X-XSRF-TOKEN": csrf,
                },
            });
            appendLog(`FOLLOW OK: ${JSON.stringify(out)}`);
            await Promise.all([reloadFollowers(), reloadFollowing()]);
        } catch (e) {
            appendLog(`FOLLOW NG: ${e.message}`);
        }
    }, [accessToken, targetId, getCsrf]);

    // フォロー解除
    const doUnfollow = useCallback(async () => {
        try {
            if (!accessToken) throw new Error("AccessTokenを入力してください");
            const csrf = await getCsrf();
            const out = await jsonFetch(`${BASE}/v1/users/${targetId}/follow`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "X-XSRF-TOKEN": csrf,
                },
            });
            appendLog(`UNFOLLOW OK: ${JSON.stringify(out)}`);
            await Promise.all([reloadFollowers(), reloadFollowing()]);
        } catch (e) {
            appendLog(`UNFOLLOW NG: ${e.message}`);
        }
    }, [accessToken, targetId, getCsrf])

    // フォロワー取得
    const reloadFollowers = useCallback(async () => {
        try {
            const out = await jsonFetch(`${BASE}/v1/users/${targetId}/followers`, {
                headers: accessToken ? { "Authorization": `Bearer ${accessToken}` } : {},
            });
            setFollowers(out || []);
            appendLog(`followers[${targetId}] loaded: ${JSON.stringify(out)}`);
        } catch (e) {
            appendLog(`followers NG: ${e.message}`);
            setFollowers([]);
        }
    }, [targetId, accessToken]);

    // フォローユーザー取得
    const reloadFollowing = useCallback(async () => {
        try {
            const out = await jsonFetch(`${BASE}/v1/users/${viewerId}/following`, {
                headers: accessToken ? { "Authorization": `Bearer ${accessToken}` } : {},
            });
            setFollowing(out || []);
            appendLog(`following[${viewerId}] loaded: ${JSON.stringify(out)}`);
        } catch (e) {
            appendLog(`following NG: ${e.message}`);
            setFollowing([]);
        }
    }, [viewerId, accessToken]);

    useEffect(() => {
    reloadFollowers();
    reloadFollowing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Follow Demo (Next.js)</h1>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Access Token (Bearer)</label>
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="貼り付けてください"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium">viewerId（自分）</label>
          <input
            type="number"
            className="border rounded px-3 py-2 w-full"
            value={viewerId}
            onChange={(e) => setViewerId(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">targetId（相手）</label>
          <input
            type="number"
            className="border rounded px-3 py-2 w-full"
            value={targetId}
            onChange={(e) => setTargetId(Number(e.target.value))}
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={doFollow}
            className="px-4 py-2 rounded border border-white"
          >
            Follow
          </button>
          <button
            onClick={doUnfollow}
            className="px-4 py-2 rounded border border-white"
          >
            Unfollow
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <h2 className="font-semibold mb-2">Followers of #{targetId}</h2>
          <pre className="bg-gray-100 p-3 rounded overflow-auto text-black">
            {JSON.stringify(followers, null, 2)}
          </pre>
          <button className="mt-2 text-sm underline" onClick={reloadFollowers}>
            reload followers
          </button>
        </section>

        <section>
          <h2 className="font-semibold mb-2">Following of #{viewerId}</h2>
          <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto text-black">
            {JSON.stringify(following, null, 2)}
          </pre>
          <button className="mt-2 text-sm underline" onClick={reloadFollowing}>
            reload following
          </button>
        </section>
      </div>

      <section>
        <h2 className="font-semibold mb-2">Log</h2>
        <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto min-h-[120px] whitespace-pre-wrap text-black">
{log || "(no logs)"}
        </pre>
      </section>
    </main>
  );
}
