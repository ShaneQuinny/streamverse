import { Injectable } from '@angular/core';

/**
 * CacheService used for a lightweight in-memory cache for storing
 * and retrieving poster image URLs for StreamVerse titles.
 *
 * The purpose of this service is to reduce unnecessary network requests
 * for title posters via an External API (https://www.omdbapi.com/) by 
 * caching results during the user's session. Since the cache is memory-based 
 * it resets automatically whenever the application reloads, ensuring
 * that data never becomes stale across sessions.
 *
 */
@Injectable({
  providedIn: 'root',
})

export class CacheService {
  /** Internal key/value store for cached poster URLs, indexed by titleId. */
  private cache: { [key: string]: string } = {};

  /**
   * Retrieves a cached poster URL for a given title ID.
   *
   * @param titleId The unique identifier for the title.
   * @returns The cached poster URL, or `null` if none exists.
   */
  get(titleId: string): string | null {
    return this.cache[titleId] || null;
  }

  /**
   * Stores a poster URL in the cache for the specified title.
   *
   * @param titleId The unique ID of the title.
   * @param posterUrl The resolved URL of the title's poster image.
   */
  set(titleId: string, posterUrl: string): void {
    this.cache[titleId] = posterUrl;
  }

  /**
   * Checks whether a poster URL is already cached for the given title.
   *
   * @param titleId The title's unique identifier.
   * @returns true if a cached value exists, otherwise false.
   */
  has(titleId: string): boolean {
    return !!this.cache[titleId];
  }
}