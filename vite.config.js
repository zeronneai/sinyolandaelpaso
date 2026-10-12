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

const paginas = { main: resolve(__dirname, 'index.html') };
if (existsSync(resolve(__dirname, 'en/index.html'))) paginas.en = resolve(__dirname, 'en/index.html');

export default defineConfig({
  plugins: [contenidoEditable()],
  build: {
    assetsDir: 'static',
    rollupOptions: { input: paginas },
  },
});
