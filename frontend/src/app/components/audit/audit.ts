import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebService } from '../../services/web/web-service';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry, GridReadyEvent, provideGlobalGridOptions, } from 'ag-grid-community';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

ModuleRegistry.registerModules([AllCommunityModule]);
provideGlobalGridOptions({ theme: 'legacy' });

/**
 * Audit component for viewing and managing audit logs in StreamVerse for admins.
 *
 * This component provides:
 * - A data grid (AG Grid) showing all audit log entries.
 * - A "View Audit Log" action to navigate to a detailed audit record page.
 * - Controls for loading aggregated audit statistics.
 * - Ability to prune old audit logs older than a specified number of days.
 *
 * It is intended for admin users and is reached via the `/admin/audit` route.
 * 
 */
@Component({
  selector: 'app-audit',
  imports: [CommonModule, FormsModule, AgGridAngular],
  providers: [WebService],
  templateUrl: './audit.html',
  styleUrl: './audit.css',
})
export class Audit {
  /**
   *  AG Grid used to represent the audit logs that admins can use to view actions
   *  performed by admins in the Streamverse API
   */
  headings: ColDef[] = [
    { field: '_id', headerName: 'Log ID', width: 260 },
    { field: 'admin', headerName: 'Admin', filter: true },
    { field: 'action', headerName: 'Action', filter: true },
    { field: 'target_user', headerName: 'Target User', filter: true },
    { headerName: 'Reason', valueGetter: (params) => params.data?.details?.reason ?? '—', width: 720 },
    { field: 'timestamp', headerName: 'Timestamp', filter: true, valueFormatter: (params) => new Date(params.value).toLocaleString('en-UK'), width: 250 },
    { headerName: 'Actions', field: 'actions', cellRenderer: () => '<button class="btn btn-sm btn-outline-dark">View Audit Log</button>' }
  ];

  /** Data rows bound to the AG Grid, each representing a single audit log entry. */
  rowData: any[] = [];

  /** Enables AG Grid’s built-in pagination feature. */
  pagination = true;

  /** Number of audit rows to display per page in the grid. */
  paginationPageSize = 10;

  /** Dropdown options for page size selection. */
  paginationPageSizeSelector = [10, 25, 50, 100];

  /** Indicates whether the main audit log list is currently loading. */
  loading = false;

  /** Error message to display when API calls fail. */
  errorMessage = '';

  /** Success message to display after successful prune operations or other actions. */
  successMessage = '';

  /** Holds aggregated audit stats (actions per admin). */
  auditStats: any | null = null;

  /** Indicates whether audit stats are currently being loaded. */
  statsLoading = false;

  /** Indicates whether a prune operation is currently in progress. */
  pruneLoading = false;

  /**
   * Number of days used as the cutoff when pruning old logs.
   * Defaults to 90 but can be adjusted via the FE.
   */
  pruneDays: number = 90;

  /**
   * @constructor for the Audit component.
   *
   * @param webService Handles HTTP communication with the StreamVerse API.
   * @param route Provides access to the current route's parameters.
   */
  constructor(
    private webService: WebService,
    private router: Router
  ) {}

  /**
   * Lifecycle hook that runs once after component initialisation.
   * Automatically loads the full audit logs for the grid.
   */
  ngOnInit(): void {
    this.loadAuditLogs();
  }

  /**
   * Loads all audit logs into the grid.
   *
   * Resets error and success messages, sets the loading flag and 
   * retrieves all the Audit Logs in the system.
   * 
   */
  loadAuditLogs(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.webService.getAllAuditLogs().subscribe({
      next: (response: any) => {
        this.rowData = response?.data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load audit logs for data grid', err);
        this.errorMessage = err?.errors?.error || 'Failed to load Audit Logs. Please try again.';
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
      const id = event.data?._id;
      if (id) {
        this.onViewAuditLog(id);
      }
    }
  }

  /**
   * Navigates to the detailed audit record view for the specified log ID.
   *
   * @param id The unique identifier of the audit log to display.
   */
  onViewAuditLog(id: string): void {
    this.router.navigate(['/admin/audit', id]);
  }

  /**
   * Loads aggregated audit statistics.
   */
  onLoadStats(): void {
    this.statsLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.webService.getAuditStats().subscribe({
      next: (response: any) => {
        this.auditStats = response?.data;
        this.statsLoading = false;
      },
      error: (err) => {
        console.error('Failed to load audit stats', err);
        this.errorMessage = err?.errors?.error || 'Failed to load audit statistics.';
        this.statsLoading = false;
      },
    });
  }

  /**
   * Prunes old audit logs, specificed by number of days entered by the user (Default 90).
   */
  onPrune(): void {
    if (this.pruneLoading) return;

    const days = this.pruneDays || 90;
    const confirmed = confirm(
      `Delete audit logs older than ${days} days? This cannot be undone.`
    );
    if (!confirmed) return;

    this.pruneLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.webService.pruneAuditLogs(days).subscribe({
      next: (response: any) => {
        this.successMessage = response?.data.message;
        this.pruneLoading = false;

        this.loadAuditLogs();
        if (this.auditStats) {
          this.onLoadStats();
        }
      },
      error: (err) => {
        console.error('Failed to prune audit logs', err);
        this.errorMessage = err?.error?.error || 'Failed to prune audit logs.';
        this.pruneLoading = false;
      },
    });
  }
}