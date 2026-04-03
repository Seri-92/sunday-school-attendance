"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";

type AuthMode = "sign-in" | "sign-up";

type NeonAuthClient = {
  signIn: {
    emailOtp: (params: {
      email: string;
      otp: string;
      fetchOptions?: {
        throw?: boolean;
      };
    }) => Promise<unknown>;
  };
  signUp: {
    email: (params: {
      name: string;
      email: string;
      password: string;
      fetchOptions?: {
        throw?: boolean;
      };
    }) => Promise<unknown>;
  };
};

type SubmitState =
  | {
      status: "idle";
      message: null;
    }
  | {
      status: "success";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

type OtpRequestResponse =
  | {
      success: true;
    }
  | {
      error?: string;
      requestId?: string | null;
    };

type SignUpResponse = {
  token: string | null;
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    name: string;
  };
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "認証処理に失敗しました。しばらくしてからもう一度お試しください。";
}

function isOtpRequestSuccess(
  data: OtpRequestResponse | null,
): data is { success: true } {
  return Boolean(data && "success" in data && data.success);
}

function hasSignUpResponse(value: unknown): value is SignUpResponse {
  return Boolean(
    value &&
      typeof value === "object" &&
      "token" in value &&
      "user" in value,
  );
}

export function EmailOtpSignIn() {
  const router = useRouter();
  const neonClient = authClient as unknown as NeonAuthClient;
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [signInEmail, setSignInEmail] = useState("");
  const [code, setCode] = useState("");
  const [requestedEmail, setRequestedEmail] = useState<string | null>(null);
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
    message: null,
  });

  function resetSubmitState() {
    setSubmitState({
      status: "idle",
      message: null,
    });
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    resetSubmitState();
    setRequestedEmail(null);
    setCode("");
  }

  async function handleSendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = signInEmail.trim().toLowerCase();

    setIsSending(true);
    resetSubmitState();

    try {
      const response = await fetch("/api/auth/email-otp/request", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
        }),
      });
      const data = (await response.json().catch(() => null)) as OtpRequestResponse | null;

      if (!response.ok || !isOtpRequestSuccess(data)) {
        const errorData = isOtpRequestSuccess(data) ? null : data;
        const errorMessage =
          errorData?.error ??
          "認証コードの送信に失敗しました。しばらくしてからもう一度お試しください。";
        const requestId = errorData?.requestId
          ? ` (request id: ${errorData.requestId})`
          : "";

        throw new Error(`${errorMessage}${requestId}`);
      }

      setRequestedEmail(normalizedEmail);
      setCode("");
      setSubmitState({
        status: "success",
        message: `${normalizedEmail} に認証コードを送信しました。メールに記載された 6 桁コードを入力してください。`,
      });
    } catch (error) {
      setSubmitState({
        status: "error",
        message: getErrorMessage(error),
      });
    } finally {
      setIsSending(false);
    }
  }

  async function handleVerifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!requestedEmail) {
      return;
    }

    setIsVerifying(true);
    resetSubmitState();

    try {
      await neonClient.signIn.emailOtp({
        email: requestedEmail,
        otp: code.trim(),
        fetchOptions: {
          throw: true,
        },
      });

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setSubmitState({
        status: "error",
        message: getErrorMessage(error),
      });
      setCode("");
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSigningUp(true);
    resetSubmitState();

    try {
      const result = await neonClient.signUp.email({
        name: signUpName.trim(),
        email: signUpEmail.trim().toLowerCase(),
        password: signUpPassword,
        fetchOptions: {
          throw: true,
        },
      });

      if (hasSignUpResponse(result) && result.token) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      switchMode("sign-in");
      setSignInEmail(signUpEmail.trim().toLowerCase());
      setSubmitState({
        status: "success",
        message:
          "アカウントを作成しました。続けて認証コードでログインしてください。",
      });
    } catch (error) {
      setSubmitState({
        status: "error",
        message: getErrorMessage(error),
      });
    } finally {
      setIsSigningUp(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-700">
          Sunday School Attendance
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
          {mode === "sign-in" ? "ログイン" : "新規登録"}
        </h1>
        <p className="text-sm leading-6 text-zinc-600">
          {mode === "sign-in"
            ? "登録済みのメールアドレス宛に 6 桁の認証コードを送信します。コード確認後、そのままダッシュボードへ移動します。"
            : "Neon Auth に新しいユーザーを作成します。教師テーブルに同じメールがあれば、ダッシュボード到達時に自動で紐付きます。"}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 rounded-2xl bg-zinc-100 p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => switchMode("sign-in")}
          className={`rounded-xl px-4 py-2 transition ${
            mode === "sign-in"
              ? "bg-white text-zinc-950 shadow-sm"
              : "text-zinc-600"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => switchMode("sign-up")}
          className={`rounded-xl px-4 py-2 transition ${
            mode === "sign-up"
              ? "bg-white text-zinc-950 shadow-sm"
              : "text-zinc-600"
          }`}
        >
          Sign up
        </button>
      </div>

      {mode === "sign-in" ? (
        <>
          <form className="mt-6 space-y-4" onSubmit={handleSendCode}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-800" htmlFor="email">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={signInEmail}
                onChange={(event) => setSignInEmail(event.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                placeholder="sh192b@gmail.com"
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {isSending ? "送信中..." : "認証コードを送信"}
            </button>
          </form>

          {requestedEmail ? (
            <form className="mt-6 space-y-4" onSubmit={handleVerifyCode}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-800" htmlFor="otp">
                  認証コード
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  minLength={6}
                  maxLength={6}
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base tracking-[0.35em] text-zinc-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                  placeholder="123456"
                />
                <p className="text-xs leading-5 text-zinc-500">送信先: {requestedEmail}</p>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="flex w-full items-center justify-center rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-900 transition hover:border-zinc-900 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400"
              >
                {isVerifying ? "確認中..." : "コードを確認してログイン"}
              </button>
            </form>
          ) : null}
        </>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleSignUp}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-800" htmlFor="name">
              表示名
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={signUpName}
              onChange={(event) => setSignUpName(event.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
              placeholder="山田 太郎"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-800" htmlFor="sign-up-email">
              メールアドレス
            </label>
            <input
              id="sign-up-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={signUpEmail}
              onChange={(event) => setSignUpEmail(event.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
              placeholder="teacher@example.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-800" htmlFor="password">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={signUpPassword}
              onChange={(event) => setSignUpPassword(event.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
              placeholder="8文字以上で入力"
            />
          </div>

          <button
            type="submit"
            disabled={isSigningUp}
            className="flex w-full items-center justify-center rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {isSigningUp ? "登録中..." : "新規登録する"}
          </button>
        </form>
      )}

      {submitState.status !== "idle" && submitState.message ? (
        <p
          className={`mt-4 rounded-2xl px-4 py-3 text-sm leading-6 ${
            submitState.status === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {submitState.message}
        </p>
      ) : null}
    </div>
  );
}
