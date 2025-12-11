import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebService } from '../../services/web/web-service';
import { AgGridAngular } from 'ag-grid-angular';
import { AllCommunityModule, ColDef, GridReadyEvent, ModuleRegistry, provideGlobalGridOptions } from 'ag-grid-community';
import { Router } from '@angular/router';

ModuleRegistry.registerModules([AllCommunityModule]);
provideGlobalGridOptions({ theme: 'legacy' });

/**
 * The Users component displays a grid of all registered StreamVerse users
 * for admin management.
 *
 * It uses AG Grid to display user details such as username, role, status,
 * and audit timestamps. From this grid, an admin can click through to
 * a dedicated user management view for an individual account.
 *
 * Data is fetched from the API via the WebService.
 *
 */
@Component({
  selector: 'app-users',
  imports: [CommonModule, AgGridAngular],
  providers: [WebService],
  templateUrl: './users.html',
  styleUrls: ['./users.css'],
})

export class Users {

  /**
   * Column definitions for the AG Grid, including derived role/status
   * fields and an "Actions" column for navigation.
   */
  columnDefs: ColDef[] = [
    { field: 'username', headerName: 'Username', filter: true },
    { field: 'fullname', headerName: 'Full Name', filter: true },
    { field: 'email', headerName: 'Email', filter: true, width: 350 },
    { headerName: 'Role', filter: true, valueGetter: (params) => (params.data?.admin ? 'Admin' : 'User') },
    { field: 'active', headerName: 'Status', filter: true, valueFormatter: (params) => (params.value ? 'Active' : 'Inactive') },
    { field: 'created_at', headerName: 'Created At', filter: true, width: 350},
    { field: 'last_updated_at', headerName: 'Last Updated', filter: true, width: 350 },
    { headerName: 'Actions', field: 'actions', cellRenderer: () => '<button class="btn btn-sm btn-outline-dark">View User</button>' },
  ];

  /** Data source for the grid, populated with user objects returned from the API. */
  rowData: any[] = [];

  /** Enables AG Grid's built-in pagination. */
  pagination = true;

  /** Default number of rows displayed per page. */
  paginationPageSize = 10;

  /** User-selectable page-size options. */
  paginationPageSizeSelector = [10, 25, 50];

  /** Indicates whether the user data is currently being loaded. */
  loading = false;

  /** Stores any error message encountered while loading the users. */
  errorMessage = '';

  /**
   * @constructor for the Users component.
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
  ngOnInit(): void {
    this.loadUsers();
  }

  /**
   * Loads users from the back-end API and populates the grid.
   * Manages loading and error state for the view.
   */
  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';

    this.webService.getUsers().subscribe({
      next: (response: any) => {
        this.rowData = response?.data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load users', err);
        this.errorMessage = err?.errors?.error || 'Failed to load users. Please try again.';
        this.loading = false;
      },
    });
  }

  /**
   * Handles cell click events from the grid.
   *
   * Specifically listens for clicks inside the "Actions" column and,
   * when triggered, navigates to the detailed view for the selected audit log.
   *
   * @param event AG Grid cell click event data containing row and column info.
   */
  onCellClicked(event: any): void {
    if (event.colDef.field === 'actions') {
      const username = event.data?.username;
      if (username) {
        this.onViewUser(username);
      }
    }
  }

  /**
   * Navigates to the user (details) component for the specified username.
   *
   * @param username The username of the user to view.
   */
  onViewUser(username: string): void {
    this.router.navigate(['/admin/users', username]);
  }
}