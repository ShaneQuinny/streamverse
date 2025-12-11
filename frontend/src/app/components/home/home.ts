import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WebService } from '../../services/web/web-service';
import { AuthService } from '../../services/auth/auth-service';
import { RatingStats, GenreCount, TopReviewedTitle } from '../../models/homestats';

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

  // Loading states
  isLoadingStats = false;
  isLoadingGenres = false;
  isLoadingTopReviewed = false;

  // Error states
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

  // Check to see if the a user is logged in
  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn;
  }
  
  // Get the current user (if logged in)
  get currentUser(): string | null {
    return this.authService.currentUsername;
  }

  // --- Fetch the rating stats from Streamverse API ---  
  fetchRatingStats(): void {
    this.isLoadingStats = true;
    this.statsError = '';

    this.webService.getRatingStats().subscribe({
      next: (response: any) => {
        this.isLoadingStats = false;

        if (!response?.success) {
          this.statsError =
            response?.errors?.error || response?.errors?.message || 'Could not load stats.';
          return;
        }

        const list = response.data?.rating_stats;
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
        this.statsError = err?.error?.errors?.error || err?.error?.message || 'Could not load stats.';
      },
    });
  }

  // --- Fetch the top generes from Streamverse API ---
  fetchTopGenres(): void {
    this.isLoadingGenres = true;
    this.genresError = '';

    // first page, top 8 genres, desc
    this.webService.getGenreCounts(1, 8, 'desc').subscribe({
      next: (response: any) => {
        this.isLoadingGenres = false;

        if (!response?.success) {
          this.genresError =
            response?.errors?.error || response?.errors?.message || 'Could not load genres.';
          return;
        }

        const list = response.data?.genre_count;
        if (Array.isArray(list)) {
          this.topGenres = list as GenreCount[];
        } else {
          this.topGenres = [];
        }
      },
      error: (err) => {
        this.isLoadingGenres = false;
        this.genresError = err?.error?.errors?.error || err?.error?.message || 'Could not load genres.';
      },
    });
  }

  // --- Fetch the top reviewed titles from Streamverse API ---
  fetchTopReviewedTitles(): void {
    this.isLoadingTopReviewed = true;
    this.topReviewedError = '';

    // first page, top 5 titles, desc
    this.webService.getTopReviewedTitles(1, 5, 'desc').subscribe({
      next: (response: any) => {
        this.isLoadingTopReviewed = false;

        if (!response?.success) {
          this.topReviewedError = 
            response?.errors?.error ||response?.errors?.message || 'Could not load top reviewed titles.';
          return;
        }

        const list = response.data?.top_reviewed_titles;
        if (Array.isArray(list)) {
          this.topReviewedTitles = list as TopReviewedTitle[];
        } else {
          this.topReviewedTitles = [];
        }
      },
      error: (err) => {
        this.isLoadingTopReviewed = false;
        this.topReviewedError = err?.error?.errors?.error || err?.error?.message || 'Could not load top reviewed titles.';
      },
    });
  }
}