import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { WebService } from '../../services/web/web-service';
import { Title as TitleModel} from '../../interfaces/title';
import { Review } from '../../interfaces/review';
import { AuthService } from '../../services/auth/auth-service';
import { CacheService } from '../../services/cache/cache-service';
import { ExternalService } from '../../services/external/external-service';

/** 
 * The Title component displays a single title, its reviews, tailored recommendations, 
 * and provides editing tools for admins, including advanced reactive forms and platform arrays. 
 * */
@Component({
  selector: 'app-title',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  providers: [WebService, CacheService, ExternalService],
  templateUrl: './title.html',
  styleUrl: './title.css',
})
export class Title {

  /** The currently loaded title model. */
  title!: TitleModel;

  /** Observable stream of reviews for this title. */
  reviews$!: Observable<Review[]>;

  /** Reactive form used for creating and editing a review. */
  reviewForm!: FormGroup;

  /** Reactive form used for editing the title details. */
  titleEditForm!: FormGroup;

  /** The currently logged in username */
  currentUsername: string | null = null;

  /** Indicates whether the current user is an admin. */
  isAdmin = false;

  /** Global loading flag for title initialisation. */
  isLoading = false;

  /** Stores any error message related to loading the title. */
  errorMessage = '';

  /** Holds the ID of the review being edited, or null when adding a new review. */
  editingReviewId: string | null = null;

  /** Tailored recommendation results for this title. */
  recommendedTitles: any[] = [];

  /** Indicates whether recommendations are currently loading. */
  recommendationsLoading = false;

  /** Stores errors related to loading recommendations. */
  recommendationsError = '';

  /** Indicates whether the title edit mode is currently active. */
  isEditingTitle = false;

  /** Indicates whether a title save operation is in progress. */
  isSavingTitle = false;
  
  /** Tracks authentication state subscription for cleanup. */
  private authSubscription?: Subscription;

  /**
   * @constructor for the Title component. 
   * 
   * @param route Used to read the title and review id parameter from the URL.
   * @param formBuilder FormBuilder for reactive form creation
   * @param webService Handles HTTP communication with the StreamVerse API.
   * @param authService Handles authentication actions and exposes the reactive authentication state.
   * @param cacheService CacheService for caching poster images
   * @param externalService Handles actions related to third party services.
   * @param router Angular router for redirecting after operations.
   */
  constructor(
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private webService: WebService,
    private authService: AuthService,
    private cacheService: CacheService,
    private externalService: ExternalService,
    private router: Router
  ) {}
  
