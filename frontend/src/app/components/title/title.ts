import { Component, OnDestroy } from '@angular/core';
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

@Component({
  selector: 'app-title',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  providers: [WebService, CacheService, ExternalService],
  templateUrl: './title.html',
  styleUrl: './title.css',
})

export class Title implements OnDestroy {

  title!: TitleModel;
  reviews$!: Observable<Review[]>;
  reviewForm!: FormGroup;
  titleEditForm!: FormGroup;
  currentUsername: string | null = null;
  isAdmin = false;
  isLoading = false;
  errorMessage = '';
  editingReviewId: string | null = null;
  recommendedTitles: any[] = [];
  recommendationsLoading = false;
  recommendationsError = '';
  isEditingTitle = false;
  isSavingTitle = false;
  
  private authSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private webService: WebService,
    private authService: AuthService,
    private cacheService: CacheService,
    private externalService: ExternalService,
    private router: Router
  ) {}
  
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

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

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
              this.cacheService.set(title._id, '');
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

        // Initialize title edit form
        this.initializeTitleEditForm();
        
        this.isLoading = false;
        this.loadRecommendations(this.title._id);
      },
      error: (err) => {
        console.error('Error fetching title', err);
        this.errorMessage = 'Something went wrong loading this title.';
        this.isLoading = false;
      }
    });
  }

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

  get genres(): FormArray {
    return this.titleEditForm.get('genres') as FormArray;
  }

  get availableOn(): FormArray {
    return this.titleEditForm.get('available_on') as FormArray;
  }

  get cast(): FormArray {
    return this.titleEditForm.get('cast') as FormArray;
  }

  get directors(): FormArray {
    return this.titleEditForm.get('directors') as FormArray;
  }

  get languages(): FormArray {
    return this.titleEditForm.get('languages') as FormArray;
  }

  addGenre(): void {
    this.genres.push(this.formBuilder.control('', Validators.required));
  }

  removeGenre(index: number): void {
    this.genres.removeAt(index);
  }

  addPlatform(): void {
    this.availableOn.push(
      this.formBuilder.group({
        platform: ['', Validators.required],
        url: ['', Validators.required]
      })
    );
  }

  removePlatform(index: number): void {
    this.availableOn.removeAt(index);
  }

  addCast(): void {
    this.cast.push(this.formBuilder.control(''));
  } 

  removeCast(index: number): void {
    this.cast.removeAt(index);
  }

  addDirector(): void {
    this.directors.push(this.formBuilder.control(''));
  }

  removeDirector(index: number): void {
    this.directors.removeAt(index);
  }

  addLanguage(): void {
    this.languages.push(this.formBuilder.control(''));
  }

  removeLanguage(index: number): void {
    this.languages.removeAt(index);
  }

  toggleEditMode(): void {
    if (this.isEditingTitle) {
      // Cancel editing - reset form to original values
      this.initializeTitleEditForm();
    }
    this.isEditingTitle = !this.isEditingTitle;
    
    if (this.isEditingTitle) {
      // Scroll to top when entering edit mode
      setTimeout(() => {
        document.querySelector('.info-box')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }

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

  getPosterUrl(title: TitleModel): string {
    return this.cacheService.get(title._id) || '';
  }

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
        this.recommendationsError = 'Could not load tailored recommendations.';
        this.recommendationsLoading = false;
      },
    });
  }

  navigateToTitle(titleId: string): void {
    if (!titleId) return;
    
    this.router.navigate(['/titles', titleId]).then(() => {
      this.loadTitleAndReviews(titleId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

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

  onEditReview(review: Review): void {
    this.editingReviewId = review._id;
    this.reviewForm.patchValue({
      comment: review.comment,
      rating: review.rating
    });
  }

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

  cancelEdit(): void {
    this.editingReviewId = null;
    this.reviewForm.reset({
      username: this.currentUsername,
      comment: '',
      rating: 5,
    });
  }
}