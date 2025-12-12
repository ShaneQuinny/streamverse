import { Component } from '@angular/core';
import { WebService } from '../../services/web/web-service';
import { CacheService } from '../../services/cache/cache-service';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth/auth-service';
import { ExternalService } from '../../services/external/external-service';

/**
 * The Titles component displays a paginated list of titles retrieved from the StreamVerse API.
 * 
 * It also allows admins to add new titles via a modal form, loads posters through an external API,
 * manages pagination state via session storage, and reacts to authentication state changes.
 */
@Component({
  selector: 'app-titles',
  imports: [RouterModule, CommonModule, ReactiveFormsModule],
  providers: [WebService, CacheService],
  templateUrl: './titles.html',
  styleUrl: './titles.css',
})

/**
 * Titles class manages the display of the current titles available in Streamverse,
 * and allows the ability to add titles for registered users. 
 */
export class Titles {

  /** Array containing the current page of titles from the API. */
  list_of_titles: any = [];

  /** Total number of pages available based on current page size. */
  totalPages: any;

  /** Current page number being displayed. */
  page: number = 1;

  /** Controls visibility of the Add Title modal dialog. */
  showAddTitleModal = false;

  /** Reactive form for adding a new title. */
  addTitleForm!: FormGroup;

  /** Indicates whether a title save operation is in progress. */
  isSavingTitle = false;

  /** Stores error messages related to adding a title. */
  addTitleError = '';

  /** The currently logged in username. */
  currentUsername: string | null = null;

  /** Indicates whether the current user has admin privileges. */
  isAdmin = false;

  /** Subscription to authentication state changes for cleanup. */
  private authSubscription?: Subscription;

  /**
   * @constructor for the Titles component.
   * 
   * @param webService Handles HTTP communication with the StreamVerse API.
   * @param cacheService CacheService for caching poster images
   * @param formBuilder FormBuilder for reactive form creation
   * @param router Angular router for redirecting after operations.
   * @param authService Handles authentication actions and exposes the reactive authentication state.
   * @param externalService Handles actions related to third party services.
   */
  constructor(
    private webService: WebService,
    private cacheService: CacheService,
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private externalService: ExternalService
  ) {}

  /**
   * Lifecycle hook that runs once after component initialisation.
   * 
   * Checks session storage for a saved page number, retrieves the current
   * authentication state, subscribes to auth changes for reactive UI updates,
   * builds the add title form, and loads the initial page of titles.
   */
  ngOnInit() {
    if (sessionStorage['page']) {
      this.page = Number(sessionStorage['page']);
    }

    this.currentUsername = this.authService.currentUsername;
    this.isAdmin = this.authService.isAdmin ?? false;

    this.authSubscription = this.authService.auth$.subscribe((authState) => {
      this.currentUsername = authState.username;
      this.isAdmin = authState.isAdmin;
    });

    this.buildAddTitleForm();
    this.loadTitles();
  }

  /**
   * Lifecycle hook called when the component is about to be destroyed.
   * Unsubscribes from auth state to prevent memory leaks.
   */
  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  /**
   * Fetches the current page of titles from the API.
   * 
   * Updates the list of titles and total pages count, then triggers
   * poster loading for all titles on the current page.
   */
  loadTitles() {
    this.webService.getTitles(this.page).subscribe({
      next: (response: any) => {
        this.list_of_titles = response.data.titles;
        this.totalPages = response.data.total_pages;
        this.loadPosters();
      },
      error: (err) => {
        console.error('Error fetching titles', err);
      },
    });
  }

  /**
   * Moves to the previous page if not already on the first page.
   * 
   * Decrements the page counter, updates session storage, and reloads
   * the titles for the new page.
   */
  previousPage() {
    if (this.page > 1) {
      this.page = this.page - 1;
      sessionStorage['page'] = this.page;
      this.loadTitles();
    }
  }

  /**
   * Moves to the next page if not already on the last page.
   * 
   * Increments the page counter, updates session storage, and reloads
   * the titles for the new page.
   */
  nextPage() {
    if (this.page < this.totalPages) {
      this.page = this.page + 1;
      sessionStorage['page'] = this.page;
      this.loadTitles();
    }
  }

  /**
   * Jumps to the first page of results.
   * 
   * Only performs navigation if not already on page 1.
   * Updates session storage and reloads titles.
   */
  goToFirstPage() {
    if (this.page !== 1) {
      this.page = 1;
      sessionStorage['page'] = this.page;
      this.loadTitles();
    }
  }

  /**
   * Jumps to the last page of results.
   * 
   * Only performs navigation if not already on the last page.
   * Updates session storage and reloads titles.
   */
  goToLastPage() {
    if (this.page !== this.totalPages) {
      this.page = this.totalPages;
      sessionStorage['page'] = this.page;
      this.loadTitles();
    }
  }

