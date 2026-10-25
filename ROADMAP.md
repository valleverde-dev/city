# Roadmap — CityBuilder

Documento vivo del proyecto · actualízalo a medida que avanza el prototipo.

## Visión general

City builder isométrico, con un primer prototipo jugable ya en marcha (web, estética tipo Syndicate 1993). El plan: validar mecánicas en el prototipo web/iPad, consolidar el game design, y portar a Godot para publicar en App Store y Steam.

## Estado actual — v0.1.0 (25-oct-2026)

- Prototipo web verificado con smoke test automático (18/18 comprobaciones: construir, demoler, adyacencia, fondos, rotación, pausa, guardar/cargar, tick, persistencia).
- Build PWA instalable en iPad/iPhone ("Añadir a pantalla de inicio"), con modo offline.
- CI en GitHub Actions: build + test + despliegue a GitHub Pages en cada push a `main`.

**Bugs conocidos**

- [ ] **Exploit de monedas:** cada toque en una casilla llama a `tick()`, así que tocar repetidamente con "Demoler" (coste 0) genera ingresos infinitos. Arreglo: en `handleBuild` refrescar solo el HUD en vez de ejecutar un tick.
- [ ] Las fuentes (Orbitron, Share Tech Mono, Material Icons) se cargan de Google Fonts: la primera carga necesita conexión. Valorar empaquetarlas en `public/fonts/`.

## Mecánicas

### Game loop

- **Bucle corto (ya prototipado):** tocar casilla → construir/demoler → coste en monedas → tick de simulación → población e ingresos suben.
- **Bucle medio (por definir):** gestionar recursos más allá de monedas (energía, agua, seguridad — temática corporativa/distópica encaja con Syndicate), equilibrar gasto vs ingreso, desbloquear nuevos tipos de edificio según hitos.
- **Bucle largo (por definir):** progresión entre partidas o "eras" de la ciudad, prestigio/reinicio, o modo sandbox sin fin.
- **Pregunta abierta:** ¿un solo bucle sandbox, o capas de dificultad/campaña encima?

### Objetivos

- **Corto plazo:** hitos tipo "alcanza X población", "construye tu primera manzana".
- **Medio plazo:** desbloqueo de edificios/mecánicas nuevas (p. ej. distrito industrial, corporación rival).
- **Largo plazo:** condición de "victoria" en modo campaña (ciudad autosuficiente, dominancia económica) vs modo sandbox sin objetivo final.

### Misiones

- Tutorial guiado (ya hay base: pantalla de inicio, herramientas, coste/adyacencia).
- Contratos/encargos tipo Syndicate: misiones cortas generadas ("construye 5 tiendas en X turnos", "mantén el descontento bajo Y").
- Posible hilo narrativo corporativo si se quiere dar más identidad al juego (encaja con la estética ya elegida).

### Game over

- **Modo sandbox:** sin game over, solo progresión libre.
- **Modo escenario/campaña:** condiciones de derrota (bancarrota, disturbios/descontento, límite de tiempo no cumplido).
- **Recomendación:** empezar sin game over (sandbox) para validar el loop, añadir condiciones de fallo cuando haya un modo campaña definido.

## Assets

### Gráficos

- Definir pipeline de arte: tiles isométricos dibujados a mano vs generados, tamaño de tile base (el prototipo usa 64×32 px).
- Decidir si se mantiene estilo plano/vectorial (como el prototipo) o se pasa a pixel art/sprites más detallados al portar a Godot.

### Dirección de arte

- Ya establecida en el prototipo: estética Syndicate (1993) — paleta oscura casi negra, acentos neón (cian, rojo de alerta, ámbar, verde ácido), tipografía Orbitron/Share Tech Mono, UI de "terminal corporativo" con textura CRT.
- Recomendación: documentar esto como guía de estilo (moodboard + paleta + tipografías) para mantener consistencia al escalar assets.

### Música

- Estilo sugerido: synthwave/darksynth, coherente con la estética ya elegida.
- Opciones: herramientas de generación por IA, librerías de música libre de derechos, o composición encargada más adelante.
- Abierto a usar otras IAs (Gemini, ChatGPT, Atlas) también para generación de assets 3D cuando el proyecto lo requiera.

## Exports

### Godot

- **Momento de portar:** una vez el game loop esté validado en el prototipo web (evitar portar demasiado pronto y tener que rehacer diseño).
- **Qué migra directamente:** lógica de grid, costes/adyacencia, estructura de estado (ya en JSON, fácil de llevar a GDScript/Resources de Godot).
- **Motivo de elegir Godot:** exporta nativamente a iOS y a escritorio (Windows/Mac/Linux) para Steam, y es más ligero para iterar en solitario que Unity.

### GitHub

- Repositorio con `/web-prototype` (versión actual), `/godot` (port, cuando arranque) y este `ROADMAP.md` como referencia viva. ✅

## Producción

### App Store

- Cuenta de desarrollador Apple (99 USD/año).
- Aunque el desarrollo se haga desde el iPad, el envío final a la App Store requiere Xcode, que solo corre en Mac. Opciones para no depender de comprar un Mac de inmediato: servicios de Mac en la nube (MacStadium, etc.), runners macOS de CI/CD (GitHub Actions, Codemagic) que compilan y firman el build de iOS automáticamente, o pedir prestado/alquilar un Mac solo para el paso de publicación.

### Steam

- Cuenta de Steamworks (100 USD, reembolsable).
- Build de escritorio generado directamente desde Godot (Windows/Mac/Linux) — sin la limitación de Xcode que sí aplica a iOS.

## Fases sugeridas

1. **Prototipo web (actual):** validar game loop, mecánicas de coste/adyacencia, estética.
2. **Diseño de mecánicas:** cerrar objetivos, misiones y condición de game over.
3. **Producción de assets:** consolidar guía de estilo, música, posibles assets 3D.
4. **Port a Godot:** migrar lógica y UI, repositorio en GitHub ya activo.
5. **Producción:** preparar builds para Steam (directo) y App Store (resolver el paso de Xcode/Mac).
