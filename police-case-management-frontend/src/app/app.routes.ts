import { Routes } from '@angular/router';
import { MainLayout } from './components/main-layout/main-layout';
import { authGuard } from './guards/auth-guard';
import { adminGuard } from './guards/admin-guard';
import { loginGuard } from './guards/login-guard';

import { Home } from './pages/home/home';
import { AdminHome } from './pages/admin-home/admin-home';
import { AddCase } from './pages/add-case/add-case';
import { UpdateCaseList } from './pages/update-case-list/update-case-list';
import { CaseDetails } from './pages/case-details/case-details';
import { SearchCase } from './pages/search-case/search-case';
import { ReportIssue } from './pages/report-issue/report-issue';
import { PublicReport } from './pages/public-report/public-report';
import { Terms } from './pages/terms/terms';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { PendingUsers } from './pages/pending-users/pending-users';
import { ActiveUsers } from './pages/active-users/active-users';
import { ViewReports } from './pages/view-reports/view-reports';
import { PendingCases } from './pages/pending-cases/pending-cases';
import { PendingUpdates } from './pages/pending-updates/pending-updates';
import { AdminUpdateCase } from './pages/admin-update-case/admin-update-case';
import { AdminUpdateForm } from './pages/admin-update-form/admin-update-form';
import { AdminRemoveCase } from './pages/admin-remove-case/admin-remove-case';
import { AdminRemovedCases } from './pages/admin-removed-cases/admin-removed-cases';

export const routes: Routes = [
  { path: 'login', component: Login, canActivate: [loginGuard] },
  { path: 'register', component: Register, canActivate: [loginGuard] },
  { path: 'report-issue', component: PublicReport },
  { path: 'terms', component: Terms },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: '', component: Home },
      { path: 'add', component: AddCase },
      { path: 'update', component: UpdateCaseList },
      { path: 'case/:id', component: CaseDetails },
      { path: 'search', component: SearchCase },
      { path: 'report', component: ReportIssue },
      { path: 'admin/home', component: AdminHome, canActivate: [adminGuard] },
      { path: 'admin/pending-users', component: PendingUsers, canActivate: [adminGuard] },
      { path: 'admin/active-users', component: ActiveUsers, canActivate: [adminGuard] },
      { path: 'admin/reports', component: ViewReports, canActivate: [adminGuard] },
      { path: 'admin/pending-cases', component: PendingCases, canActivate: [adminGuard] },
      { path: 'admin/pending-updates', component: PendingUpdates, canActivate: [adminGuard] },
      { path: 'admin/add-case', component: AddCase, canActivate: [adminGuard] },
      { path: 'admin/update-case', component: AdminUpdateCase, canActivate: [adminGuard] },
      { path: 'admin/update-form/:id', component: AdminUpdateForm, canActivate: [adminGuard] },
      { path: 'admin/remove-case', component: AdminRemoveCase, canActivate: [adminGuard] },
      { path: 'admin/AdminRemovedCasesPage', component: AdminRemovedCases, canActivate: [adminGuard] },
    ],
  },
  { path: '**', redirectTo: '' },
];
