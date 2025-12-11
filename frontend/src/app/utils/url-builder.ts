/**
 * Builds the Streamverse API URL by combining a base URL,
 * a relative path, and optional query parameters.
 *
 * This utility ensures consistent URL construction across the application,
 * especially when interacting with the Streamverse API for titles, reviews,
 * authentication and admin actions,
 *
 * @param base  The backend base URL (e.g., environment.apiUrl).
 * @param path  The API endpoint path to append to the base URL.
 * @param params Optional key/value pairs to be appended as query parameters.
 *               Only non-null, non-undefined values are included.
 *
 * @returns A fully constructed URL string ready to call the Streamverse API.
 *
 * @example
 * // Builds: http://localhost:5000/api/v1.0//titles?pn=2&ps=9
 * buildUrl("http://localhost:5000/api/v1.0/", "title", { pn: 2, ps: 9 });
 *
 */
export function buildUrl(base: string, path: string, params?: Record<string, any>): string {
  const url = new URL(path, base);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value.toString());
      }
    });
  }

  return url.toString();
}