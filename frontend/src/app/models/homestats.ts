export interface RatingStats {
    avg_imdb_rating: number;
    avg_rotten_tomatoes: number;
    count: number;
}

export interface GenreCount {
    _id: string;   
    count: number; 
}

export interface TopReviewedTitle {
    _id: string; 
    title: string;
    review_count: number;
}