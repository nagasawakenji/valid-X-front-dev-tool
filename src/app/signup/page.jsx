"use client";

import { useState } from "react";

const BASE = process.env.NEXT_PUBLIC_API || "https://localhost:8443";

export default function SignupPage() {
    const [username, setUsername] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [locale, setLocale] = useState("");
    const [timezone, setTimezone] = useState("");
    const [log, setLog] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSignup(e) {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        setLog((s) => (s ? s + "\n" : "") + "[UI] click: signup button");
        if (loading) return; // 二重送信防止
        setLoading(true);
        try {

            // フォーム要素からの読み取り（AutoFill/Safari対策）
            const form = e?.currentTarget;
            let body;
            if (form && form instanceof HTMLFormElement) {
                const fd = new FormData(form);
                body = {
                    username: (fd.get("username") || username || "").toString().trim(),
                    display_name: (fd.get("displayName") || displayName || "").toString().trim(),
                    email: (fd.get("email") || email || "").toString().trim(),
                    password: (fd.get("password") || password || "").toString(),
                    locale: (fd.get("locale") || locale || "").toString().trim(),
                    timezone: (fd.get("timezone") || timezone || "").toString().trim(),
                };
            } else {
                body = { username, display_name: displayName, email, password, locale, timezone };
            }

            console.log("[signup] payload:", body);
            console.log("[signup] json:", JSON.stringify(body));

            // 3) サインアップ実行
            const res = await fetch(`${BASE}/v1/auth/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify(body),
                credentials: "include",
            });

            if (!res.ok) {
                const msg = await res.text();
                throw new Error(`HTTP ${res.status} ${msg}`);
            }

            const result = await res.json().catch(() => ({}));
            setLog((s) => `${s}\n登録完了！\n${JSON.stringify(result, null, 2)}`);
        } catch (e) {
            setLog((s) => `${s}\nエラー: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSignup} className="p-6 space-y-4">
            <h1 className="text-2xl font-bold">Signup Demo (Next.js)</h1>

            <div className="space-y-2">
                <label className="block text-sm font-medium">ユーザー名（username）</label>
                <input
                    name="username"
                    autoComplete="username"
                    className="border rounded px-3 py-2 w-full"
                    placeholder="ユーザー名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onInput={(e) => setUsername(e.currentTarget.value)}
                    required
                />
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium">表示名（displayName）</label>
                <input
                    name="displayName"
                    autoComplete="name"
                    className="border rounded px-3 py-2 w-full"
                    placeholder="表示名"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onInput={(e) => setDisplayName(e.currentTarget.value)}
                    required
                />
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium">メールアドレス</label>
                <input
                    name="email"
                    autoComplete="email"
                    className="border rounded px-3 py-2 w-full"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onInput={(e) => setEmail(e.currentTarget.value)}
                    required
                />
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium">パスワード</label>
                <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    className="border rounded px-3 py-2 w-full"
                    placeholder="パスワード"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onInput={(e) => setPassword(e.currentTarget.value)}
                    required
                />
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium">言語（locale）</label>
                <input
                    name="locale"
                    autoComplete="language"
                    className="border rounded px-3 py-2 w-full"
                    placeholder="ja-JP"
                    value={locale}
                    onChange={(e) => setLocale(e.target.value)}
                    onInput={(e) => setLocale(e.currentTarget.value)}
                />
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium">タイムゾーン（timezone）</label>
                <input
                    name="timezone"
                    autoComplete="timezone"
                    className="border rounded px-3 py-2 w-full"
                    placeholder="Asia/Tokyo"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    onInput={(e) => setTimezone(e.currentTarget.value)}
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 rounded text-white border border-white ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:opacity-90"}`}
            >
                {loading ? "送信中..." : "サインアップ"}
            </button>

            <section>
                <h2 className="font-semibold mb-2">ログ</h2>
                <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto min-h-[120px] whitespace-pre-wrap text-black">
                    {log || "(no logs)"}
                </pre>
            </section>
        </form>
    );
}