  /**
   * Lifecycle hook that runs once after component initialisation.
   * Restores pagination state, loads titles and reviews and 
   * subscribes to authentication state to update UI reactively.
   */
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id){
      this.loadTitleAndReviews(id)
    }

    this.authSubscription = this.authService.auth$.subscribe((authState) => {
      this.currentUsername = authState.username;
      this.isAdmin = authState.isAdmin;
      
      if (this.reviewForm) {
        this.reviewForm.patchValue({ username: this.currentUsername });
      }
    });
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
   * Loads title details, reviews, and sets up forms and poster cache.
   * 
   * Fetches the title by ID, initializes the review form if not already created,
   * loads poster images from cache or fetches them, and triggers recommendations loading.
   * 
   * @param id The title ID to load
   * @private
   */
  private loadTitleAndReviews(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.currentUsername = this.authService.currentUsername;
    this.reviews$ = this.webService.getReviewsForTitle(id);

    this.webService.getTitleById(id).subscribe({
      next: (title) => {
        this.title = title;

        if (!this.cacheService.has(title._id)) {
          this.externalService.getMoviePoster(title.title, title.release_year).subscribe({
            next: (response: any) => {
              this.cacheService.set(title._id, response.Poster || '');
            },
            error: (err) => {
              console.error(`Error fetching poster:`, err);
            }
          });
        }
        
        if (!this.reviewForm) {
          this.reviewForm = this.formBuilder.group({
            username: [{ value: this.currentUsername, disabled: true }],
            comment: ['', Validators.required],
            rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
          });
        }

        this.initializeTitleEditForm();
        
        this.isLoading = false;
        this.loadRecommendations(this.title._id);
      },
      error: (err) => {
        console.error('Error fetching title', err);
        this.errorMessage = err?.errors?.err || 'Something went wrong loading this title.';
        this.isLoading = false;
      }
    });
  }

  /**
   * Initializes the reactive form for editing title details.
   * 
   * Builds a FormGroup with controls for all title fields including nested FormArrays
   * for genres, cast, directors, languages, and streaming platforms.
   * 
   * @private
   */
  private initializeTitleEditForm(): void {
    this.titleEditForm = this.formBuilder.group({
      title: [this.title.title, Validators.required],
      type: [this.title.type, Validators.required],
      release_year: [this.title.release_year, [Validators.required, Validators.min(1800), Validators.max(new Date().getFullYear() + 5)]],
      duration_in_mins: [this.title.duration_in_mins, [Validators.required, Validators.min(1)]],
      rating: [this.title.rating, Validators.required],
      description: [this.title.description, Validators.required],
      imdb_rating: [this.title.imdb_rating, [Validators.required, Validators.min(0), Validators.max(10)]],
      rotten_tomatoes_score: [this.title.rotten_tomatoes_score, [Validators.required, Validators.min(0), Validators.max(100)]],
      cast: this.formBuilder.array(
        this.title.cast.map(actor => this.formBuilder.control(actor))
      ),
      directors: this.formBuilder.array(
        this.title.directors.map(d => this.formBuilder.control(d))
      ),
      languages: this.formBuilder.array(
        this.title.languages.map(l => this.formBuilder.control(l))
      ),
      genres: this.formBuilder.array(
        this.title.genres.map(genre => this.formBuilder.control(genre, Validators.minLength(1)))
      ),
      available_on: this.formBuilder.array(
        this.title.available_on.map(platform => 
          this.formBuilder.group({
            platform: [platform.platform],
            url: [platform.url]
          })
        )
      )
    });
  }

  /**
   * Getter for the genres FormArray.
   * @returns The genres FormArray from titleEditForm
   */
  get genres(): FormArray {
    return this.titleEditForm.get('genres') as FormArray;
  }

  /**
   * Getter for the available_on FormArray.
   * @returns The available_on FormArray from titleEditForm
   */
  get availableOn(): FormArray {
    return this.titleEditForm.get('available_on') as FormArray;
  }

  /**
   * Getter for the cast FormArray.
   * @returns The cast FormArray from titleEditForm
   */
  get cast(): FormArray {
    return this.titleEditForm.get('cast') as FormArray;
  }

  /**
   * Getter for the directors FormArray.
   * @returns The directors FormArray from titleEditForm
   */
  get directors(): FormArray {
    return this.titleEditForm.get('directors') as FormArray;
  }

  /**
   * Getter for the languages FormArray.
   * @returns The languages FormArray from titleEditForm
   */
  get languages(): FormArray {
    return this.titleEditForm.get('languages') as FormArray;
  }

  /**
   * Adds a new empty genre control to the genres FormArray.
   */
  addGenre(): void {
    this.genres.push(this.formBuilder.control('', Validators.required));
  }

  /**
   * Removes a genre from the FormArray at the specified index.
   * @param index The position of the genre to remove
   */
  removeGenre(index: number): void {
    this.genres.removeAt(index);
  }

  /**
   * Adds a new empty platform group to the available_on FormArray.
   * Creates a FormGroup with platform name and URL controls.
   */
  addPlatform(): void {
    this.availableOn.push(
      this.formBuilder.group({
        platform: ['', Validators.required],
        url: ['', Validators.required]
      })
    );
  }

  /**
   * Removes a platform from the FormArray at the specified index.
   * @param index The position of the platform to remove
   */
  removePlatform(index: number): void {
    this.availableOn.removeAt(index);
  }

  /**
   * Adds a new empty cast member control to the cast FormArray.
   */
  addCast(): void {
    this.cast.push(this.formBuilder.control(''));
  } 

  /**
   * Removes a cast member from the FormArray at the specified index.
   * @param index The position of the cast member to remove
   */
  removeCast(index: number): void {
    this.cast.removeAt(index);
  }

  /**
   * Adds a new empty director control to the directors FormArray.
   */
  addDirector(): void {
    this.directors.push(this.formBuilder.control(''));
  }

  /**
   * Removes a director from the FormArray at the specified index.
   * @param index The position of the director to remove
   */
  removeDirector(index: number): void {
    this.directors.removeAt(index);
  }

  /**
   * Adds a new empty language control to the languages FormArray.
   */
  addLanguage(): void {
    this.languages.push(this.formBuilder.control(''));
  }

  /**
   * Removes a language from the FormArray at the specified index.
   * @param index The position of the language to remove
   */
  removeLanguage(index: number): void {
    this.languages.removeAt(index);
  }

  /**
   * Toggles between view and edit mode for the title.
   * When cancelling edit mode, resets the form to original values.
   */
  toggleEditMode(): void {
    if (this.isEditingTitle) {
      // Cancel editing - reset form to original values
      this.initializeTitleEditForm();
    }
    this.isEditingTitle = !this.isEditingTitle;
  }

  /**
   * Saves the edited title details to the API.
   * 
   * Validates the form, sends the update request, and reloads the title data
   * to reflect the changes. Shows success or error messages accordingly.
   */
  onSaveTitleEdit(): void {
    if (this.titleEditForm.invalid) {
      this.titleEditForm.markAllAsTouched();
      return;
    }

    this.isSavingTitle = true;
    const formValue = this.titleEditForm.getRawValue();

    this.webService.updateTitle(this.title._id, formValue).subscribe({
      next: () => {
        // Reload the title to get updated data
        this.webService.getTitleById(this.title._id).subscribe({
          next: (updatedTitle) => {
            this.title = updatedTitle;
            this.isEditingTitle = false;
            this.isSavingTitle = false;
            this.initializeTitleEditForm();
            alert('Title updated successfully!');
          }
        });
      },
      error: (err) => {
        console.error('Error updating title', err);
        this.isSavingTitle = false;
        alert('Failed to update title. Please try again.');
      }
    });
  }

  /**
   * Retrieves the cached poster URL for the given title.
   * @param title The title model to get the poster for
   * @returns The poster URL from cache, or empty string if not found
   */
  getPosterUrl(title: TitleModel): string {
    return this.cacheService.get(title._id) || '';
  }

  /**
   * Loads tailored recommendations for the current title.
   * 
   * Fetches personalized title recommendations based on the current title's
   * attributes and sets appropriate loading or error states.
   * 
   * @param titleId The ID of the title to get recommendations for
   * @private
   */
  private loadRecommendations(titleId: string): void {
    this.recommendationsLoading = true;
    this.recommendationsError = '';
    this.recommendedTitles = [];

    this.webService.getTailoredRecommendations(titleId).subscribe({
      next: (response: any) => {
        this.recommendedTitles = response.data.tailored_recommendations || [];
        this.recommendationsLoading = false;
      },
      error: (err) => {
        console.error('Error loading tailored recommendations', err);
        this.recommendationsError = err?.errors?.error || 'Could not load tailored recommendations.';
        this.recommendationsLoading = false;
      },
    });
  }

  /**
   * Navigates to a different title page.
   * 
   * Routes to the new title, reloads all content, and scrolls to the top of the page.
   * 
   * @param titleId The ID of the title to navigate to
   */
  navigateToTitle(titleId: string): void {
    if (!titleId) return;
    
    this.router.navigate(['/titles', titleId]).then(() => {
      this.loadTitleAndReviews(titleId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /**
   * Handles review submission for both new and edited reviews.
   * 
   * If editing an existing review, updates it via PUT request.
   * Otherwise, creates a new review via POST request.
   * Resets the form after successful submission.
   */
  onSubmitReview(): void {
    if (!this.title || this.reviewForm.invalid) return;

    const { comment, rating } = this.reviewForm.getRawValue();
    if (this.editingReviewId) {
      this.webService.updateReview(this.title._id, this.editingReviewId, comment, rating).subscribe({
        next: () => {
          this.reviews$ = this.webService.getReviewsForTitle(this.title._id);
          this.reviewForm.reset({
            username: this.currentUsername,
            comment: '',
            rating: 5,
          });
          this.editingReviewId = null;
        },
        error: (err) => {
          console.error('Error updating review', err);
        }
      });
      document.querySelector('.review-card')?.scrollIntoView({ behavior: 'smooth' });
      
    } else {
      this.webService.postReview(this.title._id, comment, rating).subscribe({
        next: () => {
          this.reviews$ = this.webService.getReviewsForTitle(this.title._id);
          this.reviewForm.reset({
            username: this.currentUsername,
            comment: '',
            rating: 5,
          });
        },
        error: (err) => {
          console.error('Error posting review', err);
        }
      });
    }
  }

  /**
   * Enters edit mode for a specific review.
   * 
   * Populates the review form with the existing review data and sets the editing ID.
   * 
   * @param review The review to edit
   */
  onEditReview(review: Review): void {
    this.editingReviewId = review._id;
    this.reviewForm.patchValue({
      comment: review.comment,
      rating: review.rating
    });
  }

  /**
   * Deletes a review after user confirmation.
   * 
   * Prompts the user to confirm deletion, then sends a DELETE request
   * and refreshes the reviews list on success.
   * 
   * @param reviewId The ID of the review to delete
   */
  onDeleteReview(reviewId: string): void {
    if (!confirm('Are you sure you want to delete this review?')) {
      return;
    }

    this.webService.deleteReview(this.title._id, reviewId).subscribe({
      next: () => {
        this.reviews$ = this.webService.getReviewsForTitle(this.title._id);
      },
      error: (err) => {
        console.error('Error deleting review', err);
        alert('Failed to delete review');
      }
    });
  }

  /**
   * Deletes the current title after user confirmation.
   * 
   * Prompts for confirmation, sends a DELETE request, and redirects
   * to the titles list page on success. This action is permanent.
   */
  onDeleteTitle(): void {
    if (!confirm(`Are you sure you want to delete "${this.title.title}"? This action cannot be undone.`)) {
      return;
    }

    this.webService.deleteTitle(this.title._id).subscribe({
      next: () => {
        alert('Title deleted successfully');
        window.location.href = '/titles';
      },
      error: (err) => {
        console.error('Error deleting title', err);
        alert('Failed to delete title');
      }
    });
  }

  /**
   * Cancels the current review edit operation.
   * Clears the editing ID and resets the form to default values.
   */
  cancelEdit(): void {
    this.editingReviewId = null;
    this.reviewForm.reset({
      username: this.currentUsername,
      comment: '',
      rating: 5,
    });
  }
}