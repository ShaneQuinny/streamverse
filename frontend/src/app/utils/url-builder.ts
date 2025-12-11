// Utilily used to construct URLs for backend  
export function buildUrl(
  base: string,
  path: string,
  params?: Record<string, any>
): string {
    // Construct the base URL path
    const url = new URL(path, base);

    // If the URL requires parameters, query string, etc... added, we can add them here to be returned
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value.toString());
        }
      });
    }
    
    return url.toString();
}
