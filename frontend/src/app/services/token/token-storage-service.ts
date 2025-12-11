import { Injectable } from '@angular/core';

/**
 * TokenStorageService that handles all storage operations
 * for the StreamVerse authentication tokens and expiration state.
 *
 * This service provides a more central and consistent class for reading
 * and writing access tokens and expiration timestamps used throughout the 
 * StreamVerse FE to the localStorage.
 *
 */
@Injectable({
  providedIn: 'root',
})

export class TokenStorageService {
  /** Storage key for the JWT access token. */
  private readonly ACCESS_KEY = 'access_token';

  /** Storage key for the token expiration timestamp. */
  private readonly EXP_KEY = 'expiration';

  /**
   * Retrieves the current access token from storage.
   *
   * @returns The stored access token, or null if not present.
   */
  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_KEY);
  }

  /**
   * Retrieves the stored expiration timestamp for the access token.
   *
   * @returns The expiration value as a string, or null if not present.
   */
  getExpiration(): string | null {
    return localStorage.getItem(this.EXP_KEY);
  }

  /**
   * Stores the access token and expiration timestamp.
   *
   * @param accessToken The new access token.
   * @param expiration  Unix timestamp representing token expiry.
   */
  setTokens(accessToken: string, expiration?: number): void {
    localStorage.setItem(this.ACCESS_KEY, accessToken);
    if (expiration) {
      localStorage.setItem(this.EXP_KEY, String(expiration));
    }
  }

  /**
   * Updates only the access token and expiration timestamp.  
   *
   * @param accessToken The new access token to store.
   * @param expiration Updated expiration timestamp.
   */
  setAccessToken(accessToken: string, expiration?: number): void {
    localStorage.setItem(this.ACCESS_KEY, accessToken);
    if (expiration) {
      localStorage.setItem(this.EXP_KEY, String(expiration));
    }
  }

  /**
   * Clears authentication tokens from storage.
   */
  clearTokens(): void {
    localStorage.removeItem(this.ACCESS_KEY);
    localStorage.removeItem(this.EXP_KEY);
  }
}