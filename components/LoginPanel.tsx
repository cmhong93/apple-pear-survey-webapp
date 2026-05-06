import { useState } from "react";
import type { AuthUser } from "@/lib/auth";

type LoginPanelProps = {
  onLogin: (user: AuthUser) => void;
};

export default function LoginPanel({ onLogin }: LoginPanelProps) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, password }),
    });

    if (!response.ok) {
      setError("로그인 정보를 확인해 주세요.");
      return;
    }

    const payload = (await response.json()) as { user: AuthUser };
    onLogin(payload.user);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100 p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded border bg-white p-5 shadow-sm"
      >
        <h1 className="mb-4 text-lg font-bold text-gray-950">조사표 로그인</h1>
        <label className="mb-3 block text-sm font-medium text-gray-700">
          사용자 ID
          <input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            autoComplete="username"
          />
        </label>
        <label className="mb-4 block text-sm font-medium text-gray-700">
          비밀번호
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            type="password"
            autoComplete="current-password"
          />
        </label>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white"
        >
          로그인
        </button>
      </form>
    </div>
  );
}
