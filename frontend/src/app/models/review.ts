export interface Review {
  _id: string;
  username: string;
  comment: string;
  rating: number;
  date: string;
  last_updated_by?: string;
  last_updated_at?: string;
}