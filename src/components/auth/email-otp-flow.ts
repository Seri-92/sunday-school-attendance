type EmailCodeFactorLike = {
  strategy: string;
  emailAddressId?: string;
};

type SignInAttemptLike = {
  supportedFirstFactors?: EmailCodeFactorLike[] | null;
  prepareFirstFactor(params: {
    strategy: "email_code";
    emailAddressId: string;
  }): Promise<unknown>;
};

type SignInLike = {
  create(params: { identifier: string }): Promise<SignInAttemptLike>;
};

export async function requestSignInEmailCode({
  email,
  signIn,
}: {
  email: string;
  signIn: SignInLike;
}) {
  const signInAttempt = await signIn.create({
    identifier: email,
  });
  const emailCodeFactor = signInAttempt.supportedFirstFactors?.find(
    (factor) => factor.strategy === "email_code",
  );
  const emailAddressId =
    emailCodeFactor && typeof emailCodeFactor.emailAddressId === "string"
      ? emailCodeFactor.emailAddressId
      : null;

  if (!emailAddressId) {
    throw new Error(
      "このメールアドレスでは email OTP のサインインを開始できません。Clerk の Email address / Email code 設定を確認してください。",
    );
  }

  await signInAttempt.prepareFirstFactor({
    strategy: "email_code",
    emailAddressId,
  });
}

export function createSingleFlight() {
  let isRunning = false;

  return async function runSingleFlight<T>(task: () => Promise<T>) {
    if (isRunning) {
      return undefined;
    }

    isRunning = true;

    try {
      return await task();
    } finally {
      isRunning = false;
    }
  };
}
