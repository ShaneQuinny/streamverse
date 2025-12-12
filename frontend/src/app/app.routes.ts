import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Title } from './components/title/title';
import { Titles } from './components/titles/titles';
import { TitleDataGrid } from './components/title-data-grid/title-data-grid';
import { Users } from './components/users/users';
import { User } from './components/user/user';
import { Audit } from './components/audit/audit';
import { AuditRecord } from './components/auditrecord/auditrecord';
import { ServiceTests } from './components/services-tests/services-tests';

/**
 * Defines the full routing for the StreamVerse FE.
 *
 * Each route maps a URL path to a specific component, allowing users
 * to navigate between the home dashboard, title listings, title details, admin
 * user management, and audit log views.
 *
 * Route Overview:
 * - `/` Home dashboard
 * - `/titles` Paginated titles listing
 * - `/titles/grid` Data-grid view of all titles
 * - `/titles/:id` Full detail page for a single title
 * - `/admin/users` Admin user management dashboard
 * - `/admin/users/:username` → Individual user profile/admin page
 * - `/admin/audit` Audit log overview
 * - `/admin/audit/:id` Single audit record detail view
 *
 */
export const routes: Routes = [
  {
    path: '',
    component: Home,
  },
  {
    path: 'titles/grid',
    component: TitleDataGrid,
  },
  {
    path: 'titles',
    component: Titles,
  },
  {
    path: 'titles/:id',
    component: Title,
  },
  {
    path: 'admin/users',
    component: Users,
  },
  {
    path: 'admin/users/:username',
    component: User,
  },
  {
    path: 'admin/audit',
    component: Audit,
  },
  {
    path: 'admin/audit/:id',
    component: AuditRecord,
  },
  {
    path: 'test',
    component: ServiceTests
  }
];