// Central configuration; edit here before touching app.js
const CONFIG = {
  // Initial view: Sinaloa; change to [23.6, -102.5] / 5 for the whole country
  centro: [24.6, -107.2],
  zoom: 7,
  // Free key from https://carto.com/basemaps/apikey; leave empty to use OpenStreetMap tiles
  cartoKey: "",
  rutas: {
    eventos: "datos/eventos.json",
    indicadores: "datos/indicadores.json",
    fuentes: "datos/fuentes.json",
    estados: "datos/geo/estados.geojson"
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
  }
};
