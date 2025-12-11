import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebService } from '../../services/web/web-service';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry, GridReadyEvent, provideGlobalGridOptions } from 'ag-grid-community';
import { Router } from '@angular/router';

ModuleRegistry.registerModules([AllCommunityModule]);
provideGlobalGridOptions({ theme: 'legacy' });

/**
 * The TitleDataGrid component displays a full AG-Grid table
 * listing all titles stored in the StreamVerse database.
 *
 * It includes filtering, sorting and pagination which supports easy navigation
 * throughout the titles in Streamverse.
 *
 * Data for the grid is fetched from the StreamVerse API via the WebService.
 *
 */
@Component({
  selector: 'app-title-data-grid',
  imports: [CommonModule, AgGridAngular],
  providers: [WebService],
  templateUrl: './title-data-grid.html',
  styleUrls: ['./title-data-grid.css'],
})

export class TitleDataGrid {

  /** Defines all AG-Grid columns config for the title dataset. */
  headings: ColDef[] = [
    { field: "title" },
    { field: "type", filter: true },
    { field: "release_year", filter: true, headerName: "Release Year" },
    { field: "rating", filter: true, headerName: "Age Rating" },
    { field: "duration_in_mins", filter: true, headerName: "Duration (mins)" },
    { field: "imdb_rating", filter: true, headerName: "IMDb" },
    { field: "rotten_tomatoes_score", filter: true, headerName: "RT (%)" },
    { headerName: 'Genres', filter: true, valueGetter: (params) => (params.data?.genres || []).join(', ') },
    { headerName: 'Cast (Top 5)', filter: true, valueGetter: (params) => { const cast = params.data?.cast || []; return cast.slice(0, 5).join(', '); } },
    { headerName: 'Director(s)', filter: true, valueGetter: (params) => (params.data?.directors || []).join(', ') },
    { headerName: 'Country/Countries', filter: true, valueGetter: (params) => (params.data?.countries || []).join(', ') },
    { headerName: 'Languages', filter: true, valueGetter: (params) => (params.data?.languages || []).join(', ') },
    { headerName: 'Subtitles', filter: true, valueGetter: (params) => (params.data?.subtitles_available || []).join(', ') },
    { headerName: 'Platforms', filter: true, valueGetter: (params) => { const platforms = params.data?.available_on || []; return platforms.map((p: any) => p.platform).join(', '); } },
    { headerName: 'Actions', field: 'actions', cellRenderer: () => '<button class="btn btn-sm btn-outline-dark">View Title</button>' }
  ];

  /** Holds the array of title objects returned by the API. */
  data: any[] = [];

  /** Enables AG-Grid pagination. */
  pagination = true;

  /** Default AG-Grid page size. */
  paginationPageSize = 10;

  /** User-selectable options for page size. */
  paginationPageSizeSelector = [10, 25, 50, 100];

  /** Indicates whether the main title list is currently loading. */
  loading = false;

  /** Error message to display when API calls fail. */
  errorMessage = '';

  /**
   * @constructor for the TitleDataGrid component.
   *
   * @param webService Handles HTTP communication with the StreamVerse API.
   * @param router Used to navigate after authentication events.
   */
  constructor(
    private webService: WebService,
    private router: Router  
  ) {}

  /**
   * Lifecycle hook that runs once after component initialisation
   * and populates the AG-Grid.
   */
  ngOnInit() {
    this.loadTitles()
  }

  /**
   * Loads all titles into the grid.
   *
   * Resets error and success messages, sets the loading flag and 
   * retrieves all the titles in the system.
   * 
   */
  loadTitles(): void {
    this.loading = true;
    this.errorMessage = '';

    this.webService.getAllTitles().subscribe({
      next: (response: any) => {
        this.data = response?.data || [];
      },
      error: (err) => {
        console.error('Failed to load titles for data grid', err);
        this.errorMessage = err?.errors?.error || 'Failed to load Audit Logs. Please try again.';
        this.loading = false;
      },
    });
  }

  /**
   * Handles click events inside any grid cell.
   * When the "Actions" column is clicked, the user is routed to a
   * full details page for the selected title.
   *
   * @param event Event data describing the clicked cell.
   */
  onCellClicked(event: any): void {
    if (event.colDef.field === 'actions') {
      const id = event.data?._id;
      if (id) {
        this.onViewTitle(id);
      }
    }
  }

  /**
   * Navigates to the detailed view for the given title ID.
   *
   * @param id The id string representing a title.
   */
  onViewTitle(id: string): void {
    this.router.navigate(['/titles', id]);
  }
}