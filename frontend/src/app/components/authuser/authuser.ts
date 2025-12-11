import { Component } from '@angular/core';
import { AuthService } from '../../services/auth/auth-service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-authuser',
  imports: [CommonModule],
  templateUrl: './authuser.html',
  styleUrl: './authuser.css',
})
export class Authuser {

  constructor(public authService: AuthService) {}

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn;
  }

  get currentUser(): string | null {
    return this.authService.currentUsername;
  }
}
