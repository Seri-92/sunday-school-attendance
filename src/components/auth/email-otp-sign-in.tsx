"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";

type NeonEmailOtpClient = {
  signIn: {
    emailOtp: (params: {
      email: string;
      otp: string;
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "認証処理に失敗しました。しばらくしてからもう一度お試しください。";
}

type OtpRequestResponse =
  | {
      success: true;
    }
  | {
      error?: string;
      requestId?: string | null;
    };

function isOtpRequestSuccess(
  data: OtpRequestResponse | null,
): data is { success: true } {
  return Boolean(data && "success" in data && data.success);
}

export function EmailOtpSignIn() {
  const router = useRouter();
  const neonClient = authClient as unknown as NeonEmailOtpClient;
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [requestedEmail, setRequestedEmail] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
    message: null,
  });

  async function handleSendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    setIsSending(true);
    setSubmitState({
      status: "idle",
      message: null,
    });

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
        const requestId =
          errorData?.requestId
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
    setSubmitState({
      status: "idle",
      message: null,
    });

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

  return (
    <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-700">
          Sunday School Attendance
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
          メール認証コードでログイン
        </h1>
        <p className="text-sm leading-6 text-zinc-600">
          登録済みのメールアドレス宛に 6 桁の認証コードを送信します。コード確認後、そのままダッシュボードへ移動します。
        </p>
      </div>

      <form className="mt-8 space-y-4" onSubmit={handleSendCode}>
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-zinc-800"
            htmlFor="email"
          >
            メールアドレス
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
            <label
              className="text-sm font-medium text-zinc-800"
              htmlFor="otp"
            >
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
            <p className="text-xs leading-5 text-zinc-500">
              送信先: {requestedEmail}
            </p>
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
