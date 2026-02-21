export type VectorClock = Record<string, number>

export function incrementClock(
  clock: VectorClock,
  region: string
): VectorClock {
  return {
    ...clock,
    [region]: (clock[region] || 0) + 1
  }
}

export function mergeClocks(
  a: VectorClock,
  b: VectorClock
): VectorClock {
  const merged: VectorClock = {}
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])

  for (const k of keys) {
    merged[k] = Math.max(a[k] || 0, b[k] || 0)
  }

  return merged
}
