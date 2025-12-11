import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WebService } from '../../services/web/web-service';

@Component({
  selector: 'app-auditrecord',
  imports: [CommonModule, RouterLink],
  templateUrl: './auditrecord.html',
  styleUrls: ['./auditrecord.css'],
})
export class AuditRecord {
  auditId!: string;
  auditLog: any | null = null;
  formattedTimestamp = '';
  isLoading = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private webService: WebService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'No audit log ID provided in route.';
      return;
    }

    this.auditId = id;
    this.fetchAuditLog();
  }

  private fetchAuditLog(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.webService.getAuditLogById(this.auditId).subscribe({
      next: (response: any) => {
        const log = response?.data

        if (!log) {
          this.errorMessage = 'Audit log not found.';
          this.auditLog = null;
        } else {
          this.auditLog = log;
          this.formattedTimestamp = log.timestamp
            ? new Date(log.timestamp).toLocaleString('en-GB')
            : '';
        }

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching audit log', err);
        this.errorMessage =
          err?.error?.error || 'Failed to load audit log.';
        this.isLoading = false;
      },
    });
  }
}