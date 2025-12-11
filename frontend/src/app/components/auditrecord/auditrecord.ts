import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WebService } from '../../services/web/web-service';

/**
 * The AuditRecord component is responsible for displaying the details
 * of a single audit log entry retrieved from the API.
 *
 * It extracts an audit log ID from the current route, fetches the
 * corresponding record from the API, formats the timestamp,
 * and presents error and loading states within the FE.
 */
@Component({
  selector: 'app-auditrecord',
  imports: [CommonModule, RouterLink],
  providers: [WebService],
  templateUrl: './auditrecord.html',
  styleUrls: ['./auditrecord.css'],
})

export class AuditRecord {

  /**
   * The ID of the audit log extracted from the route parameters.
   */
  auditId!: string;

  /**
   * The object returned from the API representing the audit log.
   * Null when not yet loaded or if an error occurred.
   */
  auditLog: any | null = null;

  /**
   * A formatted timestamp string  from the audit log.
   */
  formattedTimestamp = '';

  /**
   * Indicates whether the audit log is currently being loaded from the API.
   */
  isLoading = false;

  /**
   * Stores error messages to be displayed if the API request fails.
   */
  errorMessage = '';

  /**
   * @constructor for the AuditRecord component.
   *
   * @param webService Handles HTTP communication with the StreamVerse API.
   * @param route Provides access to the current route's parameters.
   */
  constructor(
    private webService: WebService,
    private route: ActivatedRoute
  ) {}

  /**
   * Lifecycle hook that runs once after component initialisation.
   * Extracts the audit ID from the route and displays it to the user.
   */
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'No audit log ID provided in route.';
      return;
    }

    this.auditId = id;
    this.fetchAuditLog();
  }

  /**
   * Fetches the audit log from the API using the audit ID.
   * Handles loading state, error conditions, and timestamp formatting.
   *
   * @private
   * @returns void
   */
  private fetchAuditLog(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.webService.getAuditLogById(this.auditId).subscribe({
      next: (response: any) => {
        const log = response?.data;

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
        this.errorMessage = err?.errors?.error || 'Failed to load audit log.';
        this.isLoading = false;
      },
    });
  }
}
