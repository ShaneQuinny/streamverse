/**
 * Represents the login credentials submitted by a StreamVerse user.
 *
 * This interface is used by the AuthService and the login UI
 * to stote and validate the user's username and password before
 * sending them to the Streamverse API authentication endpoint
 *
 */
export interface Login {
  /** The username entered by the user. */
  username: string;

  /** The password associated with the account. */
  password: string;
}