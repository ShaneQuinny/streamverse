import { Component } from '@angular/core';
import { AuthService } from '../../services/auth/auth-service';
import { CommonModule } from '@angular/common';

/**
 * The Authuser component is a lightweight display component that
 * shows the currently authenticated user within the navigation bar.
 *
 * It exposes two getters, "isLoggedIn" and "currentUser",
 * which read reactive authentication state from the AuthService.
 *
 */
@Component({
  selector: 'app-authuser',
  imports: [CommonModule],
  templateUrl: './authuser.html',
  styleUrl: './authuser.css',
})

/**
 * Authuser class manages the display of the currently authenticated username
 * within the navigation bar. 
 */
export class Authuser {

  /**
   * @constructor for the Authuser component.
   *
   * @param authService Handles authentication actions and exposes the reactive authentication state.
   */
  constructor(public authService: AuthService) {}

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
}