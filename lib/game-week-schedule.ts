export type ScheduledWeek = {
  id: string;
  status: "upcoming" | "active";
  starts_at: string;
  ends_at: string;
};

export type GameWeekWork = {
  settleId: string | null;
  activateId: string | null;
  liveId: string | null;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const SNAPSHOT_MAX_AGE_MS = 3 * 60 * 1000;

export function selectGameWeekWork(weeks: ScheduledWeek[], now: Date): GameWeekWork {
  const currentTime = now.getTime();
  const active = weeks
    .filter((week) => week.status === "active")
    .sort((left, right) => Date.parse(left.starts_at) - Date.parse(right.starts_at))[0];

  if (active) {
    return Date.parse(active.ends_at) <= currentTime
      ? { settleId: active.id, activateId: null, liveId: null }
      : { settleId: null, activateId: null, liveId: active.id };
  }

  const due = weeks
    .filter((week) => week.status === "upcoming" && Date.parse(week.starts_at) <= currentTime)
    .sort((left, right) => Date.parse(left.starts_at) - Date.parse(right.starts_at))[0];
  return { settleId: null, activateId: due?.id ?? null, liveId: null };
}

export function minuteBucket(date: Date) {
  const bucket = new Date(date);
  bucket.setUTCSeconds(0, 0);
  return bucket.toISOString();
}

export function isRecentSnapshot(capturedAt: string | null | undefined, now = new Date()) {
  if (!capturedAt) return false;
  const capturedTime = Date.parse(capturedAt);
  return Number.isFinite(capturedTime) && capturedTime <= now.getTime() && now.getTime() - capturedTime < SNAPSHOT_MAX_AGE_MS;
}

export function nextGameWeekWindow(week: Pick<ScheduledWeek, "starts_at" | "ends_at">) {
  const startsAt = new Date(Date.parse(week.starts_at) + WEEK_MS).toISOString();
  return {
    label: `GAME WEEK ${startsAt.slice(0, 10)}`,
    entry_lock_at: startsAt,
    starts_at: startsAt,
    ends_at: new Date(Date.parse(week.ends_at) + WEEK_MS).toISOString(),
  };
}
