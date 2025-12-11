//
export function buildUrl(
  base: string,
  path: string,
  params?: Record<string, any>
): string {
    // Construct the base URL path
    const url = new URL(path, base);

    // #TODO (Improve comment): If the URL requires parameters added, do so here
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value.toString());
        }
      });
    }

    return url.toString();
}
