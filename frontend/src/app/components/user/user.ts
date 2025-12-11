import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, } from '@angular/forms';
import { WebService } from '../../services/web/web-service';

/**
 * The User component provides a full admin interface for viewing
 * and editing the details of StreamVerse users.
 *
 * Admins can do the following:
 *  - Update profile information
 *  - Reset the user's password
 *  - Deactivating and reactivating accounts with reasons
 *  - Permanently deleting a user from the system
 *
 */
@Component({
  selector: 'app-user',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './user.html',
  styleUrls: ['./user.css'],
  providers: [WebService],
})

export class User {

  /** Reactive form for editing main user details. */
  userForm!: FormGroup;

  /** Reactive form for resetting a user's password. */
  passwordForm!: FormGroup;

  /** The username extracted from the route, representing the user being viewed or edited. */
  usernameParam!: string;

  /** Whether the user is currently active (true), inactive (false), or unknown (null). */
  userActive: boolean | null = null;

  /** Global loading flag used across all user actions. */
  isLoading = false;

  /** Indicates whether a password update request is in progress. */
  isPasswordUpdating = false;

  /** Displays success messages for user actions. */
  successMessage = '';

  /** Displays error messages for user actions. */
  errorMessage = '';

  /**
   * @constructor for the User component.
   *
   * @param route Used to read the "username" parameter from the URL.
   * @param router Angular router for redirecting after operations.
   * @param formBuilder FormBuilder used to construct reactive forms.
   * @param webService Handles HTTP communication with the StreamVerse API.
   */
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private webService: WebService
  ) {}

  /**
   * Lifecycle hook that runs once after component initialisation.
   */
  ngOnInit(): void {
    this.usernameParam = this.route.snapshot.paramMap.get('username') || '';

    // Main user details form
    this.userForm = this.formBuilder.group({
      username: ['', [Validators.required]],
      fullname: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      admin: [false],
      reason: [''],
    });

    // Password reset form
    this.passwordForm = this.formBuilder.group({
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', [Validators.required]],
    });

    this.loadUser();
  }

  /**
   * Retrieves user details from the API and populates the form..
   */
  loadUser(): void {
    if (!this.usernameParam) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.webService.getUser(this.usernameParam).subscribe({
      next: (resp: any) => {
        const user = resp?.data?.user ?? resp?.data ?? resp?.user;

        if (!user) {
          this.errorMessage = 'User not found.';
          this.isLoading = false;
          return;
        }

        this.userForm.patchValue({
          username: user.username,
          fullname: user.fullname,
          email: user.email,
          admin: user.admin ?? false,
        });

        this.userActive = user.active ?? true;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.errors?.error || err?.error?.message || 'Failed to load user.';
        this.isLoading = false;
      },
    });
  }

  /**
   * Submits updated user information to the API.
   * Also handles username changes by updating both the local variable
   * and the current route URL when necessary.
   */
  onSaveUserDetails(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const originalUsername = this.usernameParam;
    const updatdedData = { ...this.userForm.value };

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.webService.updateUser(originalUsername, updatdedData).subscribe({
      next: (response: any) => {
        const data = response?.data ?? response;

        this.successMessage =
          data?.message || 'User updated successfully.';

        const updatedUsername = data?.updated_username;
        if (updatedUsername && updatedUsername !== originalUsername) {
          this.usernameParam = updatedUsername;

          this.router.navigate(['/admin/users', updatedUsername], {
            replaceUrl: true,
          });
        }

        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err?.errors?.error || 'Failed to update user.';
        this.isLoading = false;
      },
    });
  }

  /**
   * Resets a user's password using the values from the password form.
   * Performs validation before submitting to the API.
   */
  onResetPassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const newPw = this.passwordForm.value.new_password;
    const confirmPw = this.passwordForm.value.confirm_password;

    this.isPasswordUpdating = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.webService.resetUserPassword(this.usernameParam, newPw, confirmPw).subscribe({
      next: (response: any) => {
        const data = response?.data ?? response;
        this.successMessage = data?.message || 'Password reset successfully.';
        this.passwordForm.reset();
        this.isPasswordUpdating = false;
      },
      error: (err) => {
        this.errorMessage = err?.errors?.message || 'Failed to reset password.';
        this.isPasswordUpdating = false;
      },
    });
  }

  /**
   * Deactivates the user and records a reason if provided.
   * Updates the UI state so the user appears inactive.
   */
  onDeactivate(): void {
    const reason = this.userForm.get('reason')?.value?.trim() || 'Deactivated via admin UI';

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.webService.deactivateUser(this.usernameParam, reason).subscribe({
      next: (response: any) => {
        const data = response?.data ?? response;
        this.successMessage = data?.message || 'User deactivated.';
        this.userActive = false;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err?.errors?.error || 'Failed to deactivate user.';
        this.isLoading = false;
      },
    });
  }

  /**
   * Reactivates the user and records a reason if provided.
   * Updates the UI state so the user appears active.
   */
  onReactivate(): void {
    const reason = this.userForm.get('reason')?.value?.trim() || 'Reactivated via admin UI';

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.webService.reactivateUser(this.usernameParam, reason).subscribe({
      next: (response: any) => {
        const data = response?.data ?? response;
        this.successMessage = data?.message || 'User reactivated.';
        this.userActive = true;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err?.errors?.error || 'Failed to reactivate user.';
        this.isLoading = false;
      },
    });
  }

  /**
   * Permanently removes the user from StreamVerse and
   * redirects the admin back to the users grid.
   */
  onDelete(): void {
    if (!confirm('Are you sure you want to permanently delete this user? This cannot be undone.')) {
      return;
    }

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.webService.deleteUser(this.usernameParam).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/admin/users']);
      },
      error: (err) => {
        this.errorMessage = err?.errors?.error || 'Failed to delete user.';
        this.isLoading = false;
      },
    });
  }
}