import React from 'react';
import { Navigate } from 'react-router-dom';
import Chat from '../pages/chat';
import Contact from '../pages/contact';

export interface AppRoute {
  path: string;
  element: React.ReactNode;
}

export const appRoutes: AppRoute[] = [
  {
    path: '/',
    element: <Navigate to="/chat" replace />,
  },
  {
    path: '/chat',
    element: <Chat />,
  },
  {
    path: '/contact',
    element: <Contact />,
  },
  {
    path: '/discover',
    element: <div>发现</div>,
  },
  {
    path: '/moments',
    element: <div>朋友圈</div>,
  },
  {
    path: '/files',
    element: <div>文件</div>,
  },
  {
    path: '/favorites',
    element: <div>收藏</div>,
  },
  {
    path: '*',
    element: <Navigate to="/chat" replace />,
  },
];
