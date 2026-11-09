/// <reference types="vite/client" />
import { createRoot } from 'react-dom/client';
import { App } from '../App';
import { Prototype } from './Prototype';

createRoot(document.getElementById('root')!).render(
  <App experiment={<Prototype />} allowOfflineExperiment={import.meta.env.DEV} />,
);
