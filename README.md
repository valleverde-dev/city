# City Builder

City builder isométrico con estética de terminal corporativo (Syndicate, 1993). Prototipo web jugable en iPad, iPhone y escritorio; port previsto a Godot para App Store y Steam.

Plan y estado: [ROADMAP.md](ROADMAP.md)

## Estructura

```
.
├── ROADMAP.md                  documento vivo del proyecto
├── web-prototype/
│   ├── src/index.html          el juego (un único HTML autocontenido)
│   ├── public/                 manifest PWA, service worker, iconos
│   ├── scripts/build.mjs       build src + public → dist (sin dependencias)
│   ├── tests/smoke_test.py     test automático en Chromium (Playwright)
│   └── package.json
├── godot/                      port a Godot (fase 4)
└── .github/workflows/          CI: build + test + GitHub Pages
```

## Prototipo web

```bash
cd web-prototype
npm run build        # genera dist/
npm run serve        # http://localhost:8080
npm test             # smoke test sobre src/ (requiere: pip install playwright && python -m playwright install chromium)
```

Para iterar basta con abrir `web-prototype/src/index.html` en el navegador. El build añade lo necesario para instalarlo como app (PWA) y jugar offline.

### Jugar en el iPad

Con GitHub Pages activado (Settings → Pages → Source: *GitHub Actions*), cada push a `main` publica el build en `https://<usuario>.github.io/<repo>/`. En Safari: Compartir → *Añadir a pantalla de inicio* para abrirlo a pantalla completa como una app.

## Controles

- Toca una casilla para construir con la herramienta activa (calle, casa, tienda, parque) o demoler.
- Casas, tiendas y parques necesitan una calle adyacente.
- Pellizco o rueda del ratón: zoom. Botón ⟳: rotar la vista. Menú: pausa, guardar, cargar.
