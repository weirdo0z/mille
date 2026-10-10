import { useState } from "preact/hooks";
import { Logo } from "../components/Logo";
import { supabase } from "../lib/supabase";

export function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: Event) {
    e.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username, display_name: displayName } },
      });
      if (error) {
        setError(error.message);
      } else if (!data.session) {
        // 邮箱确认开启时不会立即登录
        setNotice("確認メールを送信しました。リンクをクリックしてからログインしてください。");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
    setBusy(false);
  }

  return (
    <main class="flex min-h-screen items-center justify-center bg-[#f5f0f9] p-6 text-[#342c45]">
      <div class="w-full max-w-[380px] rounded-[32px] bg-[#fffaf7] p-8 shadow-2xl shadow-[#5f4c78]/10">
        <div class="flex justify-center">
          <Logo />
        </div>
        <p class="mt-2 text-center text-[11px] font-bold tracking-[0.18em] text-[#9a83c7]">
          1000日間の思い出を集めるSNS
        </p>
        <form onSubmit={submit} class="mt-7 flex flex-col gap-3">
          {mode === "signup" && (
            <>
              <input
                value={username}
                onInput={(e) => setUsername(e.currentTarget.value)}
                placeholder="ユーザー名(例:mio)"
                required
                class="rounded-2xl bg-[#f3edf8] px-4 py-3 text-sm text-[#4a4157] placeholder:text-[#a49bad] focus:outline-none focus:ring-2 focus:ring-[#c8b6e8]"
              />
              <input
                value={displayName}
                onInput={(e) => setDisplayName(e.currentTarget.value)}
                placeholder="表示名(例:mio / みお)"
                class="rounded-2xl bg-[#f3edf8] px-4 py-3 text-sm text-[#4a4157] placeholder:text-[#a49bad] focus:outline-none focus:ring-2 focus:ring-[#c8b6e8]"
              />
            </>
          )}
          <input
            type="email"
            value={email}
            onInput={(e) => setEmail(e.currentTarget.value)}
            placeholder="メールアドレス"
            required
            class="rounded-2xl bg-[#f3edf8] px-4 py-3 text-sm text-[#4a4157] placeholder:text-[#a49bad] focus:outline-none focus:ring-2 focus:ring-[#c8b6e8]"
          />
          <input
            type="password"
            value={password}
            onInput={(e) => setPassword(e.currentTarget.value)}
            placeholder="パスワード"
            required
            minLength={6}
            class="rounded-2xl bg-[#f3edf8] px-4 py-3 text-sm text-[#4a4157] placeholder:text-[#a49bad] focus:outline-none focus:ring-2 focus:ring-[#c8b6e8]"
          />
          {error && <p class="text-[12px] font-bold text-[#e2574c]">{error}</p>}
          {notice && <p class="text-[12px] font-bold text-[#6a4d92]">{notice}</p>}
          <button
            type="submit"
            disabled={busy}
            class="mt-2 rounded-full bg-[#f38178] py-3 text-[13px] font-bold text-white shadow-lg shadow-[#f38178]/30 disabled:opacity-40"
          >
            {busy ? "処理中..." : mode === "signup" ? "登録する" : "ログイン"}
          </button>
        </form>
        <button
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError("");
            setNotice("");
          }}
          class="mt-4 w-full text-center text-[12px] font-bold text-[#9a83c7]"
        >
          {mode === "signup" ? "アカウントをお持ちの方はログイン" : "はじめての方は登録"}
        </button>
      </div>
    </main>
  );
}
