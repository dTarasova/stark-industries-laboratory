import {createRoot} from 'react-dom/client';
import {App} from './App';
import {TimelineApp} from './timeline/TimelineApp';
import './polish.css';

createRoot(document.getElementById('root')!).render(location.pathname.startsWith('/timelines') ? <TimelineApp /> : <App />);
