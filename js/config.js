// Central configuration; edit here before touching app.js
const CONFIG = {
  // Free key from https://carto.com/basemaps/apikey; leave empty to use OpenStreetMap tiles
  cartoKey: "",
  rutas: {
    eventos: "datos/eventos.json",
    indicadores: "datos/indicadores.json",
    fuentes: "datos/fuentes.json"
  },
  // Each map has its own polygon file and level of the values it can color
  mapas: {
    mexico:  { nombre: "México",  geo: "datos/geo/estados.geojson",            nivel: "entidad",   centro: [23.8, -102.5], zoom: 5 },
    sinaloa: { nombre: "Sinaloa", geo: "datos/geo/sinaloa_municipios.geojson", nivel: "municipio", centro: [25.0, -107.4], zoom: 7 }
  },
  temas: {
    migracion:      { nombre: "Migración",                 color: "#0f7b6c" },
    desplazamiento: { nombre: "Desplazamiento forzado",    color: "#c2410c" },
    desaparicion:   { nombre: "Desaparición forzada",      color: "#5b21b6" },
    periodistas:    { nombre: "Periodistas y defensores",  color: "#b91c1c" }
  },
  // Order matters: from strongest to weakest evidence
  verificacion: ["oficial", "organización", "campo", "prensa", "sin verificar"],
  tiposFuente: {
    oficial: "Fuente oficial",
    organizacion: "Organización civil",
    campo: "Trabajo de campo",
    prensa: "Prensa"
  },
  // Choropleth: number of classes and the light end of each theme ramp
  clases: 5,
  colorClaro: "#f4f4f1",
  colorSinDato: "#e2e5e9"
};
