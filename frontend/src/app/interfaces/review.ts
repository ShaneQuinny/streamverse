/**
 * Represents a user-submitted review for a title within StreamVerse.
 *
 * A review contains the author's username, comment, rating,
 * and timestamp.
 */
export interface Review {
  /** Unique identifier for the review. */
  _id: string;

  /** The username of the user who submitted the review. */
  username: string;

  /** The written review comment. */
  comment: string;

  /** Numerical rating provided by the reviewer. */
  rating: number;

  /** ISO timestamp representing when the review was first created. */
  date: string;

  /** Username of the user who last updated the review.*/
  last_updated_by?: string;

  /** ISO timestamp representing when the review was last updated. */
  last_updated_at?: string;
}