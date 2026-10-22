import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage), title: 'Mentira!' },
  { path: 'sala/:code', loadComponent: () => import('./pages/room/room.page').then((m) => m.RoomPage), title: 'Mentira! · Sala' },
  { path: '**', redirectTo: '' },
];
