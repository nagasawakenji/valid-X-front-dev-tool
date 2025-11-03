"use client";
const BASE = process.env.NEXT_PUBLIC_API || "https://localhost:8443";
import React, { useState } from "react";

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

export default function RepostPage() {
  const [tweetId, setTweetId] = useState("");
  const [jwt, setJwt] = useState("");
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleAction = async (method) => {
    setLoading(true);
    setLog((prev) => [
      ...prev,
      { type: "info", msg: `Sending ${method} ${BASE}/v1/tweets/${tweetId}/repost` },
    ]);
    const xsrfToken = getCookie("XSRF-TOKEN");
    try {
      // Repost/Unrepostはリクエストボディを持たないため、Content-Typeは不要（GET/DELETE/PUTの一般的な扱い）
      const res = await fetch(
        `${BASE}/v1/tweets/${tweetId}/repost`,
        {
          method,
          credentials: "include", // Cookieを含める設定は維持
          headers: {
            // Content-Type: "application/json" はPUT/DELETEでボディがない場合は省略可能
            ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
            ...(xsrfToken ? { "X-XSRF-TOKEN": xsrfToken } : {}),
          },
        }
      );
      
      const text = await res.text().catch(() => "");
      let data;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = text; // JSONでなければ生テキストをログに
        }
      } else {
        data = `(No response body. Status: ${res.status})`;
      }

      setLog((prev) => [
        ...prev,
        {
          type: res.ok ? "success" : "error",
          msg: `Response ${res.status}: ${res.statusText}`,
          details: data,
        },
      ]);
    } catch (err) {
      setLog((prev) => [
        ...prev,
        { type: "error", msg: `Request failed: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-8 bg-white shadow-lg rounded-xl mt-10">
      <h1 className="text-3xl font-extrabold mb-6 text-gray-800">Tweet Repost Tool</h1>
      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">Tweet ID</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
            value={tweetId}
            onChange={(e) => setTweetId(e.target.value)}
            placeholder="Enter Tweet ID"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">JWT Token (Bearer)</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
            value={jwt}
            onChange={(e) => setJwt(e.target.value)}
            placeholder="Paste JWT token here"
          />
        </div>
        <div className="flex gap-4 pt-2">
          <button
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            disabled={!tweetId || loading}
            onClick={() => handleAction("PUT")}
          >
            {loading ? '処理中...' : 'Repost (PUT)'}
          </button>
          <button
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            disabled={!tweetId || loading}
            onClick={() => handleAction("DELETE")}
          >
            {loading ? '処理中...' : 'Unrepost (DELETE)'}
          </button>
        </div>
      </div>
      
      <h2 className="text-xl font-bold mb-3 text-gray-800">Request Log</h2>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-64 overflow-auto text-sm font-mono">
        {log.length === 0 && <div className="text-gray-400">ログはまだありません。操作を実行してください。</div>}
        {log.map((entry, idx) => (
          <div key={idx} className={`mb-3 p-2 rounded ${entry.type === "error" ? "bg-red-100" : entry.type === "success" ? "bg-green-100" : "bg-blue-50"}`}>
            <div
              className={
                entry.type === "error"
                  ? "text-red-800 font-semibold"
                  : entry.type === "success"
                  ? "text-green-800 font-semibold"
                  : "text-blue-800 font-semibold"
              }
            >
              [{new Date().toLocaleTimeString()}] {entry.msg}
            </div>
            {entry.details && typeof entry.details !== "string" && (
              <pre className="mt-1 text-black whitespace-pre-wrap text-xs">
                {JSON.stringify(entry.details, null, 2)}
              </pre>
            )}
             {entry.details && typeof entry.details === "string" && entry.details !== "(No response body. Status: 204)" && (
              <pre className="mt-1 text-black whitespace-pre-wrap text-xs">
                {entry.details}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
