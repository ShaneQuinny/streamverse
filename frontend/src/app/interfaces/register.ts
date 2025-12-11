/**
 * Represents the register data to register a new StreamVerse user.
 *
 * This interface is used by the registration form and sent to 
 * the Streamverse API endpoint to register the user.
 */
export interface Register {
  /** The desired username for the new account. */
  username: string;

  /** The full name of the user. */
  fullname: string;

  /** The user's email address. */
  email: string;

  /** The password for the new account. */
  password: string;
}