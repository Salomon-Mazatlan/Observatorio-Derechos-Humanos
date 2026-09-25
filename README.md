# Observatorio de Derechos Humanos (mapa interactivo)

Sitio estático para GitHub Pages. Sin dependencias de compilación: HTML, CSS, JavaScript y archivos JSON.

## Estructura

```
index.html                 página única con el mapa y el panel lateral
css/estilos.css            estilos
js/config.js               temas, colores, rutas y niveles de verificación
js/app.js                  lógica del mapa (capas, filtros, detalle)
js/exportar.js             exportación a PNG con título, leyenda, norte, escala y créditos
datos/eventos.json         eventos puntuales (marcadores)
datos/indicadores.json     definiciones de indicadores y valores por entidad
datos/fuentes.json         catálogo de fuentes
datos/geo/estados.geojson  32 entidades (Marco Geoestadístico INEGI 2022, simplificado)
datos/geo/sinaloa_municipios.geojson  18 municipios de Sinaloa (INEGI 2022, sin Eldorado ni Juan José Ríos)
herramientas/actualizar_eventos.py  carga de eventos desde captura_eventos.xlsx
herramientas/crear_plantilla.py     regenera captura_eventos.xlsx con los eventos y fuentes actuales
captura_eventos.xlsx       plantilla de captura (contiene los eventos publicados)
docs/indicadores.md        ficha metodológica de indicadores
```

## Publicar en GitHub Pages

1. Crear un repositorio (por ejemplo `observatorio-ddhh`) y subir estos archivos a la rama `main`.
2. En Settings > Pages, elegir "Deploy from a branch", rama `main`, carpeta `/ (root)`.
3. El sitio queda en `https://<usuario>.github.io/observatorio-ddhh/`.

## Probar en local

El navegador bloquea `fetch` de archivos locales, así que hay que servir la carpeta:

```
python -m http.server 8000
```

y abrir `http://localhost:8000`.

## Cómo agregar un evento

Añadir un objeto a `datos/eventos.json`:

```json
{
  "id": "ev-009",
  "tema": "desaparicion",
  "tipo": "búsqueda en campo",
  "fecha": "2026-01-15",
  "lat": 24.80, "lon": -107.39,
  "lugar": "Culiacán, Sinaloa",
  "titulo": "Título breve",
  "descripcion": "Qué pasó, según la fuente.",
  "fuente": "ceb-sin",
  "url": "https://...",
  "verificacion": "campo",
  "ejemplo": false
}
```

Valores válidos de `tema`: `migracion`, `desplazamiento`, `desaparicion`, `periodistas`.
Valores válidos de `verificacion`: `oficial`, `organización`, `campo`, `prensa`, `sin verificar`.
`fuente` debe coincidir con un `id` de `datos/fuentes.json`.

## Estado de los datos

`datos/eventos.json` contiene registros reales de desplazamiento forzado tomados de prensa e informes (2021 a 2026, Sinaloa, Chiapas, Guerrero, Michoacán, Chihuahua, Durango y Zacatecas), con nivel de verificación según quién dio la cifra. Las coordenadas de la mayoría son la cabecera municipal, así indicado en la descripción. También contiene 29 registros reales sobre periodistas y personas defensoras (2024 a 2026): asesinatos y desapariciones documentados por ARTICLE 19, RSF, CPJ y CEMDA, casos de acoso judicial y agresiones por autoridades, cifras del Instituto de Protección de Sinaloa y de la Asociación 7 de Junio, e informes nacionales. Criterio de nombres: se nombra a las personas asesinadas o desaparecidas tal como lo hacen las organizaciones que documentan los casos; las personas agredidas que siguen en activo no se nombran. Los eventos de migración y desaparición siguen siendo ejemplos.

`datos/indicadores.json` incluye dos indicadores reales de desplazamiento: personas desplazadas en 2025 por entidad (PDH Ibero, calculado a partir de porcentajes) y porcentaje de población desplazada 2020-2025 (Encuesta Intercensal 2025, solo entidades con cifra publicada). En el tema de periodistas y personas defensoras hay tres indicadores reales: personas beneficiarias del Mecanismo federal por entidad (corte mayo de 2026, 22 entidades), agresiones a la prensa 2025 (ARTICLE 19, solo cinco entidades con cifra publicada) y periodistas asesinados por entidad en 2025 y 2026 (dos periodos, útil para probar el selector). El resto son ejemplos.

## Cómo agregar un valor de indicador

En `datos/indicadores.json`, dentro de `valores`:

```json
{ "indicador": "des_rnpdno", "cve_ent": "25", "periodo": "2026-06-30", "valor": 0, "ejemplo": false }
```

`cve_ent` es la clave INEGI de la entidad (dos dígitos, Sinaloa es `25`). Para un valor municipal (mapa de Sinaloa) se añade `"cve_mun": "006"` con la clave de tres dígitos del municipio; los valores sin `cve_mun` alimentan el mapa de México y los que lo traen alimentan el de Sinaloa.

## Mapas temáticos

El menú superior permite elegir el mapa (México por entidad, Sinaloa por municipio) y qué ver (eventos o un indicador). Un indicador se pinta por colores (coropleta) o por círculos proporcionales. La coropleta usa cinco clases por cuantiles: se ordenan las unidades con dato y cada clase recibe aproximadamente la misma cantidad de unidades. Se eligió este método porque los indicadores del observatorio son muy asimétricos (pocas entidades concentran la mayoría de los casos) y con intervalos iguales casi todo el mapa quedaría en la clase más baja. Cero y sin dato van en gris.

El selector de periodo (mes inicial y final) filtra los eventos por fecha. Sobre los indicadores actúa así: se conservan los valores cuyo periodo se traslapa con el rango y, si una unidad tiene varios, se muestra el más reciente. Un valor anual ("2025") cubre todo el año; un valor con fecha ("2025-06-30") cubre ese mes.

La opción "Eventos registrados (conteo)" cuenta, dentro de cada polígono, los eventos visibles con los filtros activos.

Para tasas por 100 mil habitantes hay que llenar `poblacion` en `datos/indicadores.json` con `{"cve_ent": "25", "cve_mun": "006", "valor": 0}` (CONAPO o Censo); esa vista queda pendiente en el código.

## Exportar a PNG

El botón "Exportar PNG" genera una imagen a doble resolución de la vista actual con título, subtítulo (mapa y periodo), leyenda, flecha de norte, barra de escala y créditos. No usa librerías externas: copia los mosaicos del mapa base desde la página y vuelve a dibujar polígonos y marcadores. El pie lista todas las fuentes activas en la vista (la del indicador y las de cada evento visible) y una línea "Cómo citar" con autor, año, título, fecha y dirección de la página. El autor y la dirección se configuran en `js/config.js` (`sitio`); si la dirección se deja vacía se usa la de la página publicada. Para que el navegador permita copiar los mosaicos, el proveedor del mapa base debe aceptar CORS (OpenStreetMap y CARTO lo hacen). Si se cambia a otro proveedor y la exportación falla, esa es la causa.

## Pendientes

- Tasas por 100 mil habitantes (requiere `poblacion`).
- Actualizar el GeoJSON de Sinaloa con los 20 municipios cuando INEGI publique el marco con Eldorado y Juan José Ríos.
- Línea de tiempo y gráficas por indicador.
- Exportación de los datos filtrados.
