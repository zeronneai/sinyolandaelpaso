import { defineConfig } from 'vite';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Plugin que pinta en el HTML el contenido de src/data/*.json, el horario de
// src/config.js y el sprite de iconos. Se recarga en dev al editar esos archivos.
function contenidoEditable() {
  let servidor;
  // En dev se carga con el grafo de módulos de Vite para ver los cambios de
  // config.js y horario.js sin reiniciar. En build, import normal.
  const cargar = () => (servidor ? servidor.ssrLoadModule('/build/render.js') : import('./build/render.js'));
  return {
    name: 'sinyolanda-contenido',
    configureServer(server) {
      servidor = server;
    },
    async transformIndexHtml(html, ctx) {
      const { renderHTML } = await cargar();
      const lang = ctx.path.startsWith('/en/') ? 'en' : 'es';
      return renderHTML(html, lang);
    },
    handleHotUpdate({ file, server }) {
      if (/src[\\/](data|partials)[\\/]|src[\\/]config\.js$|build[\\/]render\.js$/.test(file)) {
        server.ws.send({ type: 'full-reload' });
      }
    },
  };
}

// Sitio + páginas de la plataforma. Cada carpeta con index.html es una página.
const RUTAS = ['en', 'reservaciones', 'tu-noche', 'admin', 'mesa', 'pantalla', 'despechometro', 'como-te-fue', 'tarjeta'];
const paginas = { main: resolve(__dirname, 'index.html') };
for (const ruta of RUTAS) {
  if (existsSync(resolve(__dirname, ruta, 'index.html'))) paginas[ruta] = resolve(__dirname, ruta, 'index.html');
}

export default defineConfig({
  plugins: [contenidoEditable()],
  build: {
    assetsDir: 'static',
    rollupOptions: { input: paginas },
  },
});
