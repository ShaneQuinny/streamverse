import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WebService } from '../../services/web/web-service';
import { AuthService } from '../../services/auth/auth-service';
import { RatingStats, GenreCount, TopReviewedTitle } from '../../interfaces/homestats';

/**
 * The Home component is the landing page of the StreamVerse FE.
 *
 * It displays three title stats returned from the Streamverse API, including:
 *  - Titles rating average (IMDb & Rotten Tomatoes)
 *  - Most common genres in Streamverse
 *  - Titles with the highest number of reviews
 * 
 */
@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink],
  providers: [WebService],
  templateUrl: './home.html',
  styleUrl: './home.css',
})

export class Home {

  /** Global rating statistics retrieved from the API. */
  ratingStats: RatingStats | null = null;

  /** The most frequent genres returned by the API. */
  topGenres: GenreCount[] = [];

  /** * Titles with the highest review counts. */
  topReviewedTitles: TopReviewedTitle[] = [];

  /** Loading state for rating statistics. */
  isLoadingStats = false;

  /** Loading state for genre statistics. */
  isLoadingGenres = false;

  /** Loading state for top-reviewed titles. */
  isLoadingTopReviewed = false;

  /** Error message for rating statistics fetching. */
  statsError = '';

  /** Error message for genre statistics fetching. */
  genresError = '';

  /** Error message for top-reviewed titles fetching. */
  topReviewedError = '';

  /**
   * @constructor for the Home component.
   *
   * @param webService Handles HTTP communication with the StreamVerse API.
   * @param authService Handles authentication actions and exposes the reactive authentication state.
   */
  constructor(
    private webService: WebService,
    private authService: AuthService
  ) {}

  /**
   * Lifecycle hook that runs once after component initialisation.
   * Fetches all required homepage stats.
   */
  ngOnInit(): void {
    this.fetchRatingStats();
    this.fetchTopGenres();
    this.fetchTopReviewedTitles();
  }

  /**
   * Indicates whether the user is currently logged in.
   *
   * @returns "true" if an user is logged in, otherwise "false".
   */
  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn;
  }

  /**
   * Returns the username of the currently authenticated user.
   *
   * @returns The username string, or "null" if no user is logged in.
   */
  get currentUser(): string | null {
    return this.authService.currentUsername;
  }

  /**
   * Retrieves rating stats from the StreamVerse API.
   */
  fetchRatingStats(): void {
    this.isLoadingStats = true;
    this.statsError = '';

    this.webService.getRatingStats().subscribe({
      next: (response: any) => {
        this.isLoadingStats = false;

        if (!response?.success) {
          this.statsError =  response?.errors?.error || 'Could not load stats.';
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
        this.statsError = err?.errors?.error || 'Could not load stats.';
      },
    });
  }

  /**
   * Retrieves the most frequent genres from the StreamVerse API.
   * Requests the first page of results, limited to 8 entries, sorted
   * in descending order.
   */
  fetchTopGenres(): void {
    this.isLoadingGenres = true;
    this.genresError = '';

    this.webService.getGenreCounts(1, 8, 'desc').subscribe({
      next: (response: any) => {
        this.isLoadingGenres = false;

        if (!response?.success) {
          this.genresError = response?.errors?.error || 'Could not load genres.';
          return;
        }

        const list = response.data?.genre_count;
        this.topGenres = Array.isArray(list) ? list as GenreCount[] : [];
      },
      error: (err) => {
        this.isLoadingGenres = false;
        this.genresError = err?.errors?.error || 'Could not load genres.';
      },
    });
  }

  /**
   * Retrieves the titles with the highest number of reviews.
   * Requests the first page, limited to 5 results, sorted descending.
   */
  fetchTopReviewedTitles(): void {
    this.isLoadingTopReviewed = true;
    this.topReviewedError = '';

    this.webService.getTopReviewedTitles(1, 5, 'desc').subscribe({
      next: (response: any) => {
        this.isLoadingTopReviewed = false;

        if (!response?.success) {
          this.topReviewedError = response?.errors?.error || 'Could not load top reviewed titles.';
          return;
        }

        const list = response.data?.top_reviewed_titles;
        this.topReviewedTitles = Array.isArray(list)
          ? list as TopReviewedTitle[]
          : [];
      },
      error: (err) => {
        this.isLoadingTopReviewed = false;
        this.topReviewedError = err?.errors?.error || 'Could not load top reviewed titles.';
      },
    });
  }
}