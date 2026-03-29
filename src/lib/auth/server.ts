import "server-only";

import { createNeonAuth } from "@neondatabase/auth/next/server";
import { getNeonAuthBaseUrl, getNeonAuthCookieSecret } from "@/lib/env";

export const auth = createNeonAuth({
  baseUrl: getNeonAuthBaseUrl(),
  cookies: {
    secret: getNeonAuthCookieSecret(),
    sessionDataTtl: 300,
  },
});
