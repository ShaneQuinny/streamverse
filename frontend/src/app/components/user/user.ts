import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { WebService } from '../../services/web/web-service';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './user.html',
  styleUrls: ['./user.css'],
  providers: [WebService],
})
export class User {
  userForm!: FormGroup;
  passwordForm!: FormGroup;

  usernameParam!: string; // original username from the URL
  userActive: boolean | null = null;

  isLoading = false;
  isPasswordUpdating = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private webService: WebService
  ) {}

  ngOnInit(): void {
    this.usernameParam = this.route.snapshot.paramMap.get('username') || '';

    // Main user details form
    this.userForm = this.fb.group({
      username: ['', [Validators.required]],
      fullname: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      admin: [false],
      reason: [''],
    });

    // Password reset form
    this.passwordForm = this.fb.group({
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', [Validators.required]],
    });

    this.loadUser();
  }

  // --- Load user from API ---
  loadUser(): void {
    if (!this.usernameParam) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.webService.getUser(this.usernameParam).subscribe({
      next: (resp: any) => {
        // Depending how your json_response wrapper shapes it:
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

  // --- Save / update user details ---
  onSaveUserDetails(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const originalUsername = this.usernameParam;
    const payload = { ...this.userForm.value };

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.webService.updateUser(originalUsername, payload).subscribe({
      next: (result: any) => {
        const data = result?.data ?? result;

        this.successMessage =
          data?.message || 'User updated successfully.';

        const updatedUsername = data?.updated_username;
        if (updatedUsername && updatedUsername !== originalUsername) {
          this.usernameParam = updatedUsername;
          // keep URL in sync with new username
          this.router.navigate(['/admin/users', updatedUsername], {
            replaceUrl: true,
          });
        }

        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.errors?.error || err?.error?.message || 'Failed to update user.';
        this.isLoading = false;
      },
    });
  }

  // --- Reset password ---
  onResetPassword(): void {
    console.log('onResetPassword called', this.passwordForm.value);

        if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const newPw = this.passwordForm.value.new_password;
    const confirmPw = this.passwordForm.value.confirm_password;

    this.isPasswordUpdating = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.webService
      .resetUserPassword(this.usernameParam, newPw, confirmPw)
      .subscribe({
        next: (res: any) => {
          const data = res?.data ?? res;
          this.successMessage =
            data?.message || 'Password reset successfully.';
          this.passwordForm.reset();
          this.isPasswordUpdating = false;
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.errors?.message || 'Failed to reset password.';
          this.isPasswordUpdating = false;
        },
      });
  }

  // --- Deactivate ---
  onDeactivate(): void {
    const reason = this.userForm.get('reason')?.value?.trim() || 'Deactivated via admin UI';

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.webService.deactivateUser(this.usernameParam, reason).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        this.successMessage = data?.message || 'User deactivated.';
        this.userActive = false;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.errors?.error || err?.error?.message || 'Failed to deactivate user.';
        this.isLoading = false;
      },
    });
  }

  // --- Reactivate ---
  onReactivate(): void {
    const reason = this.userForm.get('reason')?.value?.trim() || 'Reactivated via admin UI';

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.webService.reactivateUser(this.usernameParam, reason).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        this.successMessage = data?.message || 'User reactivated.';
        this.userActive = true;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.errors?.error || err?.error?.message || 'Failed to reactivate user.';
        this.isLoading = false;
      },
    });
  }

  // --- Delete ---
  onDelete(): void {
    if (
      !confirm(
        'Are you sure you want to permanently delete this user? This cannot be undone.'
      )
    ) {
      return;
    }

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.webService.deleteUser(this.usernameParam).subscribe({
      next: () => {
        this.isLoading = false;
        // Go back to the users grid
        this.router.navigate(['/admin/users']);
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.errors?.error || err?.error?.message || 'Failed to delete user.';
        this.isLoading = false;
      },
    });
  }
}