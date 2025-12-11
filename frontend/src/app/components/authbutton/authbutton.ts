import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth-service';
import { Register } from '../../models/register';
import { Login } from '../../models/login';

@Component({
  selector: 'app-authbutton',
  imports: [CommonModule, FormsModule],
  templateUrl: './authbutton.html',
  styleUrl: './authbutton.css',
})

export class Authbutton {
  // --- Modal visibility ---
  showLoginModal = false;
  showLogoutModal = false;
  showRegisterModal = false;

  // --- Login form ---
  loginUsername = '';
  loginPassword = '';
  loginSubmitting = false;
  loginError = '';
  loginSuccess = '';

  // --- Registration form ---
  regUsername = '';
  regFullname = '';
  regEmail = '';
  regPassword = '';
  regConfirmPassword = '';
  regSubmitting = false;
  regError = '';
  regSuccess = '';

  // --- Session refresh ---
  isRefreshing = false;
  refreshError = '';
  refreshSuccess = '';

  // --- Auth state (from service) ---
  isLoggedIn = false;
  currentUsername: string | null = null;
  hasExpiredSession = false;

  constructor(
    public authService: AuthService,
    public router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to auth state changes
    this.authService.auth$
      .subscribe((state) => {
        this.isLoggedIn = state.isLoggedIn;
        this.currentUsername = state.username;
        this.hasExpiredSession = this.authService.hasExpiredSession;
      });
  }

  // --- UI Actions ---

  onPrimaryClick(): void {
    if (this.isLoggedIn) {
      this.openLogoutModal();
    } else {
      this.openLoginModal();
    }
  }

  // --- Login Modal ---

  openLoginModal(): void {
    this.loginError = '';
    this.loginSuccess = '';
    this.showLoginModal = true;
  }

  closeLoginModal(): void {
    this.showLoginModal = false;
    this.loginPassword = '';
    this.loginError = '';
    this.loginSuccess = '';
  }

  onLogin(): void {
    this.loginError = '';
    this.loginSuccess = '';

    if (!this.loginUsername.trim() || !this.loginPassword) {
      this.loginError = 'Please enter both username and password.';
      return;
    }

    const credentials: Login = {
      username: this.loginUsername,
      password: this.loginPassword,
    };

    this.loginSubmitting = true;

    this.authService.login(credentials).subscribe({
      next: (response: any) => {
        this.loginSubmitting = false;

        if (!response?.success) {
          this.loginError =
            response?.errors?.error ||
            response?.errors?.message ||
            'Login failed. Please check your credentials.';
          return;
        }

        this.loginSuccess = 'Logged in successfully.';
        this.loginUsername = '';
        this.loginPassword = '';
        
        // Close modal after short delay to show success message
        setTimeout(() => {
          this.closeLoginModal();
        }, 1000);
      },
      error: (err) => {
        this.loginSubmitting = false;
        this.loginError =
          err?.error?.errors?.error ||
          err?.error?.message ||
          'Login failed. Please try again.';
      },
    });
  }

  // --- Logout Modal ---

  openLogoutModal(): void {
    this.showLogoutModal = true;
  }

  closeLogoutModal(): void {
    this.showLogoutModal = false;
  }

  confirmLogout(): void {
    this.showLogoutModal = false;
    this.authService.logout().subscribe({
      next: () => {
        // Optionally redirect or show message
        console.log('Logged out successfully');
      },
      error: (err) => {
        console.error('Logout error:', err);
        // State is cleared even on error
      },
    });
  }

  // --- Register Modal ---

  openRegisterModal(): void {
    this.regError = '';
    this.regSuccess = '';
    this.showLoginModal = false;
    this.showRegisterModal = true;
  }

  closeRegisterModal(): void {
    this.showRegisterModal = false;
    this.regPassword = '';
    this.regConfirmPassword = '';
    this.regError = '';
    this.regSuccess = '';
  }

  onRegister(): void {
    this.regError = '';
    this.regSuccess = '';

    if (
      !this.regUsername.trim() ||
      !this.regFullname.trim() ||
      !this.regEmail.trim() ||
      !this.regPassword ||
      !this.regConfirmPassword
    ) {
      this.regError = 'Please complete all fields.';
      return;
    }

    if (this.regPassword !== this.regConfirmPassword) {
      this.regError = 'Passwords do not match.';
      return;
    }

    const registerData: Register = {
      username: this.regUsername,
      fullname: this.regFullname,
      email: this.regEmail,
      password: this.regPassword,
    };

    this.regSubmitting = true;

    this.authService.register(registerData).subscribe({
      next: (response: any) => {
        this.regSubmitting = false;

        if (!response?.success) {
          this.regError =
            response?.errors?.error ||
            response?.errors?.message ||
            'Registration failed.';
          return;
        }

        this.regSuccess =
          response?.data?.message || 'Registration successful. Please log in.';

        // Prefill login username
        this.loginUsername = this.regUsername;

        // Clear registration form
        this.regUsername = '';
        this.regFullname = '';
        this.regEmail = '';
        this.regPassword = '';
        this.regConfirmPassword = '';

        // Switch to login modal after delay
        setTimeout(() => {
          this.closeRegisterModal();
          this.openLoginModal();
        }, 1500);
      },
      error: (err) => {
        this.regSubmitting = false;
        this.regError =
          err?.error?.errors?.error ||
          err?.error?.message ||
          'Registration failed. Please try again.';
      },
    });
  }

  // --- Session Refresh ---

  onRefreshSession(): void {
    this.refreshError = '';
    this.refreshSuccess = '';
    this.isRefreshing = true;

    this.authService.refreshSession().subscribe({
      next: () => {
        this.isRefreshing = false;
        this.refreshSuccess = 'Session refreshed successfully.';
        this.authService.dismissSessionWarning();
      },
      error: (err) => {
        this.isRefreshing = false;
        this.refreshError =
          err?.error?.errors?.error ||
          err?.error?.message ||
          'Could not refresh session. Please log in again.';
        this.openLoginModal();
      },
    });
  }

  dismissSessionWarning(): void {
    this.authService.dismissSessionWarning();
  }
}