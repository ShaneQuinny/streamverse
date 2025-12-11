import { Component } from '@angular/core';
import { WebService } from '../../services/web/web-service';
import { CacheService } from '../../services/cache/cache-service';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { AuthService } from '../../services/auth/auth-service';

@Component({
  selector: 'app-titles',
  imports: [RouterModule, CommonModule, ReactiveFormsModule],
  providers: [WebService, CacheService],
  templateUrl: './titles.html',
  styleUrl: './titles.css',
})
export class Titles {
  list_of_titles: any = [];
  totalPages: any;
  page: number = 1;

  // --- Add Title modal state ---
  showAddTitleModal = false;
  addTitleForm!: FormGroup;
  isSavingTitle = false;
  addTitleError = '';
  currentUsername: string | null = null;
  isAdmin = false;

  // Add subscription to track auth state changes
  private authSubscription?: Subscription;

  constructor(
    private webService: WebService,
    private cacheService: CacheService,
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Restore pagination state
    if (sessionStorage['page']) {
      this.page = Number(sessionStorage['page']);
    }

    // --- Initial auth state (current logged-in user) ---
    this.currentUsername = this.authService.currentUsername;
    this.isAdmin = this.authService.isAdmin ?? false;

    // --- Subscribe to auth state changes ---
    this.authSubscription = this.authService.auth$.subscribe((authState) => {
      this.currentUsername = authState.username;
      this.isAdmin = authState.isAdmin;
    });

    // Build the Add Title modal form
    this.buildAddTitleForm();

    // Load titles list
    this.loadTitles();
  }


  ngOnDestroy(): void {
    // Clean up subscription to prevent memory leaks
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  // ---------- Titles listing ----------

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

  previousPage() {
    if (this.page > 1) {
      this.page = this.page - 1;
      sessionStorage['page'] = this.page;
      this.loadTitles();
    }
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page = this.page + 1;
      sessionStorage['page'] = this.page;
      this.loadTitles();
    }
  }

  goToFirstPage() {
    if (this.page !== 1) {
      this.page = 1;
      sessionStorage['page'] = this.page;
      this.loadTitles();
    }
  }
  
  goToLastPage() {
    if (this.page !== this.totalPages) {
      this.page = this.totalPages;
      sessionStorage['page'] = this.page;
      this.loadTitles();
    }
  }

  loadPosters(): void {
    this.list_of_titles.forEach((title: any) => {
      if (this.cacheService.has(title._id)) return;

      this.webService.getMoviePoster(title.title, title.release_year).subscribe({
        next: (response: any) => {
          this.cacheService.set(title._id, response.Poster || '');
        },
        error: (err) => {
          console.error(`Error fetching poster for ${title.title}:`, err);
          this.cacheService.set(title._id, '');
        },
      });
    });
  }

  getPosterUrl(title: any): string {
    return this.cacheService.get(title._id) || '';
  }

  // ---------- Add Title modal + form ----------

  private buildAddTitleForm(): void {
    const currentYear = new Date().getFullYear();

    this.addTitleForm = this.fb.group({
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

  openAddTitleModal(): void {
    this.addTitleError = '';
    this.showAddTitleModal = true;
  }

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

  private toStringArray(input: string): string[] {
    return input
      .split(',')
      .map((s) => s.trim())
      .filter((s) => !!s);
  }

  onSubmitAddTitle(): void {
    if (this.addTitleForm.invalid) {
      this.addTitleForm.markAllAsTouched();
      return;
    }

    this.isSavingTitle = true;
    this.addTitleError = '';

    const raw = this.addTitleForm.value;

    const payload = {
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

    this.webService.postTitle(payload).subscribe({
      next: (res: any) => {
        this.isSavingTitle = false;
        this.showAddTitleModal = false;

        // APIResponse → data.id from backend add_title()
        const newId = res?.data?.id ?? res?.id;

        if (newId) {
          // Redirect to new title detail page
          this.router.navigate(['/titles', newId]);
        } else {
          // Fallback: reload list if ID missing
          this.loadTitles();
        }
      },
      error: (err) => {
        console.error('Error adding title', err);
        this.isSavingTitle = false;
        this.addTitleError =
          err?.error?.errors?.error ||
          err?.error?.error ||
          'Failed to add title. Please try again.';
      },
    });
  }
}