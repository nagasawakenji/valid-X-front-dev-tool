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

// 以前の Base64 関連のヘルパー関数は削除しました。

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

  // 初回に XSRF-TOKEN を Cookie に発行
  useEffect(() => {
    // CSRFトークンの取得を試みる (getCsrf内で実行されるため、ここでは不要だが念のため維持)
    getCsrf();
  }, [getCsrf]);

  const onFilesSelected = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    // 古い Blob URL を解放
    previews.forEach(p => URL.revokeObjectURL(p.url)); 

    setSelectedFiles(files);
    setPreviews(
      files.map((f) => {
        const kind = f.type.startsWith("video/")
          ? "video"
          : f.type.startsWith("image/")
          ? "image"
          : "other";
        // プレビュー用に Blob URL を生成
        return {
          kind,
          url: URL.createObjectURL(f),
          name: f.name,
          type: f.type,
          size: f.size,
        };
      })
    );
  }, [previews]); // previewsを依存配列に追加してBlob URLを適切に管理

  const canSubmit = useMemo(() => {
    const hasContent = content.trim().length > 0;
    // replyToIdが空でないことを確認
    const hasReplyId = String(replyToId).trim().length > 0 && !isNaN(Number(replyToId)); 
    return !loading && !!accessToken && hasContent && hasReplyId;
  }, [loading, accessToken, content, replyToId]);


  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!canSubmit) return;

      setLoading(true);
      appendLog("[REPLY] start");

      try {
        const csrf = await getCsrf(); // CSRFトークンをここで取得
        const targetTweetId = String(replyToId).trim();
        
        if (!targetTweetId) {
             throw new Error("Reply ID is missing.");
        }
        
        appendLog(
          `[DEBUG] csrf=${csrf ? csrf.slice(0, 8) + "…" : "(empty)"} files=${
            selectedFiles.length
          } replyTo=${targetTweetId}`
        );

        const formData = new FormData();
        
        // 1. PostFormのJSONデータパートを作成 (サーバーの @RequestPart("postForm") に対応)
        const postFormPayload = {
          content: content,
          // ★ スネークケースで記述。Controllerの@RequestPart分離により、in_reply_to_tweetは不要だが、
          // DTOが保持している場合のために含める
          in_reply_to_tweet: Number(targetTweetId), 
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
        // URLは /v1/tweets/{tweetId}/reply を使用
        const res = await fetch(`${BASE}/v1/tweets/${targetTweetId}/reply`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${accessToken}`,
            "X-XSRF-TOKEN": csrf || "",
            // Content-TypeはFormDataを使用するため設定しない
          },
          body: formData,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
        }

        appendLog(`[REPLY] ok: ${(await res.text().catch(()=>"")) || "(no body)"}`);
        // リセット
        setContent("");
        setReplyToId("");
        // Blob URLの解放
        previews.forEach(p => URL.revokeObjectURL(p.url));
        setSelectedFiles([]);
        setPreviews([]);
      } catch (err) {
        appendLog(`[REPLY] error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    },
    [canSubmit, content, replyToId, accessToken, selectedFiles, getCsrf, appendLog, previews]
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
              // Blob URLの解放
              previews.forEach(p => URL.revokeObjectURL(p.url));
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
