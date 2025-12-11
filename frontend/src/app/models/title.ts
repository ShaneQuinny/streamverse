import { Review } from "./review";

export interface Title {
  _id: string;
  type: string;
  title: string;
  cast: string[];
  release_year: number;
  rating: string;
  genres: string[];
  description: string;
  directors: string[];
  countries: string[];
  languages: string[];
  duration_in_mins: number;
  available_on: any[];
  filming_locations: string[];
  subtitles_available: string[];
  imdb_rating: number;
  rotten_tomatoes_score: number;
  recommendations: string[];
  reviews: Review[];
  added_by: string;
  added_at: string;
  last_updated_by?: string;
  last_updated_at?: string;
}