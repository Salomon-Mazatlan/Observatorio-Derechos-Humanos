# Observatorio de Derechos Humanos (mapa interactivo)

Sitio estático para GitHub Pages. Sin dependencias de compilación: HTML, CSS, JavaScript y archivos JSON.

## Estructura

```
index.html                 página única con el mapa y el panel lateral
css/estilos.css            estilos
js/config.js               temas, colores, rutas y niveles de verificación
js/app.js                  lógica del mapa (capas, filtros, detalle)
datos/eventos.json         eventos puntuales (marcadores)
datos/indicadores.json     definiciones de indicadores y valores por entidad
datos/fuentes.json         catálogo de fuentes
datos/geo/estados.geojson  32 entidades (Marco Geoestadístico INEGI 2022, simplificado)
datos/geo/sinaloa_municipios.geojson  18 municipios de Sinaloa (INEGI 2022, sin Eldorado ni Juan José Ríos)
herramientas/actualizar_eventos.py  carga de eventos desde captura_eventos.xlsx
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

## Cómo agregar un valor de indicador

En `datos/indicadores.json`, dentro de `valores`:

```json
{ "indicador": "des_rnpdno", "cve_ent": "25", "periodo": "2026-06-30", "valor": 0, "ejemplo": false }
```

`cve_ent` es la clave INEGI de la entidad (dos dígitos, Sinaloa es `25`). Para un valor municipal (mapa de Sinaloa) se añade `"cve_mun": "006"` con la clave de tres dígitos del municipio; los valores sin `cve_mun` alimentan el mapa de México y los que lo traen alimentan el de Sinaloa.

## Mapas temáticos

El menú superior permite elegir el mapa (México por entidad, Sinaloa por municipio) y qué ver (eventos o un indicador). Un indicador se pinta por colores (coropleta) o por círculos proporcionales. La coropleta usa cinco clases por cuantiles: se ordenan las unidades con dato y cada clase recibe aproximadamente la misma cantidad de unidades. Se eligió este método porque los indicadores del observatorio son muy asimétricos (pocas entidades concentran la mayoría de los casos) y con intervalos iguales casi todo el mapa quedaría en la clase más baja. Cero y sin dato van en gris.

La opción "Eventos registrados (conteo)" cuenta, dentro de cada polígono, los eventos visibles con los filtros activos.

Para tasas por 100 mil habitantes hay que llenar `poblacion` en `datos/indicadores.json` con `{"cve_ent": "25", "cve_mun": "006", "valor": 0}` (CONAPO o Censo); esa vista queda pendiente en el código.

## Pendientes

- Tasas por 100 mil habitantes (requiere `poblacion`).
- Actualizar el GeoJSON de Sinaloa con los 20 municipios cuando INEGI publique el marco con Eldorado y Juan José Ríos.
- Línea de tiempo y gráficas por indicador.
- Exportación de los datos filtrados.
