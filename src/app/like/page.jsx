"use client";

import { useState, useCallback } from "react";

const BASE = process.env.NEXT_PUBLIC_API || "https://localhost:8443";

function getCookie(name) {
  const cookies = document.cookie ? document.cookie.split("; ") : [];
  for (let i = 0; i < cookies.length; i++) {
    const parts = cookies[i].split("=");
    const cookieName = decodeURIComponent(parts[0]);
    if (cookieName === name) {
      return decodeURIComponent(parts.slice(1).join("="));
    }
  }
  return null;
}

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

export default function LikePage() {
  const [tweetId, setTweetId] = useState("");
  const [jwt, setJwt] = useState("");
  const [logs, setLogs] = useState([]);

  const appendLog = useCallback(
    (text) => {
      setLogs((logs) => [...logs, text]);
    },
    [setLogs]
  );

  const like = useCallback(async () => {
    if (!tweetId) {
      appendLog("Error: Tweet ID is required.");
      return;
    }
    if (!jwt) {
      appendLog("Error: JWT token is required.");
      return;
    }
    const url = `${BASE}/v1/tweets/${encodeURIComponent(tweetId)}/like`;
    const xsrfToken = getCookie("XSRF-TOKEN");
    appendLog(`PUT ${url}`);
    try {
      const res = await jsonFetch(url, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${jwt}`,
          "X-XSRF-TOKEN": xsrfToken || "",
          "Content-Type": "application/json",
        },
      });
      appendLog(`Success: Tweet ${tweetId} liked.`);
    } catch (err) {
      appendLog(`Error: ${err.message}`);
    }
  }, [tweetId, jwt, appendLog]);

  const unlike = useCallback(async () => {
    if (!tweetId) {
      appendLog("Error: Tweet ID is required.");
      return;
    }
    if (!jwt) {
      appendLog("Error: JWT token is required.");
      return;
    }
    const url = `${BASE}/v1/tweets/${encodeURIComponent(tweetId)}/like`;
    const xsrfToken = getCookie("XSRF-TOKEN");
    appendLog(`DELETE ${url}`);
    try {
      const res = await jsonFetch(url, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${jwt}`,
          "X-XSRF-TOKEN": xsrfToken || "",
          "Content-Type": "application/json",
        },
      });
      appendLog(`Success: Tweet ${tweetId} unliked.`);
    } catch (err) {
      appendLog(`Error: ${err.message}`);
    }
  }, [tweetId, jwt, appendLog]);

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Like Page</h1>

      <label className="block mb-2 font-semibold" htmlFor="tweetId">
        Tweet ID
      </label>
      <input
        id="tweetId"
        type="text"
        value={tweetId}
        onChange={(e) => setTweetId(e.target.value)}
        className="w-full mb-4 p-2 border border-gray-300 rounded"
        placeholder="Enter Tweet ID"
      />

      <label className="block mb-2 font-semibold" htmlFor="jwt">
        JWT Token
      </label>
      <input
        id="jwt"
        type="text"
        value={jwt}
        onChange={(e) => setJwt(e.target.value)}
        className="w-full mb-4 p-2 border border-gray-300 rounded"
        placeholder="Enter JWT token"
      />

      <div className="flex space-x-4 mb-6">
        <button
          onClick={like}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Like
        </button>
        <button
          onClick={unlike}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Unlike
        </button>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-2">Logs</h2>
        <div className="h-48 overflow-auto border border-gray-300 rounded p-2 bg-gray-50 text-sm whitespace-pre-wrap">
          {logs.length === 0 ? "No logs yet." : logs.join("\n")}
        </div>
      </section>
    </main>
  );
}