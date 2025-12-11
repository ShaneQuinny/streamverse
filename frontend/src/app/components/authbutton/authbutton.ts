import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth-service';
import { Register } from '../../interfaces/register';
import { Login } from '../../interfaces/login';

/**
 * The Authbutton component provides a reusable authentication control
 * that can be placed in the navigation bar.
 *
 * The component manages modal dialogs for:
 * - Logging in
 * - Logging out confirmation
 * - User registration
 *
 * All authentication actions call the AuthService.
 * 
 */
@Component({
  selector: 'app-authbutton',
  imports: [CommonModule, FormsModule],
  providers: [AuthService],
  templateUrl: './authbutton.html',
  styleUrl: './authbutton.css',
})

export class Authbutton {
  /** Controls visibility of the login modal dialog. */
  showLoginModal = false;

  /** Controls visibility of the logout confirmation modal dialog. */
  showLogoutModal = false;

  /** Controls visibility of the registration modal dialog. */
  showRegisterModal = false;

  /** Username entered in the login form. */
  loginUsername = '';

  /** Password entered in the login form. */
  loginPassword = '';

  /** Indicates whether the login form is currently submitting. */
  loginSubmitting = false;

  /** Stores any validation or API error message for the login form. */
  loginError = '';

  /** Stores a short success message when login completes successfully. */
  loginSuccess = '';

  /** Username entered in the registration form. */
  regUsername = '';

  /** Full name entered in the registration form. */
  regFullname = '';

  /** Email address entered in the registration form. */
  regEmail = '';

  /** Password entered in the registration form. */
  regPassword = '';

  /** Confirmation password entered in the registration form. */
  regConfirmPassword = '';

  /** Indicates whether the registration form is currently submitting. */
  regSubmitting = false;

  /** Stores any validation or API error message for the registration form. */
  regError = '';

  /** Stores a success message when registration completes successfully. */
  regSuccess = '';

  /** Indicates whether the user is currently logged in according to the AuthService state. */
  isLoggedIn = false;

  /** The username of the currently authenticated user, or null if no user is logged in. */
  currentUsername: string | null = null;

  /**
   * @constructor for the Authbutton component.
   *
   * @param authService Handles authentication actions and exposes the reactive authentication state.
   * @param router Used to navigate after authentication events.
   */
  constructor(
    public authService: AuthService,
    public router: Router
  ) {}

  /**
   * Lifecycle hook that runs once after component initialisation.
   * Subscribes to the AuthService state so the component can update
   * its UI when the user logs in or out.
   */
  ngOnInit(): void {
    this.authService.auth$
      .subscribe((state) => {
        this.isLoggedIn = state.isLoggedIn;
        this.currentUsername = state.username;
      });
  }

  /**
   * Handles clicks on the primary auth button.
   * - If the user is logged in, opens the logout confirmation modal.
   * - If the user is logged out, opens the login modal.
   */
  onPrimaryClick(): void {
    if (this.isLoggedIn) {
      this.openLogoutModal();
    } else {
      this.openLoginModal();
    }
  }

  /** Opens the login modal and clears any existing login messages. */
  openLoginModal(): void {
    this.loginError = '';
    this.loginSuccess = '';
    this.showLoginModal = true;
  }

  /** Closes the login modal and clears sensitive form fields and messages. */
  closeLoginModal(): void {
    this.showLoginModal = false;
    this.loginPassword = '';
    this.loginError = '';
    this.loginSuccess = '';
  }

  /**
   * Submits the login form to the AuthService, which will then send an API
   * request to the Streamverse API to login the user and return the JWT
   * access token.
   */
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
          this.loginError = response?.errors?.error || 'Login failed. Please check your credentials.';
          return;
        }

        this.loginSuccess = 'Logged in successfully.';
        this.loginUsername = '';
        this.loginPassword = '';

        this.closeLoginModal();
      },
      error: (err) => {
        this.loginSubmitting = false;
        this.loginError = err?.errors?.error || 'Login failed. Please try again.';
      },
    });
  }

  /** Opens the logout confirmation modal.*/
  openLogoutModal(): void {
    this.showLogoutModal = true;
  }

  /** Closes the logout confirmation modal. */
  closeLogoutModal(): void {
    this.showLogoutModal = false;
  }

  /** Confirms the logout action and sends the request to the AuthService. */
  confirmLogout(): void {
    this.showLogoutModal = false;
    this.authService.logout().subscribe({
      next: () => {
        console.log('Logged out successfully');
      },
      error: (err) => {
        console.error('Logout error:', err);
        err?.errors?.error || 'Logout failed. Please try again.';
      },
    });
  }

  /**
   * Opens the registration modal, closing the login modal if it is open,
   * and clears any existing registration messages.
   */
  openRegisterModal(): void {
    this.regError = '';
    this.regSuccess = '';
    this.showLoginModal = false;
    this.showRegisterModal = true;
  }

  /** Closes the registration modal and clears sensitive fields and messages. */
  closeRegisterModal(): void {
    this.showRegisterModal = false;
    this.regPassword = '';
    this.regConfirmPassword = '';
    this.regError = '';
    this.regSuccess = '';
  }

  /**
   * Submits the registration form to the AuthService, which will then send an API
   * request to the Streamverse API to registration the user. Once completed, the user
   * will be redirected to the login modal with login username prefilled.
   */
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
          this.regError = response?.errors?.error || 'Registration failed.';
          return;
        }

        this.regSuccess = response?.data?.message || 'Registration successful. Please log in.';
        this.loginUsername = this.regUsername;

        this.regUsername = '';
        this.regFullname = '';
        this.regEmail = '';
        this.regPassword = '';
        this.regConfirmPassword = '';

        this.closeRegisterModal();
        this.openLoginModal();
      },
      error: (err) => {
        this.regSubmitting = false;
        this.regError = err?.errors?.error || 'Registration failed. Please try again.';
      },
    });
  }
}