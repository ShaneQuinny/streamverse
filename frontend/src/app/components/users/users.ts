import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebService } from '../../services/web/web-service';
import { AgGridAngular } from 'ag-grid-angular';
import { AllCommunityModule, ColDef, GridReadyEvent, ModuleRegistry, provideGlobalGridOptions } from 'ag-grid-community';
import { Router } from '@angular/router';

ModuleRegistry.registerModules([AllCommunityModule]);
provideGlobalGridOptions({ theme: 'legacy' });

@Component({
  selector: 'app-users',
  imports: [CommonModule, AgGridAngular],
  providers: [WebService],
  templateUrl: './users.html',
  styleUrls: ['./users.css'],
})

export class Users {
  // Column definitions for the grid
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

  // Grid data
  rowData: any[] = [];

  // Pagination (front-end using ag-Grid pagination)
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [10, 25, 50];

  loading = false;
  errorMessage = '';

  constructor(
    private webService: WebService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  onGridReady(_event: GridReadyEvent): void { }

  // Load users from backend
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
        this.errorMessage =
          err?.error?.errors?.error || 'Failed to load users. Please try again.';
        this.loading = false;
      },
    });
  }

  // Handle clicks on the "View User" button
  onCellClicked(event: any): void {
    if (event.colDef.field === 'actions') {
      const username = event.data?.username;
      if (username) {
        this.onViewUser(username);
      }
    }
  }

  onViewUser(username: string): void {
    this.router.navigate(['/admin/users', username]);
  }
}