import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})

export class TokenStorageService {
  //
  private readonly ACCESS_KEY = 'access_token';
  private readonly REFRESH_KEY = 'refresh_token';
  private readonly EXP_KEY = 'expiration';
  private readonly SESSION_EXPIRED_KEY = 'session_expired';

  //
  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_KEY);
  }

  //
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  //
  getExpiration(): string | null {
    return localStorage.getItem(this.EXP_KEY);
  }

  //
  isSessionExpired(): boolean {
    return localStorage.getItem(this.SESSION_EXPIRED_KEY) === '1';
  }

  //
  setTokens(accessToken: string, refreshToken: string, expiration?: number): void {
    localStorage.setItem(this.ACCESS_KEY, accessToken);
    localStorage.setItem(this.REFRESH_KEY, refreshToken);
    if (expiration) {
      localStorage.setItem(this.EXP_KEY, String(expiration));
    }
    this.clearSessionExpiredFlag();
  }

  //
  setAccessToken(accessToken: string, expiration?: number): void {
    localStorage.setItem(this.ACCESS_KEY, accessToken);
    if (expiration) {
      localStorage.setItem(this.EXP_KEY, String(expiration));
    }
    this.clearSessionExpiredFlag();
  }

  //
  setSessionExpiredFlag(): void {
    localStorage.setItem(this.SESSION_EXPIRED_KEY, '1');
  }

  //
  clearSessionExpiredFlag(): void {
    localStorage.removeItem(this.SESSION_EXPIRED_KEY);
  }

  //
  clearTokens(includeRefresh: boolean = true): void {
    localStorage.removeItem(this.ACCESS_KEY);
    localStorage.removeItem(this.EXP_KEY);
    if (includeRefresh) {
      localStorage.removeItem(this.REFRESH_KEY);
    }
    localStorage.removeItem(this.SESSION_EXPIRED_KEY);
  }
}