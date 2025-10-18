"use client";

import { useCallback, useMemo, useState, useEffect } from "react";

const BASE = process.env.NEXT_PUBLIC_API || "https://localhost:8443";

// 汎用 JSON fetch
async function jsonFetch(url, options = {}) {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : null;
}

// Cookie 読み
function readCookie(name) {
  if (typeof document === "undefined") return "";
  const hit = document.cookie
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(name + "="));
  return hit ? decodeURIComponent(hit.split("=").slice(1).join("=")) : "";
}

// File → data:URL
function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = (e) => reject(e);
    fr.readAsDataURL(file);
  });
}

// data:URL から画像メタ
async function getImageMetaFromDataUrl(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve({
        width: img.naturalWidth || img.width || null,
        height: img.naturalHeight || img.height || null,
      });
    img.onerror = () => resolve({ width: null, height: null });
    img.src = dataUrl;
  });
}

// File から動画メタ
async function getVideoMetaFromFile(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth || null,
        height: video.videoHeight || null,
        durationMs: Number.isFinite(video.duration)
          ? Math.round(video.duration * 1000)
          : null,
      });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: null, height: null, durationMs: null });
    };
    video.src = url;
  });
}

export default function ReplyPage() {
  const [accessToken, setAccessToken] = useState("");
  const [content, setContent] = useState("");
  const [replyToId, setReplyToId] = useState(""); // ← 返信先 tweetId 入力欄
  const [selectedFiles, setSelectedFiles] = useState([]); // File[]
  const [previews, setPreviews] = useState([]); // {kind,url,name,type,size}
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState("");

  const appendLog = useCallback(
    (m) => setLog((s) => s + (s ? "\n" : "") + m),
    []
  );

  // 初回に XSRF-TOKEN を Cookie に発行
  useEffect(() => {
    fetch(`${BASE}/v1/auth/csrf`, { credentials: "include" }).catch(() => {});
  }, []);

  const onFilesSelected = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    setPreviews(
      files.map((f) => {
        const kind = f.type.startsWith("video/")
          ? "video"
          : f.type.startsWith("image/")
          ? "image"
          : "other";
        return {
          kind,
          url: URL.createObjectURL(f),
          name: f.name,
          type: f.type,
          size: f.size,
        };
      })
    );
  }, []);

  const buildMediasPayload = useCallback(async () => {
    const payload = [];
    for (const file of selectedFiles) {
      const isImg = file.type.startsWith("image/");
      const isVid = file.type.startsWith("video/");
      if (!isImg && !isVid) {
        appendLog(`skip unsupported: ${file.type} (${file.name})`);
        continue;
      }

      const dataUrl = await readAsDataURL(file);
      if (!dataUrl || !dataUrl.startsWith("data:")) {
        appendLog(`[NG] dataUrl not generated for ${file.name}`);
        throw new Error("dataUrl generation failed");
      }
      appendLog(
        `[OK] dataUrl generated: ${file.name} (${dataUrl.slice(0, 32)}…)`
      );

      let width = null,
        height = null,
        durationMs = null;
      try {
        if (isImg) {
          const m = await getImageMetaFromDataUrl(dataUrl);
          width = m.width;
          height = m.height;
        } else {
          const m = await getVideoMetaFromFile(file);
          width = m.width;
          height = m.height;
          durationMs = m.durationMs;
        }
      } catch (e) {
        appendLog(`meta error: ${file.name} - ${e.message}`);
      }

      // サーバは SNAKE_CASE を受け取る前提
      payload.push({
        data_url: dataUrl,
        mime_type: file.type || undefined,
        width: width ?? undefined,
        height: height ?? undefined,
        duration_ms: durationMs ?? undefined,
      });
    }
    appendLog(`[DEBUG] medias built: ${payload.length}`);
    return payload;
  }, [selectedFiles, appendLog]);

  const canSubmit = useMemo(() => {
    const hasContent = content.trim().length > 0;
    const hasReplyId = String(replyToId).trim().length > 0;
    return !loading && !!accessToken && hasContent && hasReplyId;
  }, [loading, accessToken, content, replyToId]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!canSubmit) return;

      setLoading(true);
      appendLog("[REPLY] start");

      try {
        const csrf = readCookie("XSRF-TOKEN");
        appendLog(
          `[DEBUG] csrf=${csrf ? csrf.slice(0, 8) + "…" : "(empty)"} files=${
            selectedFiles.length
          } replyTo=${replyToId}`
        );

        const medias = await buildMediasPayload();
        if (selectedFiles.length > 0 && medias.length === 0) {
          throw new Error("No medias built for selected files");
        }
        if (medias[0]?.data_url) {
          appendLog(
            `[DEBUG] medias[0].data_url head=${medias[0].data_url.slice(
              0,
              32
            )}…`
          );
        }

        // ★ 返信先を in_reply_to_tweet で送る（SNAKE_CASE）
        const body = {
          content,
          in_reply_to_tweet: Number(replyToId),
          medias,
        };

        const res = await fetch(`${BASE}/v1/tweets/${replyToId}/reply`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
            "X-XSRF-TOKEN": csrf || "",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
        }

        appendLog(`[REPLY] ok: ${(await res.text().catch(()=>"")) || "(no body)"}`);
        // リセット
        setContent("");
        setReplyToId("");
        setSelectedFiles([]);
        setPreviews([]);
      } catch (err) {
        appendLog(`[REPLY] error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    },
    [canSubmit, content, replyToId, accessToken, selectedFiles.length, buildMediasPayload, appendLog]
  );

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Reply (with images/videos) - Dev UI</h1>

      {/* アクセストークン */}
      <div className="space-y-1">
        <label className="block text-sm font-medium">Access Token (Bearer)</label>
        <input
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          placeholder="Paste JWT here"
          className="border rounded px-3 py-2 w-full"
          autoComplete="off"
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 返信先 tweetId */}
        <div className="space-y-1">
          <label className="block text-sm font-medium">Reply to Tweet ID</label>
          <input
            type="number"
            value={replyToId}
            onChange={(e) => setReplyToId(e.target.value)}
            className="border rounded px-3 py-2 w-full"
            placeholder="例: 123"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="border rounded px-3 py-2 w-full min-h-[120px]"
            placeholder="返信内容を入力"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Attach media (image/video)</label>
          <input type="file" accept="image/*,video/*" multiple onChange={onFilesSelected} />
          {previews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {previews.map((m, i) => (
                <div key={i} className="border rounded p-2">
                  <div className="text-xs mb-1 break-all">{m.name}</div>
                  {m.kind === "image" ? (
                    <img src={m.url} alt={m.name} className="w-full h-32 object-cover rounded" />
                  ) : m.kind === "video" ? (
                    <video src={m.url} className="w-full h-32 rounded" controls />
                  ) : (
                    <div className="text-xs text-gray-500">Unsupported: {m.type}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className={`px-4 py-2 rounded text-white border ${
              canSubmit
                ? "bg-black hover:opacity-90 border-black"
                : "bg-gray-400 cursor-not-allowed border-gray-400"
            }`}
          >
            {loading ? "返信中..." : "返信する"}
          </button>
          <button
            type="button"
            onClick={() => {
              setContent("");
              setReplyToId("");
              setSelectedFiles([]);
              setPreviews([]);
              appendLog("[UI] cleared");
            }}
            className="px-4 py-2 rounded border"
          >
            クリア
          </button>
        </div>
      </form>

      <section>
        <h2 className="font-semibold mb-2">Log</h2>
        <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto min-h-[120px] whitespace-pre-wrap text-black">
{log || "(no logs)"}
        </pre>
      </section>

      <p className="text-xs text-gray-500">
        ※ Cookie から CSRF を読む実装です。サーバは CookieCsrfTokenRepository.withHttpOnlyFalse を想定。本文や media は SNAKE_CASE で送信しています。
      </p>
    </main>
  );
}