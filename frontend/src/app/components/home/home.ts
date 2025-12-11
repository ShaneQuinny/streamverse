import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WebService } from '../../services/web/web-service';
import { AuthService } from '../../services/auth/auth-service';

interface RatingStats {
  avg_imdb_rating: number;
  avg_rotten_tomatoes: number;
  count: number;
}

interface GenreCount {
  _id: string;   // genre name
  count: number; // number of titles
}

interface TopReviewedTitle {
  title: string;
  _id: string; // Added for routing
  review_count: number;
}

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink],
  providers: [WebService],
  templateUrl: './home.html',
  styleUrl: './home.css',
})

export class Home { 
  // Stats
  ratingStats: RatingStats | null = null;
  topGenres: GenreCount[] = [];
  topReviewedTitles: TopReviewedTitle[] = [];

  // Loading / error states
  isLoadingStats = false;
  isLoadingGenres = false;
  isLoadingTopReviewed = false;

  statsError = '';
  genresError = '';
  topReviewedError = '';

  constructor(
    private webService: WebService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.fetchRatingStats();
    this.fetchTopGenres();
    this.fetchTopReviewedTitles();
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn;
  }

  get currentUser(): string | null {
    return this.authService.currentUsername;
  }

  // --- API calls ---
  fetchRatingStats(): void {
    this.isLoadingStats = true;
    this.statsError = '';

    this.webService.getRatingStats().subscribe({
      next: (res: any) => {
        this.isLoadingStats = false;

        if (!res?.success) {
          this.statsError =
            res?.errors?.error || res?.errors?.message || 'Could not load stats.';
          return;
        }

        const list = res.data?.rating_stats;
        if (Array.isArray(list) && list.length > 0) {
          const raw = list[0];
          this.ratingStats = {
            avg_imdb_rating: raw.avg_imdb_rating ?? 0,
            avg_rotten_tomatoes: raw.avg_rotten_tomatoes ?? 0,
            count: raw.count ?? 0,
          };
        } else {
          this.ratingStats = null;
        }
      },
      error: (err) => {
        this.isLoadingStats = false;
        this.statsError =
          err?.error?.errors?.error ||
          err?.error?.message ||
          'Could not load stats.';
      },
    });
  }

  fetchTopGenres(): void {
    this.isLoadingGenres = true;
    this.genresError = '';

    // first page, top 8 genres, desc
    this.webService.getGenreCounts(1, 8, 'desc').subscribe({
      next: (res: any) => {
        this.isLoadingGenres = false;

        if (!res?.success) {
          this.genresError =
            res?.errors?.error ||
            res?.errors?.message ||
            'Could not load genres.';
          return;
        }

        const list = res.data?.genre_count;
        if (Array.isArray(list)) {
          this.topGenres = list as GenreCount[];
        } else {
          this.topGenres = [];
        }
      },
      error: (err) => {
        this.isLoadingGenres = false;
        this.genresError =
          err?.error?.errors?.error ||
          err?.error?.message ||
          'Could not load genres.';
      },
    });
  }

  fetchTopReviewedTitles(): void {
    this.isLoadingTopReviewed = true;
    this.topReviewedError = '';

    // first page, top 5 titles, desc
    this.webService.getTopReviewedTitles(1, 5, 'desc').subscribe({
      next: (res: any) => {
        this.isLoadingTopReviewed = false;

        if (!res?.success) {
          this.topReviewedError =
            res?.errors?.error ||
            res?.errors?.message ||
            'Could not load top reviewed titles.';
          return;
        }

        const list = res.data?.top_reviewed_titles;
        if (Array.isArray(list)) {
          this.topReviewedTitles = list as TopReviewedTitle[];
        } else {
          this.topReviewedTitles = [];
        }
      },
      error: (err) => {
        this.isLoadingTopReviewed = false;
        this.topReviewedError =
          err?.error?.errors?.error ||
          err?.error?.message ||
          'Could not load top reviewed titles.';
      },
    });
  }
}