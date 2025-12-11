import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Authbutton } from '../authbutton/authbutton';
import { Authuser } from '../authuser/authuser';
import { AuthService } from '../../services/auth/auth-service';

/**
 * The Navigation component renders the Streamverse FE navbar.
 * It provides routing links for navigating between components.
 *
 */
@Component({
  selector: 'app-navigation',
  imports: [CommonModule, RouterLink, RouterLinkActive, Authbutton, Authuser],
  templateUrl: './navigation.html',
  styleUrl: './navigation.css',
})

/**
 * Navigation class manages the display logic for the app's navbar.
 * It reacts to authentication state changes and shows user-specific actions s
 * uch as login/logout or admin controls.
 */
export class Navigation {

  /**
   * @constructor for the Home component.
   *
   * @param authService Handles authentication actions and exposes the reactive authentication state.
   */
  constructor(public authService: AuthService) {}
}