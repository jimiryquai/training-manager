/**
 * Shared service helpers to eliminate boilerplate duplication
 * across all service files.
 */

/**
 * Generate a new UUID v4 for record IDs.
 * Wraps crypto.randomUUID() for consistency and future extensibility.
 */
export function createId(): string {
  return crypto.randomUUID();
}

/**
 * Get the current timestamp in ISO 8601 format.
 * Wraps new Date().toISOString() for consistency.
 */
export function nowISO(): string {
  return new Date().toISOString();
}
