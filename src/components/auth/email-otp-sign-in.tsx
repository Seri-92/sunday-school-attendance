"use client";

import { useClerk } from "@clerk/nextjs";
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  createSingleFlight,
  requestSignInEmailCode,
  requestSignUpEmailCode,
} from "./email-otp-flow";

type AuthMode = "sign-in" | "sign-up";

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

type ClerkLikeError = {
  errors?: Array<{
    longMessage?: string;
    message?: string;
    code?: string;
  }>;
};

type SignUpAttemptLike = {
  status?: string | null;
  createdSessionId?: string | null;
  missingFields?: string[];
  unverifiedFields?: string[];
  requiredFields?: string[];
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isClerkLikeError(error: unknown): error is ClerkLikeError {
  return typeof error === "object" && error !== null && "errors" in error;
}

function getErrorMessage(error: unknown) {
  if (
    isClerkLikeError(error) &&
    Array.isArray(error.errors) &&
    error.errors.length > 0
  ) {
    const [firstError] = error.errors;

    return (
      firstError.longMessage ??
      firstError.message ??
      firstError.code ??
      "認証処理に失敗しました。しばらくしてからもう一度お試しください。"
    );
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "認証処理に失敗しました。しばらくしてからもう一度お試しください。";
}

function isSignUpAttemptLike(value: unknown): value is SignUpAttemptLike {
  return typeof value === "object" && value !== null;
}

function formatFieldLabel(field: string) {
  switch (field) {
    case "emailAddress":
    case "email_address":
      return "メールアドレス";
    case "phoneNumber":
    case "phone_number":
      return "電話番号";
    case "firstName":
    case "first_name":
      return "名";
    case "lastName":
    case "last_name":
      return "姓";
    case "username":
      return "ユーザー名";
    case "password":
      return "パスワード";
    default:
      return field;
  }
}

function getSignUpStatusMessage(signUpAttempt: SignUpAttemptLike) {
  const missingFields = Array.isArray(signUpAttempt.missingFields)
    ? signUpAttempt.missingFields
    : [];
  const unverifiedFields = Array.isArray(signUpAttempt.unverifiedFields)
    ? signUpAttempt.unverifiedFields
    : [];

  const details = [
    missingFields.length > 0
      ? `未入力: ${missingFields.map(formatFieldLabel).join("、")}`
      : null,
    unverifiedFields.length > 0
      ? `未検証: ${unverifiedFields.map(formatFieldLabel).join("、")}`
      : null,
  ].filter(Boolean);

  if (details.length > 0) {
    return `登録を完了するには Clerk の必須項目を満たす必要があります。${details.join(" / ")}`;
  }

  return "登録を完了するには Clerk の追加設定が必要です。Clerk Dashboard の User & authentication で必須項目を確認してください。";
}

export function EmailOtpSignIn() {
  const { setActive } = useClerk();
  const { isLoaded: isSignInLoaded, signIn } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp } = useSignUp();
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [signInEmail, setSignInEmail] = useState("");
  const [code, setCode] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [requestedAuth, setRequestedAuth] = useState<{
    email: string;
    mode: AuthMode;
  } | null>(null);
  const requestCodeOnce = useRef(createSingleFlight()).current;
  const verifyCodeOnce = useRef(createSingleFlight()).current;
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
    setRequestedAuth(null);
    setCode("");
  }

  async function requestCode(email: string, authMode: AuthMode) {
    await requestCodeOnce(async () => {
      setIsSending(true);
      resetSubmitState();

      try {
        if (authMode === "sign-in") {
          if (!isSignInLoaded || !signIn) {
            throw new Error(
              "認証の初期化が完了していません。少し待ってから再度お試しください。",
            );
          }

          await requestSignInEmailCode({
            email,
            signIn,
          });
        } else {
          if (!isSignUpLoaded || !signUp) {
            throw new Error(
              "認証の初期化が完了していません。少し待ってから再度お試しください。",
            );
          }

          await requestSignUpEmailCode({
            email,
            signUp,
          });
        }

        setRequestedAuth({
          email,
          mode: authMode,
        });
        setCode("");
        setSubmitState({
          status: "success",
          message:
            authMode === "sign-up"
              ? `${email} に新規登録用の認証コードを送信しました。メールに記載された 6 桁コードを入力してください。`
              : `${email} に認証コードを送信しました。メールに記載された 6 桁コードを入力してください。`,
        });
      } catch (error) {
        setSubmitState({
          status: "error",
          message: getErrorMessage(error),
        });
      } finally {
        setIsSending(false);
      }
    });
  }

  async function handleSendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await requestCode(normalizeEmail(signInEmail), "sign-in");
  }

  async function handleVerifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!requestedAuth) {
      return;
    }

    await verifyCodeOnce(async () => {
      setIsVerifying(true);
      resetSubmitState();

      try {
        if (requestedAuth.mode === "sign-up") {
          if (!isSignUpLoaded || !signUp) {
            throw new Error(
              "認証の初期化が完了していません。少し待ってから再度お試しください。",
            );
          }

          const signUpAttempt = await signUp.attemptEmailAddressVerification({
            code: code.trim(),
          });

          if (
            signUpAttempt.status !== "complete" ||
            !signUpAttempt.createdSessionId
          ) {
            if (isSignUpAttemptLike(signUpAttempt)) {
              throw new Error(getSignUpStatusMessage(signUpAttempt));
            }

            throw new Error(
              "登録を完了できませんでした。Clerk Dashboard の User & authentication 設定を確認してください。",
            );
          }

          await setActive({
            session: signUpAttempt.createdSessionId,
            redirectUrl: "/dashboard",
          });
        } else {
          if (!isSignInLoaded || !signIn) {
            throw new Error(
              "認証の初期化が完了していません。少し待ってから再度お試しください。",
            );
          }

          const signInAttempt = await signIn.attemptFirstFactor({
            strategy: "email_code",
            code: code.trim(),
          });

          if (
            signInAttempt.status !== "complete" ||
            !signInAttempt.createdSessionId
          ) {
            throw new Error(
              "認証コードを確認できませんでした。もう一度コードを送信してください。",
            );
          }

          await setActive({
            session: signInAttempt.createdSessionId,
            redirectUrl: "/dashboard",
          });
        }

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
    });
  }

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await requestCode(normalizeEmail(signUpEmail), "sign-up");
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
            : "メール認証コードだけで新規登録します。教師テーブルに同じメールがあれば、ダッシュボード到達時に自動で紐付きます。"}
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
                value={signInEmail}
                onChange={(event) => setSignInEmail(event.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                placeholder="teacher@example.com"
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

          {requestedAuth?.mode === "sign-in" ? (
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
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, ""))
                  }
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base tracking-[0.35em] text-zinc-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                  placeholder="123456"
                />
                <p className="text-xs leading-5 text-zinc-500">
                  送信先: {requestedAuth.email}
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
        </>
      ) : (
        <>
          <form className="mt-6 space-y-4" onSubmit={handleSignUp}>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-zinc-800"
                htmlFor="sign-up-email"
              >
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

            <div
              id="clerk-captcha"
              data-cl-language="ja-JP"
              data-cl-size="flexible"
              className="overflow-hidden rounded-2xl"
            />

            <button
              type="submit"
              disabled={isSending}
              className="flex w-full items-center justify-center rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {isSending ? "送信中..." : "認証コードを送信して登録へ進む"}
            </button>
          </form>

          {requestedAuth?.mode === "sign-up" ? (
            <form className="mt-6 space-y-4" onSubmit={handleVerifyCode}>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-zinc-800"
                  htmlFor="sign-up-otp"
                >
                  認証コード
                </label>
                <input
                  id="sign-up-otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  minLength={6}
                  maxLength={6}
                  required
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, ""))
                  }
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base tracking-[0.35em] text-zinc-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                  placeholder="123456"
                />
                <p className="text-xs leading-5 text-zinc-500">
                  送信先: {requestedAuth.email}
                </p>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="flex w-full items-center justify-center rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-900 transition hover:border-zinc-900 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400"
              >
                {isVerifying ? "確認中..." : "コードを確認して登録する"}
              </button>
            </form>
          ) : null}
        </>
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
