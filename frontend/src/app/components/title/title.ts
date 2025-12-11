import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { WebService } from '../../services/web/web-service';
import { Title as TitleModel} from '../../models/title';
import { Review } from '../../models/review';
import { AuthService } from '../../services/auth/auth-service';
import { CacheService } from '../../services/cache/cache-service';

@Component({
  selector: 'app-title',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  providers: [WebService, CacheService],
  templateUrl: './title.html',
  styleUrl: './title.css',
})

export class Title implements OnDestroy {

  title!: TitleModel;
  reviews$!: Observable<Review[]>;
  reviewForm!: FormGroup;
  currentUsername: string | null = null;
  isAdmin = false;
  isLoading = false;
  errorMessage = '';
  editingReviewId: string | null = null;
  recommendedTitles: any[] = [];
  recommendationsLoading = false;
  recommendationsError = '';
  
  // Add subscription to track auth state changes
  private authSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private webService: WebService,
    private authService: AuthService,
    private cacheService: CacheService
  ) {}
  
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id){
      this.loadTitleAndReviews(id)
    }

    // Subscribe to auth state changes
    this.authSubscription = this.authService.auth$.subscribe((authState) => {
      this.currentUsername = authState.username;
      this.isAdmin = authState.isAdmin;
      
      // Update form if it exists
      if (this.reviewForm) {
        this.reviewForm.patchValue({
          username: this.currentUsername
        });
      }
    });
  }

  ngOnDestroy(): void {
    // Clean up subscription to prevent memory leaks
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  private loadTitleAndReviews(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Get the username from current auth state
    this.currentUsername = this.authService.currentUsername;

    // Reviews observable for async pipe
    this.reviews$ = this.webService.getReviewsForTitle(id);

    this.webService.getTitleById(id).subscribe({
      next: (title) => {
        this.title = title;

        // Check cache first, then fetch if needed
        if (!this.cacheService.has(title._id)) {
          this.webService.getMoviePoster(title.title, title.release_year).subscribe({
            next: (response: any) => {
              this.cacheService.set(title._id, response.Poster || '');
            },
            error: (err) => {
              console.error(`Error fetching poster:`, err);
              this.cacheService.set(title._id, '');
            }
          });
        }
        
        // Initialize form
        if (!this.reviewForm) {
          this.reviewForm = this.formBuilder.group({
            username: [{ value: this.currentUsername, disabled: true }],
            comment: ['', Validators.required],
            rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
          });
        }
        
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

  getPosterUrl(title: TitleModel): string {
    return this.cacheService.get(title._id) || '';
  }

  private loadRecommendations(titleId: string): void {
    this.recommendationsLoading = true;
    this.recommendationsError = '';
    this.recommendedTitles = [];

    this.webService.getTailoredRecommendations(titleId).subscribe({
      next: (response: any) => {
        // APIResponse data from backend get_tailored_recommendations
        this.recommendedTitles = response.data.tailored_recommendations || [];
        console.log(this.recommendedTitles)
        this.recommendationsLoading = false;
      },
      error: (err) => {
        console.error('Error loading tailored recommendations', err);
        this.recommendationsError = 'Could not load tailored recommendations.';
        this.recommendationsLoading = false;
      },
    });
  }

  onSubmitReview(): void {
    if (!this.title || this.reviewForm.invalid) return;

    const { comment, rating } = this.reviewForm.getRawValue();

    if (this.editingReviewId) {
      // Edit existing review
      this.webService.updateReview(this.title._id, this.editingReviewId, comment, rating).subscribe({
        next: () => {
          // refresh reviews
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
      // Scroll to form
      document.querySelector('.review-card')?.scrollIntoView({ behavior: 'smooth' });
      
    } else {
      // Add new review
      this.webService.postReview(this.title._id, comment, rating).subscribe({
        next: () => {
          // refresh reviews
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
      // Scroll to form
      document.querySelector('.review-card')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  onEditReview(review: Review): void {
    this.editingReviewId = review._id;
    this.reviewForm.patchValue({
      comment: review.comment,
      rating: review.rating
    });
    // Scroll to form
    document.querySelector('.reviews-container')?.scrollIntoView({ behavior: 'smooth' });
  }

  onDeleteReview(reviewId: string): void {
    if (!confirm('Are you sure you want to delete this review?')) {
      return;
    }

    this.webService.deleteReview(this.title._id, reviewId).subscribe({
      next: () => {
        // refresh reviews
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
        // Navigate back to titles list
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