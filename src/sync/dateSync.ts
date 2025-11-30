export const isSyncStale = (lastSyncDateStr: string | null, maxAgeHours = 3): boolean => {
  if (!lastSyncDateStr) return true;

  const lastSync = new Date(lastSyncDateStr);
  const now = new Date();
  const diffMs = now.getTime() - lastSync.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  return diffHours >= maxAgeHours;
};