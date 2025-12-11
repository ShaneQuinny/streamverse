import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebService } from '../../services/web/web-service';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef } from 'ag-grid-community';
import {
  AllCommunityModule,
  ModuleRegistry,
  GridReadyEvent,
  provideGlobalGridOptions,
} from 'ag-grid-community';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

ModuleRegistry.registerModules([AllCommunityModule]);
provideGlobalGridOptions({ theme: 'legacy' });

@Component({
  selector: 'app-audit',
  imports: [CommonModule, FormsModule, AgGridAngular],
  providers: [WebService],
  templateUrl: './audit.html',
  styleUrl: './audit.css',
})
export class Audit {
  headings: ColDef[] = [
    { field: '_id', headerName: 'Log ID', width: 260 },
    { field: 'admin', headerName: 'Admin', filter: true },
    { field: 'action', headerName: 'Action', filter: true },
    { field: 'target_user', headerName: 'Target User', filter: true },
    {
      headerName: 'Reason',
      valueGetter: (params) => params.data?.details?.reason ?? '—',
      width: 720,
    },
    {
      field: 'timestamp',
      headerName: 'Timestamp',
      filter: true,
      valueFormatter: (params) =>
        new Date(params.value).toLocaleString('en-UK'),
      width: 250,
    },
    {
      headerName: 'Actions',
      field: 'actions',
      cellRenderer: () =>
        '<button class="btn btn-sm btn-outline-dark">View Audit Log</button>',
    },
  ];

  // Grid data
  rowData: any[] = [];

  // Pagination
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [10, 25, 50, 100];

  loading = false;
  errorMessage = '';
  successMessage = '';

  // Stats + prune state
  auditStats: any | null = null;
  statsLoading = false;
  pruneLoading = false;
  pruneDays: number = 90;

  constructor(
    private webService: WebService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadAuditLogs();
  }

  onGridReady(_event: GridReadyEvent): void {}

  loadAuditLogs() {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // You are currently using getAllAuditLogs() which returns { data: [...] }
    this.webService.getAllAuditLogs().subscribe({
      next: (response: any) => {
        this.rowData = response?.data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load audit logs for data grid', err);
        this.errorMessage =
          err?.error?.errors?.error ||
          'Failed to load Audit Logs. Please try again.';
        this.loading = false;
      },
    });
  }

  // Handle clicks on the "View Audit Log" button
  onCellClicked(event: any): void {
    if (event.colDef.field === 'actions') {
      const id = event.data?._id;
      if (id) {
        this.onViewAuditLog(id);
      }
    }
  }

  onViewAuditLog(id: string): void {
    this.router.navigate(['/admin/audit', id]);
  }

  // ============================
  // View Log Stats (GET /audit/stats)
  // ============================
  onLoadStats(): void {
    this.statsLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.webService.getAuditStats().subscribe({
      next: (res: any) => {
        this.auditStats = res?.data;
        this.statsLoading = false;
      },
      error: (err) => {
        console.error('Failed to load audit stats', err);
        this.errorMessage =
          err?.error?.error || 'Failed to load audit statistics.';
        this.statsLoading = false;
      },
    });
  }

  // ============================
  // Prune Old Logs (DELETE /audit/prune?days=)
  // ============================
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
      next: (res: any) => {
        // e.g. { message: "Deleted X old audit logs", cutoff_date: "..." }
        this.successMessage = res?.data.message;
        this.pruneLoading = false;

        // Reload logs + stats after pruning
        this.loadAuditLogs();
        if (this.auditStats) {
          this.onLoadStats();
        }
      },
      error: (err) => {
        console.error('Failed to prune audit logs', err);
        this.errorMessage =
          err?.error?.error || 'Failed to prune audit logs.';
        this.pruneLoading = false;
      },
    });
  }
}