/**
 * Aggregated rating statistics for all titles in StreamVerse.
 * 
 * Used on the home dashboard screen to visualise
 * the average rating stats for all titles.
 */
export interface RatingStats {
  /** The average IMDb rating across all titles. */
  avg_imdb_rating: number;

  /** The average Rotten Tomatoes score across all titles. */
  avg_rotten_tomatoes: number;

  /** The total number of titles included in the statistical aggregation. */
  count: number;
}

/**
 * Represents a single genre and the number of titles associated with it.
 *
 * Used on the home dashboard screen to visualise the distribution of content 
 * across different genres.
 */
export interface GenreCount {
  /** The genre name. */
  _id: string;

  /** How many titles belong to this genre. */
  count: number;
}

/**
 * Represents a title ranked by number of reviews.
 *
 * Used on the home dashboard screen to visualise the top reviewed 
 * titles in Streamverse.
 */
export interface TopReviewedTitle {
  /** The unique identifier of the title. */
  _id: string;

  /** The display title of the content. */
  title: string;

  /** The total number of reviews submitted for this title. */
  review_count: number;
}