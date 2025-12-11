import { Review } from "./review";

/**
 * Represents a full StreamVerse title entry.
 *
 * The Title includes everything the FE needs to display all the title's 
 * fields and information from the API.
 *
 */
export interface Title {
  /** Unique identifier for the title. */
  _id: string;

  /** The type of content. */
  type: string;

  /** The display name of the title. */
  title: string;

  /** List of cast members appearing in the title. */
  cast: string[];

  /** The year the title was released. */
  release_year: number;

  /** The content rating. */
  rating: string;

  /** A list of genres the title belongs to. */
  genres: string[];

  /** The description of the title. */
  description: string;

  /** The list of directors. */
  directors: string[];

  /** Countries where the title was produced. */
  countries: string[];

  /** Spoken languages included in the title. */
  languages: string[];

  /** Runtime of the title in minutes. */
  duration_in_mins: number;

  /** Streaming platforms where the title is available on. */
  available_on: any[];

  /** Filming locations used. */
  filming_locations: string[];

  /** Subtitle languages available for this title. */
  subtitles_available: string[];

  /** The IMDb rating for the title. */
  imdb_rating: number;

  /** The Rotten Tomatoes score for the title. */
  rotten_tomatoes_score: number;

  /** IDs of recommended related titles. */
  recommendations: string[];

  /** User-submitted reviews for the title. */
  reviews: Review[];

  /** Username of the user who originally added the title. */
  added_by: string;

  /** ISO timestamp representing when the title was added. */
  added_at: string;

  /** Username of the user who last updated the title.*/
  last_updated_by?: string;

  /** ISO timestamp representing when the title was last updated. */
  last_updated_at?: string;
}