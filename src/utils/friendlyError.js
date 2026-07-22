/**
 * Extracts a user-actionable message from a caught error/rejection. "Network request failed" is
 * fetch's raw TypeError text when the device has no connectivity — surfacing that verbatim reads
 * as a technical crash message, not something a user can act on.
 */
export function friendlyErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const raw = typeof err === 'string' ? err : err?.message ?? fallback;
  if (/network request failed/i.test(raw)) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }
  return raw;
}
