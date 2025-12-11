import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, tap, throwError } from 'rxjs';
import { WebService } from '../web/web-service';
import { TokenStorageService } from '../token/token-storage-service';
import { Login } from '../../models/login';
import { Register } from '../../models/register';
import { AuthState } from '../../models/authstate';

@Injectable({
  providedIn: 'root',
})

// Guided from https://medium.com/@topaloglu08/reactive-programming-and-state-management-in-angular-d537136905e6
export class AuthService {
  // Reactive state management with BehaviorSubject
  private authState$ = new BehaviorSubject<AuthState>({
    isLoggedIn: false,
    username: null,
    isAdmin: false,
  });

  // Public observable for components to subscribe to
  public readonly auth$ = this.authState$.asObservable();

  constructor(
    private webService: WebService,
    private tokenStorageService: TokenStorageService
  ) {
    // Initialize auth state on service creation
    this.initializeAuthState();
  }

  // --- Public Getters ---
  
  get isLoggedIn(): boolean {
    return this.authState$.value.isLoggedIn;
  }

  get currentUsername(): string | null {
    return this.authState$.value.username;
  }

  get isAdmin(): boolean {
    return this.authState$.value.isAdmin;
  }

  get hasExpiredSession(): boolean {
    return (
      !this.isLoggedIn &&
      !!this.tokenStorageService.getRefreshToken() &&
      this.tokenStorageService.isSessionExpired()
    );
  }

  // --- Public Methods ---

  /**
   * Login with username and password
   * Returns an Observable that components can subscribe to
   */
  login(credentials: Login): Observable<any> {
    const username = credentials.username.trim().toLowerCase();
    const password = credentials.password;

    if (!username || !password) {
      return throwError(() => new Error('Username and password are required'));
    }

    return this.webService.login(username, password).pipe(
      tap((response: any) => {
        if (response?.success && response?.data) {
          this.handleLoginSuccess(response.data);
        }
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Register a new user
   */
  register(data: Register): Observable<any> {
    const username = data.username.trim().toLowerCase();
    const fullname = data.fullname.trim();
    const email = data.email.trim().toLowerCase();
    const password = data.password;

    if (!username || !fullname || !email || !password) {
      return throwError(() => new Error('All fields are required'));
    }

    return this.webService.register(username, fullname, email, password);
  }

  /**
   * Logout the current user
   */
  logout(): Observable<any> {
    return this.webService.logout().pipe(
      tap(() => {
        this.clearAuthState();
      }),
      catchError((error) => {
        // Clear state even if API call fails
        this.clearAuthState();
        return throwError(() => error);
      })
    );
  }

  /**
   * Refresh the access token using the refresh token
   */
  refreshSession(): Observable<any> {
    const refreshToken = this.tokenStorageService.getRefreshToken();

    if (!refreshToken) {
      this.clearAuthState();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.webService.refreshAccessToken(refreshToken).pipe(
      tap((response: any) => {
        if (response?.success && response?.data?.access_token) {
          this.handleRefreshSuccess(response.data.access_token);
        }
      }),
      catchError((error) => {
        this.clearAuthState();
        return throwError(() => error);
      })
    );
  }

  /**
   * Dismiss the session expiration warning
   */
  dismissSessionWarning(): void {
    this.tokenStorageService.clearSessionExpiredFlag();
  }

  // --- Private Helper Methods ---

  /**
   * Initialize auth state from stored tokens on service creation
   */
  private initializeAuthState(): void {
    const accessToken = this.tokenStorageService.getAccessToken();
    if (accessToken) {
      this.updateAuthStateFromToken(accessToken);
    }
  }

  /**
   * Handle successful login response
   */
  private handleLoginSuccess(data: any): void {
    if (!data.access_token || !data.refresh_token) {
      throw new Error('Invalid login response: missing tokens');
    }

    // Store tokens using TokenStorageService
    this.tokenStorageService.setTokens(
      data.access_token,
      data.refresh_token,
      data.expiration
    );

    // Update auth state from the new token
    this.updateAuthStateFromToken(data.access_token);
  }

  /**
   * Handle successful token refresh
   */
  private handleRefreshSuccess(accessToken: string): void {
    const exp = this.getClaimFromToken(accessToken, 'exp');
    this.tokenStorageService.setAccessToken(accessToken, exp);
    this.updateAuthStateFromToken(accessToken);
  }

  /**
   * Update the auth state by decoding the JWT token
   */
  private updateAuthStateFromToken(token: string): void {
    const username = this.getClaimFromToken(token, 'user');
    const admin = this.getClaimFromToken(token, 'admin');

    // Emit new state to all subscribers
    this.authState$.next({
      isLoggedIn: true,
      username: typeof username === 'string' ? username : null,
      isAdmin: !!admin,
    });
  }

  /**
   * Clear all auth state and tokens
   */
  private clearAuthState(): void {
    this.tokenStorageService.clearTokens(true);
    
    // Emit logged out state to all subscribers
    this.authState$.next({
      isLoggedIn: false,
      username: null,
      isAdmin: false,
    });
  }

  // --- JWT Token Decoding Helpers ---

  /**
   * Get a specific claim from a JWT token
   */
  private getClaimFromToken(token: string, claim: string): any | null {
    try {
      const payload = this.decodeJwtPayload(token);
      return payload ? payload[claim] ?? null : null;
    } catch {
      return null;
    }
  }

  /**
   * Decode the payload section of a JWT token
   */
  private decodeJwtPayload(token: string): any | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const json = atob(padded);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}