  /**
   * Loads poster images for all titles on the current page.
   * 
   * Checks the cache before making external API calls to avoid redundant requests.
   * Poster URLs are stored in the cache service for quick retrieval.
   */
  loadPosters(): void {
    this.list_of_titles.forEach((title: any) => {
      if (this.cacheService.has(title._id)) 
        return;

      this.externalService.getMoviePoster(title.title, title.release_year).subscribe({
        next: (response: any) => {
          this.cacheService.set(title._id, response.Poster || '');
        },
        error: (err) => {
          console.error(`Error fetching poster for ${title.title}:`, err);
        },
      });
    });
  }

  /**
   * Retrieves the cached poster URL for a given title.
   * 
   * @param title The title object to get the poster for
   * @returns The cached poster URL, or empty string if not found
   */
  getPosterUrl(title: any): string {
    return this.cacheService.get(title._id) || '';
  }

  /**
   * Initializes the Add Title reactive form with default values and validators.
   * 
   * Sets up all required fields including title information, cast, directors,
   * genres, ratings, and streaming platforms with appropriate validation rules.
   * 
   * @private
   */
  private buildAddTitleForm(): void {
    const currentYear = new Date().getFullYear();

    this.addTitleForm = this.formBuilder.group({
      type: ['Movie', Validators.required],
      title: ['', Validators.required],
      description: ['', Validators.required],
      cast: ['', Validators.required],
      directors: ['', Validators.required],
      languages: ['', Validators.required],
      genres: ['', Validators.required],
      release_year: [currentYear, [Validators.required]],
      duration_in_mins: [120, [Validators.required, Validators.min(1)]],
      rating: ['PG-13', Validators.required],
      imdb_rating: [7.0, [Validators.required, Validators.min(0), Validators.max(10)]],
      rotten_tomatoes_score: [75, [Validators.required, Validators.min(0), Validators.max(100)]],
    });
  }

  /**
   * Opens the Add Title modal dialog.
   * Clears any previous error messages before displaying the modal.
   */
  openAddTitleModal(): void {
    this.addTitleError = '';
    this.showAddTitleModal = true;
  }

  /**
   * Closes the Add Title modal and resets the form.
   * 
   * Hides the modal and resets all form fields back to their default values,
   * clearing any user input.
   */
  closeAddTitleModal(): void {
    this.showAddTitleModal = false;
    this.addTitleForm.reset({
      type: 'Movie',
      title: '',
      description: '',
      cast: '',
      directors: '',
      languages: '',
      genres: '',
      release_year: new Date().getFullYear(),
      duration_in_mins: 120,
      rating: 'PG-13',
      imdb_rating: 7.0,
      rotten_tomatoes_score: 75,
    });
  }

  /**
   * Converts a comma-separated string into an array of trimmed strings.
   * 
   * Splits the input by commas, trims whitespace from each element,
   * and filters out any empty strings.
   * 
   * @param input The comma-separated string to parse
   * @returns An array of non-empty trimmed strings
   * @private
   */
  private toStringArray(input: string): string[] {
    return input
      .split(',')
      .map((s) => s.trim())
      .filter((s) => !!s);
  }

  /**
   * Submits the Add Title form to the API.
   * 
   * Validates the form, transforms comma-separated fields into arrays,
   * sends the data to the API, and navigates to the new title's detail page
   * on success. Displays error messages if the operation fails.
   */
  onSubmitAddTitle(): void {
    if (this.addTitleForm.invalid) {
      this.addTitleForm.markAllAsTouched();
      return;
    }

    this.isSavingTitle = true;
    this.addTitleError = '';

    const raw = this.addTitleForm.value;

    const updatedTitleData = {
      type: raw.type,
      title: raw.title,
      description: raw.description,
      cast: this.toStringArray(raw.cast),
      directors: this.toStringArray(raw.directors),
      languages: this.toStringArray(raw.languages),
      genres: this.toStringArray(raw.genres),
      release_year: Number(raw.release_year),
      duration_in_mins: Number(raw.duration_in_mins),
      rating: raw.rating,
      imdb_rating: Number(raw.imdb_rating),
      rotten_tomatoes_score: Number(raw.rotten_tomatoes_score),
    };

    this.webService.postTitle(updatedTitleData).subscribe({
      next: (response: any) => {
        this.isSavingTitle = false;
        this.showAddTitleModal = false;

        const newId = response?.data?._id;

        if (newId) {
          this.router.navigate(['/titles', newId]);
        } else {
          this.loadTitles();
        }
      },
      error: (err) => {
        console.error('Error adding title', err);
        this.isSavingTitle = false;
        this.addTitleError = err?.errors?.error || 'Failed to add title. Please try again.';
      },
    });
  }
}