/**
 * The Streamverse API consistently returns a standard structure containing:
 * - "success": Whether the request completed successfully.
 * - "data": The typed payload returned by the API.
 * - "errors": Any validation or server errors (empty on success).
 *
 * This interface allows the front-end to maintain strong typing while
 * still supporting different data shapes for different endpoints through "T".
 *
 */
export interface ApiResponse<T> {
  /** Indicates whether the Streamverse API request was successful. */
  success: boolean;

  /** The data returned by the Streamverse API. */
  data: T;

  /** Error messages returned by the Streamverse API. */
  errors: any;
}