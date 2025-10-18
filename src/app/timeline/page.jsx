"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_API || "https://localhost:8443";

// ---- Utilities ----
async function jsonFetch(url, options = {}) {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return null;
  const json = await res.json();
  console.log("FETCH:", url, json);
  return json;
}

function readCookie(name) {
  if (typeof document === "undefined") return "";
  const hit = document.cookie
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(name + "="));
  return hit ? decodeURIComponent(hit.split("=").slice(1).join("=")) : "";
}

export default function TimelineDevPage() {
  // Common
  const [accessToken, setAccessToken] = useState("");

  // Home TL
  const [homeLimit, setHomeLimit] = useState(30);
  const [homeCursor, setHomeCursor] = useState("");
  const [homeCursorInput, setHomeCursorInput] = useState("");
  const [homeResp, setHomeResp] = useState(null);
  const [homeLoading, setHomeLoading] = useState(false);

  // Replies
  const [replyTweetId, setReplyTweetId] = useState(1);
  const [replyLimit, setReplyLimit] = useState(30);
  const [replyCursor, setReplyCursor] = useState("");
  const [replyCursorInput, setReplyCursorInput] = useState("");
  const [replyResp, setReplyResp] = useState(null);
  const [replyLoading, setReplyLoading] = useState(false);

  // User Tweets
  const [userId, setUserId] = useState(1);
  const [userLimit, setUserLimit] = useState(30);
  const [userCursor, setUserCursor] = useState("");
  const [userCursorInput, setUserCursorInput] = useState("");
  const [userResp, setUserResp] = useState(null);
  const [userLoading, setUserLoading] = useState(false);

  // Popular
  const [popLimit, setPopLimit] = useState(30);
  const [popDayCount, setPopDayCount] = useState(15);
  const [popCursorLike, setPopCursorLike] = useState("");
  const [popCursorLikeInput, setPopCursorLikeInput] = useState("");
  const [popCursorId, setPopCursorId] = useState("");
  const [popCursorIdInput, setPopCursorIdInput] = useState("");
  const [popResp, setPopResp] = useState(null);
  const [popLoading, setPopLoading] = useState(false);

  // Log
  const [log, setLog] = useState("");
  const appendLog = useCallback((m) => setLog((s) => s + (s ? "\n" : "") + m), []);

  // Ensure XSRF cookie exists (CookieCsrfTokenRepository.withHttpOnlyFalse を想定)
  useEffect(() => {
    fetch(`${BASE}/v1/auth/csrf`, { credentials: "include" }).catch(() => {});
  }, []);

  useEffect(() => { setHomeCursorInput(homeCursor); }, [homeCursor]);
  useEffect(() => { setReplyCursorInput(replyCursor); }, [replyCursor]);
  useEffect(() => { setUserCursorInput(userCursor); }, [userCursor]);
  useEffect(() => { setPopCursorLikeInput(popCursorLike); }, [popCursorLike]);
  useEffect(() => { setPopCursorIdInput(popCursorId); }, [popCursorId]);

  const authHeader = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    [accessToken]
  );

  // ---- Actions ----
  const loadHome = useCallback(async () => {
    setHomeLoading(true);
    try {
      const p = new URLSearchParams();
      if (homeCursor) p.set("cursor", homeCursor);
      if (homeLimit) p.set("limit", String(homeLimit));
      const url = `${BASE}/v1/timeline?${p.toString()}`;
      appendLog(`[GET] ${url}`);

      const out = await jsonFetch(url, { headers: { ...authHeader } });
      setHomeResp(out);
      if (out && out.next_cursor !== null && out.next_cursor !== undefined) {
        setHomeCursor(String(out.next_cursor));  
        appendLog(`→ next_cursor updated to ${out.next_cursor}`);
      }
      
    } catch (e) {
      appendLog(`[HOME] NG: ${e.message}`);
      setHomeResp(null);
    } finally {
      setHomeLoading(false);
    }
  }, [homeCursor, homeLimit, authHeader, appendLog]);

  const loadReplies = useCallback(async () => {
    setReplyLoading(true);
    try {
      const p = new URLSearchParams();
      if (replyCursor) p.set("cursor", replyCursor);
      if (replyLimit) p.set("limit", String(replyLimit));
      const url = `${BASE}/v1/tweets/${replyTweetId}/replies?${p.toString()}`;
      appendLog(`[GET] ${url}`);
      const out = await jsonFetch(url, { headers: { ...authHeader } });
      setReplyResp(out);
      if (out && out.next_cursor !== null && out.next_cursor !== undefined) {
        setReplyCursor(String(out.next_cursor));
        appendLog(`→ replies.next_cursor updated to ${out.next_cursor}`);
      }
    } catch (e) {
      appendLog(`[REPLIES] NG: ${e.message}`);
      setReplyResp(null);
    } finally {
      setReplyLoading(false);
    }
  }, [replyTweetId, replyCursor, replyLimit, authHeader, appendLog]);

  const loadUserTweets = useCallback(async () => {
    setUserLoading(true);
    try {
      const p = new URLSearchParams();
      if (userCursor) p.set("cursor", userCursor);
      if (userLimit) p.set("limit", String(userLimit));
      const url = `${BASE}/v1/users/${userId}/tweets?${p.toString()}`;
      appendLog(`[GET] ${url}`);
      const out = await jsonFetch(url, { headers: { ...authHeader } });
      setUserResp(out);
      if (out && out.next_cursor !== null && out.next_cursor !== undefined) {
        setUserCursor(String(out.next_cursor));
        appendLog(`→ userTweets.next_cursor updated to ${out.next_cursor}`);
      }
    } catch (e) {
      appendLog(`[USER TWEETS] NG: ${e.message}`);
      setUserResp(null);
    } finally {
      setUserLoading(false);
    }
  }, [userId, userCursor, userLimit, authHeader, appendLog]);

  const loadPopular = useCallback(async () => {
    setPopLoading(true);
    try {
      const p = new URLSearchParams();
      if (popCursorLike) p.set("cursor_like", popCursorLike);
      if (popCursorId) p.set("cursor_id", popCursorId);
      if (popLimit) p.set("limit", String(popLimit));
      if (popDayCount) p.set("day_count", String(popDayCount));
      const url = `${BASE}/v1/tweets/popular?${p.toString()}`;
      appendLog(`[GET] ${url}`);
      const out = await jsonFetch(url, { headers: { ...authHeader } });
      if (out) {
        setPopResp(prev =>
          prev
            ? { ...out, items: [...(prev.items || []), ...(out.items || [])] }
            : out
        );
        if (out.next_cursor !== null && out.next_cursor !== undefined) {
          setPopCursorId(String(out.next_cursor));
          appendLog(`→ popular.next_cursor updated to ${out.next_cursor} (cursor_id only)`);
        }
      }
    } catch (e) {
      appendLog(`[POPULAR] NG: ${e.message}`);
      setPopResp(null);
    } finally {
      setPopLoading(false);
    }
  }, [popCursorLike, popCursorId, popLimit, popDayCount, authHeader, appendLog]);

  // ---- Render helpers ----
  function JsonBox({ data }) {
    if (!data) {
      return (
        <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto text-black">(no data)</pre>
      );
    }

    const items = data.items || [];

    return (
      <div className="space-y-3">
        {items.map((tweet, i) => (
          <TweetBox key={i} tweet={tweet} />
        ))}
        {("next_cursor" in data) && (
          <p className="text-xs text-gray-600">
            next_cursor: <code>{String(data.next_cursor)}</code>
          </p>
        )}
      </div>
    );
  }

  function TweetBox({ tweet }) {
    const [mediaBlobs, setMediaBlobs] = useState({});

    const xsrfToken = useMemo(() => readCookie("XSRF-TOKEN"), []);

    useEffect(() => {
      let isMounted = true;
      async function fetchMedia() {
        if (!tweet.media || tweet.media.length === 0) return;
        const newBlobs = {};
        for (const m of tweet.media) {
          const url = `${BASE}/media/${m.storage_key}`;
          try {
            const headers = {
              ...authHeader,
              "X-XSRF-TOKEN": xsrfToken,
            };
            const res = await fetch(url, {
              headers,
              credentials: "include",
            });
            if (!res.ok) {
              console.warn(`Failed to fetch media ${url}: ${res.status}`);
              continue;
            }
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            newBlobs[m.storage_key] = objectUrl;
          } catch (e) {
            console.warn(`Error fetching media ${url}: ${e.message}`);
          }
        }
        if (isMounted) {
          setMediaBlobs(newBlobs);
        }
      }
      fetchMedia();
      return () => {
        isMounted = false;
        // Revoke object URLs on unmount
        Object.values(mediaBlobs).forEach((url) => URL.revokeObjectURL(url));
      };
    }, [tweet.media, authHeader, xsrfToken]);

    return (
      <div className="border rounded p-4 bg-white text-black">
        <p className="font-semibold">@{tweet.username}</p>
        <p className="mb-2">{tweet.content}</p>

        {/* ---- メディア表示 ---- */}
        {tweet.media && tweet.media.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {tweet.media.map((m, j) => {
              const blobUrl = mediaBlobs[m.storage_key];
              if (!blobUrl) {
                return (
                  <p key={j} className="text-xs text-gray-500">
                    Loading media...
                  </p>
                );
              }
              if (m.media_type === "image" || m.mime_type?.startsWith("image/")) {
                return (
                  <img
                    key={j}
                    src={blobUrl}
                    alt={`media-${j}`}
                    className="w-40 h-40 object-cover rounded"
                  />
                );
              } else if (m.media_type === "video" || m.mime_type?.startsWith("video/")) {
                return (
                  <video
                    key={j}
                    src={blobUrl}
                    className="w-64 h-40 rounded"
                    controls
                  />
                );
              } else {
                return (
                  <p key={j} className="text-xs text-gray-500">
                    Unsupported: {m.mime_type}
                  </p>
                );
              }
            })}
          </div>
        )}

        <div className="text-xs text-gray-500">
          ❤️ {tweet.likeCount}　💬 {tweet.replyCount}　🔁 {tweet.repostCount}
        </div>
      </div>
    );
  }

  // ---- Render ----
  return (
    <main className="p-6 max-w-6xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Timeline Dev Console</h1>

      {/* Access Token */}
      <section className="space-y-2">
        <label className="block text-sm font-medium">Access Token (Bearer)</label>
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Paste JWT here"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          autoComplete="off"
        />
      </section>

      <Section title="Home Timeline" onLoad={loadHome} loading={homeLoading}>
        <form
          className="flex items-center gap-2 mb-2"
          onSubmit={(e) => {
            e.preventDefault();
            setHomeCursor(homeCursorInput);
            setTimeout(() => loadHome(), 0);
          }}
        >
          <label className="text-xs">Cursor:</label>
          <input
            type="text"
            className="border rounded px-1 py-0.5 text-xs"
            style={{ width: 120 }}
            value={homeCursorInput}
            onChange={(e) => setHomeCursorInput(e.target.value)}
            placeholder="cursor"
          />
          <label className="text-xs">Limit:</label>
          <input
            type="number"
            className="border rounded px-1 py-0.5 text-xs"
            style={{ width: 60 }}
            value={homeLimit}
            min={1}
            max={100}
            onChange={(e) => setHomeLimit(Number(e.target.value))}
          />
          <button
            type="submit"
            className="px-2 py-1 rounded border text-xs"
            disabled={homeLoading}
          >
            {homeLoading ? "Loading..." : "Load More"}
          </button>
        </form>
        <JsonBox data={homeResp} />
      </Section>

      <Section title="Replies" onLoad={loadReplies} loading={replyLoading}>
        <form
          className="flex items-center gap-2 mb-2"
          onSubmit={(e) => {
            e.preventDefault();
            setReplyCursor(replyCursorInput);
            setTimeout(() => loadReplies(), 0);
          }}
        >
          <label className="text-xs">Cursor:</label>
          <input
            type="text"
            className="border rounded px-1 py-0.5 text-xs"
            style={{ width: 120 }}
            value={replyCursorInput}
            onChange={(e) => setReplyCursorInput(e.target.value)}
            placeholder="cursor"
          />
          <label className="text-xs">Limit:</label>
          <input
            type="number"
            className="border rounded px-1 py-0.5 text-xs"
            style={{ width: 60 }}
            value={replyLimit}
            min={1}
            max={100}
            onChange={(e) => setReplyLimit(Number(e.target.value))}
          />
          <button
            type="submit"
            className="px-2 py-1 rounded border text-xs"
            disabled={replyLoading}
          >
            {replyLoading ? "Loading..." : "Load More"}
          </button>
        </form>
        <JsonBox data={replyResp} />
      </Section>

      <Section title="User Tweets" onLoad={loadUserTweets} loading={userLoading}>
        <form
          className="flex items-center gap-2 mb-2"
          onSubmit={(e) => {
            e.preventDefault();
            setUserCursor(userCursorInput);
            setTimeout(() => loadUserTweets(), 0);
          }}
        >
          <label className="text-xs">Cursor:</label>
          <input
            type="text"
            className="border rounded px-1 py-0.5 text-xs"
            style={{ width: 120 }}
            value={userCursorInput}
            onChange={(e) => setUserCursorInput(e.target.value)}
            placeholder="cursor"
          />
          <label className="text-xs">Limit:</label>
          <input
            type="number"
            className="border rounded px-1 py-0.5 text-xs"
            style={{ width: 60 }}
            value={userLimit}
            min={1}
            max={100}
            onChange={(e) => setUserLimit(Number(e.target.value))}
          />
          <button
            type="submit"
            className="px-2 py-1 rounded border text-xs"
            disabled={userLoading}
          >
            {userLoading ? "Loading..." : "Load More"}
          </button>
        </form>
        <JsonBox data={userResp} />
      </Section>

      <Section title="Popular Tweets" onLoad={loadPopular} loading={popLoading}>
        <form
          className="flex items-center gap-2 mb-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPopCursorLike(popCursorLikeInput);
            setPopCursorId(popCursorIdInput);
            setTimeout(() => loadPopular(), 0);
          }}
        >
          <label className="text-xs">Cursor Like:</label>
          <input
            type="text"
            className="border rounded px-1 py-0.5 text-xs"
            style={{ width: 120 }}
            value={popCursorLikeInput}
            onChange={(e) => setPopCursorLikeInput(e.target.value)}
            placeholder="cursor_like"
          />
          <label className="text-xs">Cursor Id:</label>
          <input
            type="text"
            className="border rounded px-1 py-0.5 text-xs"
            style={{ width: 120 }}
            value={popCursorIdInput}
            onChange={(e) => setPopCursorIdInput(e.target.value)}
            placeholder="cursor_id"
          />
          <label className="text-xs">Limit:</label>
          <input
            type="number"
            className="border rounded px-1 py-0.5 text-xs"
            style={{ width: 60 }}
            value={popLimit}
            min={1}
            max={100}
            onChange={(e) => setPopLimit(Number(e.target.value))}
          />
          <label className="text-xs">Days:</label>
          <input
            type="number"
            className="border rounded px-1 py-0.5 text-xs"
            style={{ width: 60 }}
            value={popDayCount}
            min={1}
            max={365}
            onChange={(e) => setPopDayCount(Number(e.target.value))}
          />
          <button
            type="submit"
            className="px-2 py-1 rounded border text-xs"
            disabled={popLoading}
          >
            {popLoading ? "Loading..." : "Load More"}
          </button>
        </form>
        <JsonBox data={popResp} />
      </Section>

      {/* Log */}
      <section>
        <h2 className="text-xl font-semibold">Log</h2>
        <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto min-h-[120px] whitespace-pre-wrap text-black">
          {log || "(no logs)"}
        </pre>
      </section>
    </main>
  );

  function Section({ title, children, onLoad, loading }) {
    return (
      <section className="space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={onLoad}
            disabled={loading}
            className="px-4 py-2 rounded border"
          >
            {loading ? "Loading..." : "Load"}
          </button>
        </div>
        {children}
      </section>
    );
  }
}