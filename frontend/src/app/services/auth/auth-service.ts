import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, tap, throwError } from 'rxjs';
import { WebService } from '../web/web-service';
import { TokenStorageService } from '../token/token-storage-service';
import { Login } from '../../interfaces/login';
import { Register } from '../../interfaces/register';
import { AuthState } from '../../interfaces/authstate';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root',
})
/**
 * AuthService used to manage authentication flow and state for StreamVerse.
 *
 * It is responsible for:
 * - Logging users in and out via the WebService using the Streamverse API.
 * - Registering new users.
 * - Storing and updating tokens using TokenStorageService.
 * - Exposing a reactive authentication state via a BehaviorSubject.
 * - Decoding JWT tokens to determine username and admin status.
 *
 * This allows the navigation bar, auth button, admin features and other
 * UI elements to automatically react to login/logout events and token changes.
 *
 */
export class AuthService {
  /**
   * Internal BehaviorSubject that stores the current authentication state which 
   * uses the AuthState interface.
   */
  private authState$ = new BehaviorSubject<AuthState>({
    isLoggedIn: false,
    username: null,
    isAdmin: false,
  });

  /**
   * Read-only observable for the current authentication state.
   * Components subscribe to this to reactively update the UI when
   * the user logs in, logs out, or when admin status changes.
   */
  public readonly auth$ = this.authState$.asObservable();

  /**
  * Creates an instance of the AuthService and initializes authentication state.
  *
  * @constructor used to inject the WebService for backend communication and 
  * the TokenStorageService for handling tokens.
  */
  constructor(
    private webService: WebService,
    private tokenStorageService: TokenStorageService
  ) {
    // Initialize the auth state on service creation from stored tokens
    this.initializeAuthState();
  }

  /**
   * Indicates whether a user is currently logged in.
   *
   * @returns true if a valid auth state is present, otherwise false.
   */
  get isLoggedIn(): boolean {
    return this.authState$.value.isLoggedIn;
  }

  /**
   * Returns the username of the currently logged-in user, if any.
   *
   * @returns The username as a string, or null if not logged in.
   */
  get currentUsername(): string | null {
    return this.authState$.value.username;
  }

  /**
   * Indicates whether the current user has admin privileges.
   *
   * @returns true if the user is an admin, otherwise false.
   */
  get isAdmin(): boolean {
    return this.authState$.value.isAdmin;
  }

  /**
   * Attempts to log in a user with the provided credentials.
   *
   * The username is normalised (trimmed and lowercased) before being sent
   * to the Streamverse API. If either username or password is missing, an 
   * error observable is returned.
   *
   * On successful login the access token is stored in the localStorage 
   * via the TokenStorageService with the authentication state is updated.
   *
   * @param credentials Interface containing username and password.
   * @returns An observable of the login HTTP response.
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
   * Registers a new StreamVerse user with the provided details.
   *
   * All text fields are trimmed, and username/email are lowercased
   * before being sent to the Streamverse API. If any required fields are
   * missing, an error observable is returned.
   *
   * @param data Registration data including username, fullname, email and password.
   * @returns An observable of the registration HTTP response.
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
   * Logs out the current user.
   *
   * Calls the Streamverse API logout endpoint and regardless of whether the call
   * succeeds or fails, clears all local authentication state and tokens.
   *
   * @returns An observable of the logout HTTP response.
   */
  logout(): Observable<any> {
    return this.webService.logout().pipe(
      tap(() => {
        this.clearAuthState();
      }),
      catchError((error) => {
        this.clearAuthState();
        return throwError(() => error);
      })
    );
  }

  /**
   * Initializes the authentication state during service construction.
   *
   * If an access token is present in storage, the state is restored by
   * decoding the token and extracting the user and admin claims.
   *
   * @private
   */
  private initializeAuthState(): void {
    const accessToken = this.tokenStorageService.getAccessToken();
    if (accessToken) {
      this.updateAuthStateFromToken(accessToken);
    }
  }

  /**
   * Handles a successful login response from the Streamverse API.
   *
   * Validates that the access token is present, and then stores it in the 
   * localStorage via the TokenStorageService and updates the current auth 
   * state based on the access token.
   *
   * @param data The response returned from the login endpoint.
   * @private
   */
  private handleLoginSuccess(data: any): void {
    if (!data.access_token || !data.refresh_token) {
      throw new Error('Invalid login response: missing tokens');
    }

    // Store token using TokenStorageService
    this.tokenStorageService.setTokens(
      data.access_token
    );

    // Update auth state from the new token
    this.updateAuthStateFromToken(data.access_token);
  }

  /**
   * Updates the authentication state by decoding the provided JWT token.
   *
   * Extracts the "user" and "admin" claims and updates the
   * AuthState interface to all subscribers.
   *
   * @param token A valid JWT access token.
   * @private
   */
  private updateAuthStateFromToken(token: string): void {
    const username = this.getClaimFromToken(token, 'user');
    const admin = this.getClaimFromToken(token, 'admin');

    // Update the AuthState to all subscribers
    this.authState$.next({
      isLoggedIn: true,
      username: typeof username === 'string' ? username : null,
      isAdmin: !!admin,
    });
  }

  /**
   * Clears all authentication related state and tokens.
   *
   * This is used on logout and when authentication fails, ensuring
   * the UI returns to a clean "logged out" state.
   *
   * @private
   */
  private clearAuthState(): void {
    this.tokenStorageService.clearTokens();

    // Update AuthState state to all subscribers
    this.authState$.next({
      isLoggedIn: false,
      username: null,
      isAdmin: false,
    });
  }

  /**
   * Retrieves a specific claim from a JWT access token.
   *
   * If decoding fails or the claim does not exist, null is returned.
   *
   * @param token The JWT token to decode.
   * @param claim The name of the claim to retrieve.
   * @returns The value of the claim, or null if unavailable.
   * @private
   */
  private getClaimFromToken(token: string, claim: string): any | null {
    try {
      const decodedToken = this.decodeJwtPayload(token);
      return decodedToken ? decodedToken[claim] ?? null : null;
    } catch {
      return null;
    }
  }

  /**
  * Decodes the payload section of a JWT token.
  *
  * Uses the jwtDecode library to parse the JWT token payload.
  * If decoding fails, null is returned.
  *
  * @param token The JWT token string.
  * @returns The decoded payload object, or null on error.
  * @private
  */
  private decodeJwtPayload(token: string): any | null {
    try {
      return jwtDecode(token);
    } catch {
      return null;
    }
  }
}