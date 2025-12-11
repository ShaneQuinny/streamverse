import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Authbutton } from '../authbutton/authbutton';
import { Authuser } from '../authuser/authuser';
import { AuthService } from '../../services/auth/auth-service';

@Component({
  selector: 'app-navigation',
  imports: [
    CommonModule,         
    RouterLink,
    RouterLinkActive,
    Authbutton,
    Authuser
  ],
  templateUrl: './navigation.html',
  styleUrl: './navigation.css',
})

export class Navigation {

  constructor(public authService: AuthService) {}
  
}
