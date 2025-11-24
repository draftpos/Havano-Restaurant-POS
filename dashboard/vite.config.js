import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from "path";
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	build: {
		chunkSizeWarningLimit: 1500,
		outDir: path.resolve(__dirname, "../havano_restaurant_pos/public/dashboard"),
		emptyOutDir: true,
		target: "es2015",
		sourcemap: true,
	},
	server: {
		proxy: {
			"^/(api|assets|files|app|login|pages|builder_assets|socket.io)": {
				target: "http://localhost:8000",
				changeOrigin: true,
				ws: true,
			},
		},
	},
});
