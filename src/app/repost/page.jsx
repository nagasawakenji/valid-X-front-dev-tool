

// src/app/repost/page.jsx
"use client";
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
      { type: "info", msg: `Sending ${method} /v1/tweets/${tweetId}/repost` },
    ]);
    const xsrfToken = getCookie("XSRF-TOKEN");
    try {
      const res = await fetch(
        `/v1/tweets/${tweetId}/repost`,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
            ...(xsrfToken ? { "X-XSRF-TOKEN": xsrfToken } : {}),
          },
        }
      );
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = text;
      }
      setLog((prev) => [
        ...prev,
        {
          type: res.ok ? "success" : "error",
          msg: `Response ${res.status}:`,
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
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Repost/Unrepost Tweet</h1>
      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium mb-1">Tweet ID</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={tweetId}
            onChange={(e) => setTweetId(e.target.value)}
            placeholder="Enter Tweet ID"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">JWT Token</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={jwt}
            onChange={(e) => setJwt(e.target.value)}
            placeholder="Enter JWT token"
          />
        </div>
        <div className="flex gap-4">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={!tweetId || loading}
            onClick={() => handleAction("PUT")}
          >
            Repost
          </button>
          <button
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={!tweetId || loading}
            onClick={() => handleAction("DELETE")}
          >
            Unrepost
          </button>
        </div>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-2">Log</h2>
        <div className="bg-gray-100 rounded p-4 h-64 overflow-auto text-sm">
          {log.length === 0 && <div className="text-gray-400">No logs yet.</div>}
          {log.map((entry, idx) => (
            <div key={idx} className="mb-2">
              <span
                className={
                  entry.type === "error"
                    ? "text-red-600"
                    : entry.type === "success"
                    ? "text-green-600"
                    : "text-gray-700"
                }
              >
                {entry.msg}
              </span>
              {entry.details && (
                <pre className="bg-gray-200 rounded p-2 mt-1 overflow-x-auto">
                  {typeof entry.details === "string"
                    ? entry.details
                    : JSON.stringify(entry.details, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}