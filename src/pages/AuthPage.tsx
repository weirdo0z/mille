import { useState } from "preact/hooks";
import { Logo } from "../components/Logo";
import { schoolStartFromYearMonth, schoolYearOptions } from "../lib/db";
import { supabase } from "../lib/supabase";

export function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [prefecture, setPrefecture] = useState("東京");
  const [schoolYear, setSchoolYear] = useState("");
  const [schoolMonth, setSchoolMonth] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: Event) {
    e.preventDefault();
    if (!supabase || busy) return;
    if (mode === "signup" && (!username.trim() || /\s/.test(username.trim()))) {
      setError("ユーザー名を空白なしで入力してください");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    if (mode === "signup") {
      const schoolStartedAt = schoolStartFromYearMonth(schoolYear, schoolMonth);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.trim(),
            display_name: displayName.trim(),
            prefecture: prefecture.trim() || "東京",
            school_started_at: schoolStartedAt,
          },
        },
      });
      if (error) {
        setError(error.message);
      } else if (!data.session) {
        // 邮箱确认开启时不会立即登录(触发器 handle_new_user 会用 metadata 建 profile)
        setNotice("確認メールを送信しました。リンクをクリックしてからログインしてください。");
      } else if (data.user) {
        // 双保险:触发器缺失/失败时,显式补建 profile 行
        const { error: pErr } = await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            username: username.trim(),
            display_name: displayName.trim(),
            prefecture: prefecture.trim() || "東京",
            school_started_at: schoolStartedAt,
          },
          { onConflict: "id" }
        );
        if (pErr) console.error("profile upsert failed:", pErr.message);
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
                placeholder="ユーザー名(例:mio_days)"
                required
                class="rounded-2xl bg-[#f3edf8] px-4 py-3 text-sm text-[#4a4157] placeholder:text-[#a49bad] focus:outline-none focus:ring-2 focus:ring-[#c8b6e8]"
              />
              <input
                value={displayName}
                onInput={(e) => setDisplayName(e.currentTarget.value)}
                placeholder="表示名(例:mio / みお)"
                class="rounded-2xl bg-[#f3edf8] px-4 py-3 text-sm text-[#4a4157] placeholder:text-[#a49bad] focus:outline-none focus:ring-2 focus:ring-[#c8b6e8]"
              />
              <input
                value={prefecture}
                onInput={(e) => setPrefecture(e.currentTarget.value)}
                placeholder="都道府県(例:東京)"
                class="rounded-2xl bg-[#f3edf8] px-4 py-3 text-sm text-[#4a4157] placeholder:text-[#a49bad] focus:outline-none focus:ring-2 focus:ring-[#c8b6e8]"
              />
              <div>
                <label class="text-[10px] font-bold text-[#8d8498]">高校の入学日(年・月)</label>
                <div class="mt-1 flex gap-2">
                  <select
                    value={schoolYear}
                    onChange={(e) => setSchoolYear((e.currentTarget as HTMLSelectElement).value)}
                    class="flex-1 rounded-2xl bg-[#f3edf8] px-4 py-3 text-sm text-[#4a4157] focus:outline-none focus:ring-2 focus:ring-[#c8b6e8]"
                  >
                    <option value="">-- 年 --</option>
                    {schoolYearOptions().map((y) => (
                      <option key={y} value={y}>
                        {y}年
                      </option>
                    ))}
                  </select>
                  <select
                    value={schoolMonth}
                    onChange={(e) => setSchoolMonth((e.currentTarget as HTMLSelectElement).value)}
                    class="flex-1 rounded-2xl bg-[#f3edf8] px-4 py-3 text-sm text-[#4a4157] focus:outline-none focus:ring-2 focus:ring-[#c8b6e8]"
                  >
                    <option value="">-- 月 --</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {m}月
                      </option>
                    ))}
                  </select>
                </div>
                <p class="mt-1 text-[9px] text-[#a49bad]">
                  「高校生活 N日目」の計算に使います(後から変更できます)
                </p>
              </div>
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
