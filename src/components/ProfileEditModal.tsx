import { useRef, useState } from "preact/hooks";
import { Camera } from "../icons";
import { schoolStartFromYearMonth, schoolYearOptions, type DbProfile } from "../lib/db";

export interface ProfileEditData {
  displayName: string;
  username: string;
  prefecture: string;
  schoolStartedAt: string | null;
  avatar: File | null;
}

export function ProfileEditModal({
  profile,
  onClose,
  onSave,
}: {
  profile: DbProfile | null;
  onClose: () => void;
  onSave: (data: ProfileEditData) => Promise<string | null>;
}) {
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [prefecture, setPrefecture] = useState(profile?.prefecture || "東京");
  const [schoolYear, setSchoolYear] = useState(profile?.school_started_at?.slice(0, 4) || "");
  const [schoolMonth, setSchoolMonth] = useState(profile?.school_started_at?.slice(5, 7) || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    profile?.avatar_url || null
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickAvatar(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function submit(e: Event) {
    e.preventDefault();
    if (busy) return;
    if (!username.trim() || /\s/.test(username.trim())) {
      setError("ユーザー名を空白なしで入力してください");
      return;
    }
    setBusy(true);
    setError("");
    const err = await onSave({
      displayName: displayName.trim(),
      username: username.trim(),
      prefecture: prefecture.trim() || "東京",
      schoolStartedAt: schoolStartFromYearMonth(schoolYear, schoolMonth),
      avatar: avatarFile,
    });
    setBusy(false);
    if (err) setError(err);
    else onClose();
  }

  return (
    <div class="fixed inset-0 z-40 flex items-center justify-center p-6">
      <div class="absolute inset-0 bg-[#342c45]/40 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={submit}
        class="relative w-full max-w-[380px] rounded-[28px] bg-[#fffaf7] p-6 shadow-2xl"
      >
        <h2 class="font-display text-xl font-bold">プロフィール編集</h2>
        <p class="mt-1 text-[11px] font-bold tracking-widest text-[#9a83c7]">PROFILE</p>
        <div class="mt-4 flex justify-center">
          <button type="button" onClick={() => fileRef.current?.click()} class="relative">
            <img
              src={avatarPreview || "https://i.pravatar.cc/150?img=25"}
              alt="プロフィール画像"
              class="size-24 rounded-full border-4 border-white object-cover shadow-md"
            />
            <span class="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full bg-[#f38178] text-white shadow-lg">
              <Camera class="size-4" />
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            class="hidden"
            onChange={pickAvatar}
          />
        </div>
        <div class="mt-4 flex flex-col gap-3">
          <input
            value={displayName}
            onInput={(e) => setDisplayName(e.currentTarget.value)}
            placeholder="表示名(例:mio / みお)"
            class="rounded-2xl bg-[#f3edf8] px-4 py-3 text-sm text-[#4a4157] placeholder:text-[#a49bad] focus:outline-none focus:ring-2 focus:ring-[#c8b6e8]"
          />
          <input
            value={username}
            onInput={(e) => setUsername(e.currentTarget.value)}
            placeholder="ユーザー名(例:mio_days)"
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
            <p class="mt-1 text-[9px] text-[#a49bad]">「高校生活 N日目」の計算に使います</p>
          </div>
        </div>
        {error && <p class="mt-2 text-[12px] font-bold text-[#e2574c]">{error}</p>}
        <div class="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            class="flex-1 rounded-full bg-[#f1ebf7] py-3 text-[13px] font-bold text-[#6d647d]"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={busy}
            class="flex-1 rounded-full bg-[#f38178] py-3 text-[13px] font-bold text-white shadow-lg shadow-[#f38178]/30 disabled:opacity-40"
          >
            {busy ? "保存中..." : "保存する"}
          </button>
        </div>
      </form>
    </div>
  );
}
