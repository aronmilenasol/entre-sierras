import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { HomePage } from './components/HomePage';
import { AboutPage } from './components/AboutPage';

const Page = window.location.pathname === '/acerca.html' ? AboutPage : HomePage;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
