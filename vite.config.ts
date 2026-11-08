import {defineConfig} from 'vite';

export default defineConfig({
  server:{proxy:{'/api':'http://127.0.0.1:3000'}},
  build:{rollupOptions:{input:{laboratory:'index.html', prototype:'prototype/index.html'}}},
});
