import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Title } from './components/title/title';
import { Titles } from './components/titles/titles';
import { TitleDataGrid } from './components/title-data-grid/title-data-grid';
import { Users } from './components/users/users';
import { User } from './components/user/user';
import { Audit } from './components/audit/audit';
import { AuditRecord } from './components/auditrecord/auditrecord';

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
    component: Users
  },
  {
    path: 'admin/users/:username',
    component: User
  },
  {
    path: 'admin/audit',
    component: Audit
  },
  {
    path: 'admin/audit/:id',
    component: AuditRecord
  }
];