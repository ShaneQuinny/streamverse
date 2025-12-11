/**
 * Represents the current authentication state of the StreamVerse user.
 *
 * This interface is used throughout the application to track:
 * - Whether the user is logged in.
 * - The username of the authenticated user.
 * - Whether the user has administrator privileges.
 *
 * The AuthService exposes this state reactively using a BehaviorSubject, 
 * allowing UI components (navigation bar, auth button, admin panels, etc...) 
 * to automatically update whenever authentication information changes.
 */
export interface AuthState {
  /** True if the user is currently authenticated. */
  isLoggedIn: boolean;

  /** The username of the logged-in user, or null if not authenticated. */
  username: string | null;

  /** True if the logged-in user is an admin. */
  isAdmin: boolean;
}