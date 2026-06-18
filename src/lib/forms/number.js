// Shared UX helpers for whole-number ("Qty") inputs. Keeps the native
// type="number" control but removes its rough edges:
//   - blockNonInteger: stop "e"/"E"/"+"/"-"/"." from ever being typed
//   - blurOnWheel: stop scroll-wheel from silently changing the value
//   - clampInt: coerce to an integer within [min, max]

export function blockNonInteger(e) {
  if (["e", "E", "+", "-", "."].includes(e.key)) e.preventDefault();
}

export function blurOnWheel(e) {
  e.currentTarget.blur();
}

export function clampInt(value, min, max) {
  let n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) n = min ?? 0;
  if (min != null && n < min) n = min;
  if (max != null && n > max) n = max;
  return n;
}
