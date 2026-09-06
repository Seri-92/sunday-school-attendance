export function isCronRequestAuthorized(
  authorization: string | null,
  cronSecret: string | undefined,
) {
  return Boolean(cronSecret && authorization === `Bearer ${cronSecret}`);
}
