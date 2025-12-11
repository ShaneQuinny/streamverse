import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebService } from '../../services/web/web-service';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry, GridReadyEvent, provideGlobalGridOptions } from 'ag-grid-community';
import { Router } from '@angular/router';

ModuleRegistry.registerModules([AllCommunityModule]);
provideGlobalGridOptions({ theme: 'legacy' });

@Component({
  selector: 'app-title-data-grid',
  imports: [CommonModule, AgGridAngular],
  providers: [WebService],
  templateUrl: './title-data-grid.html',
  styleUrls: ['./title-data-grid.css'],
})
export class TitleDataGrid {
  
  headings: ColDef[] = [
    { field: "title" },
    { field: "type", filter: true },
    { field: "release_year", filter: true, headerName: "Release Year" },
    { field: "rating", filter: true, headerName: "Age Rating" },
    { field: "duration_in_mins", filter: true, headerName: "Duration (mins)"},
    { field: "imdb_rating", filter: true, headerName: "IMDb"},
    { field: "rotten_tomatoes_score", filter: true, headerName: "RT (%)"},
    { headerName: 'Genres', filter: true, valueGetter: (params) => (params.data?.genres || []).join(', ') },
    { headerName: 'Cast (Top 3)', filter: true, valueGetter: (params) => { const cast = params.data?.cast || []; 
      return cast.slice(0, 3).join(', '); } },
    { headerName: 'Director(s)', filter: true, valueGetter: (params) => (params.data?.directors || []).join(', ') },
    { headerName: 'Country/Countries', filter: true, valueGetter: (params) => (params.data?.countries || []).join(', ') },
    { headerName: 'Languages', filter: true, valueGetter: (params) => (params.data?.languages || []).join(', ') },
    { headerName: 'Subtitles', filter: true, valueGetter: (params) => (params.data?.subtitles_available || []).join(', ') },
    { headerName: 'Platforms', filter: true, valueGetter: (params) => { const platforms = params.data?.available_on || [];
       return platforms.map((p: any) => p.platform).join(', '); } },
    { headerName: 'Actions', field: 'actions', cellRenderer: () => '<button class="btn btn-sm btn-outline-dark">View Title</button>' },
  ];

  // Grid data
  data: any[] = [];

  // Pagination
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [10, 25, 50, 100];

  constructor(
    private webService: WebService,
    private router: Router  
  ) {}

  ngOnInit() {
    this.webService.getAllTitles().subscribe({
      next: (response: any) => {
        this.data = response?.data || [];
      },
      error: (err) => {
        console.error('Failed to load titles for data grid', err);
      },
    });
  }

  onGridReady(_event: GridReadyEvent): void { }

  // Handle clicks on the "View Audit Log" button
  onCellClicked(event: any): void {
    if (event.colDef.field === 'actions') {
      const id = event.data?._id;
      if (id) {
        this.onViewTitle(id);
      }
    }
  }

  onViewTitle(id: string): void {
    this.router.navigate(['/titles', id]);
  }
}