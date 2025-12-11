import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navigation } from './components/navigation/navigation';

/**
 * The root component of the StreamVerse Angular application.
 *
 * This component serves as the main application and is responsible for:
 * - Rendering the global navigation bar.
 * - Hosting the Angular `RouterOutlet`, which loads all page-level components.
 * - Providing a single entry point for the entire front-end.
 *
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navigation],
  providers: [],
  templateUrl: './app.html',
  styleUrl: './app.css'
})

export class App {
  /** Application identifier used internally. */
  protected readonly title = "streamverseFE";
}