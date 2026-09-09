export function getCronSecret(environment: Record<string, string | undefined>) {
  return environment.CRON_SECRET || environment.GAME_WEEK_CRON_SECRET || null;
}

export function isAuthorizedCronRequest(authorization: string | null, secret: string | null) {
  return Boolean(secret && authorization === `Bearer ${secret}`);
}
