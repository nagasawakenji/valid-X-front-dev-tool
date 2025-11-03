"use client";

import { useCallback, useMemo, useState, useEffect } from "react";

const BASE = process.env.NEXT_PUBLIC_API || "https://localhost:8443";

// fetch(JSON) ヘルパ
async function jsonFetch(url, options = {}) {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : null;
}

// Cookie 読み出し（withHttpOnlyFalse 前提）
function readCookie(name) {
  if (typeof document === "undefined") return "";
  const hit = document.cookie
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(name + "="));
  return hit ? decodeURIComponent(hit.split("=").slice(1).join("=")) : "";
}

// 以前の Base64 関連のヘルパー関数は削除済み

export default function PostPage() {
  const [accessToken, setAccessToken] = useState("");
  const [content, setContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]); // File[]
  const [previews, setPreviews] = useState([]); // {kind,url,name,type,size}
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState("");

  const appendLog = useCallback((m) => setLog((s) => s + (s ? "\n" : "") + m), []);

  // Cookie から CSRF を読むロジックは維持
  const getCsrf = useCallback(async () => {
    const fromCookie = typeof document !== "undefined" ? readCookie("XSRF-TOKEN") : "";
    if (fromCookie) return fromCookie;

    try {
      await fetch(`${BASE}/v1/auth/csrf`, { credentials: "include" });
    } catch (_) {
      // ネットワークエラーは無視し、最後にもう一度 Cookie を読む
    }
    return typeof document !== "undefined" ? readCookie("XSRF-TOKEN") : "";
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
        // プレビュー用に Blob URL を生成
        return { kind, url: URL.createObjectURL(f), name: f.name, type: f.type, size: f.size }; 
      })
    );
  }, []);

  const canSubmit = useMemo(
    () => !loading && !!accessToken && content.trim().length > 0,
    [loading, accessToken, content]
  );

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    appendLog("[POST] start");
    try {
      const csrf = await getCsrf();
      appendLog(`[DEBUG] csrf=${csrf ? csrf.slice(0,8)+"…" : "(empty)"} files=${selectedFiles.length}`);

      const formData = new FormData();
      
      // 1. PostFormのJSONデータパートを作成 (サーバーの @RequestPart("postForm") に対応)
      const postFormPayload = {
        content: content,
        // スネークケースで記述 (サーバーの DTO へのバインドに必要)
        in_reply_to_tweet: null, 
      };
      
      // JSONをBlobとしてFormDataに追加 (Content-Type: application/json パートとして送信)
      formData.append(
        "postForm", 
        new Blob([JSON.stringify(postFormPayload)], { type: "application/json" })
      );
      
      // 2. 選択された各ファイルを追加 (サーバーの List<MultipartFile> mediaFiles に対応)
      selectedFiles.forEach((file) => {
        // サーバーが期待するフィールド名: "mediaFiles"
        formData.append("mediaFiles", file, file.name); 
      });

      // 3. APIコール
      const res = await fetch(`${BASE}/v1/posts`, {
        method: "POST",
        credentials: "include",
        headers: {
          // Content-Type: multipart/form-data は FormData を body に指定すると自動で設定されるため不要
          "Accept": "application/json",
          "Authorization": `Bearer ${accessToken}`, // アクセストークンは維持
          "X-XSRF-TOKEN": csrf || "", // CSRFトークンは維持
        },
        body: formData, // FormData オブジェクトを送信
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
      }
      appendLog(`[POST] ok: ${(await res.text().catch(()=>"(no body)"))}`);
      setContent(""); 
      setSelectedFiles([]); 
      setPreviews([]);
    } catch (err) {
      appendLog(`[POST] error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [canSubmit, content, accessToken, selectedFiles, getCsrf, appendLog]);

  useEffect(() => {
  // 初回で XSRF-TOKEN を発行させる
  fetch(`${BASE}/v1/auth/csrf`, { credentials: "include" }).catch(() => {});
}, []);

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Post (with images/videos) - Dev UI</h1>

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
        <div>
          <label className="block text-sm font-medium">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="border rounded px-3 py-2 w-full min-h-[120px]"
            placeholder="いまどうしてる？"
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
            className={`px-4 py-2 rounded text-white border ${canSubmit ? "bg-black hover:opacity-90 border-black" : "bg-gray-400 cursor-not-allowed border-gray-400"}`}
          >
            {loading ? "投稿中..." : "投稿する"}
          </button>
          <button
            type="button"
            onClick={() => {
              setContent("");
              setSelectedFiles([]);
              setPreviews([]);
              // Blob URLを解放
              previews.forEach(p => URL.revokeObjectURL(p.url));
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
        ※ Cookie から CSRF を読む実装です。サーバは CookieCsrfTokenRepository.withHttpOnlyFalse を想定。
      </p>
    </main>
  );
}
