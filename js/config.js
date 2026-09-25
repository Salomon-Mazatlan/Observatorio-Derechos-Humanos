// Central configuration; edit here before touching app.js
const CONFIG = {
  // Free key from https://carto.com/basemaps/apikey; leave empty to use OpenStreetMap tiles
  cartoKey: "",
  // Used in the citation of exported images; empty url means the page's own address
  sitio: { nombre: "Observatorio de Derechos Humanos", autor: "", url: "" },
  rutas: {
    eventos: "datos/eventos.json",
    indicadores: "datos/indicadores/indice.json",
    fuentes: "datos/fuentes.json",
    marcoLegal: "datos/marco_legal.json"
  },
  // Colors of the legal-framework categories, from strongest to weakest protection
  marcoLegalColores: {
    ley_propia: "#7f1d1d", vinculo_federal: "#b91c1c", solo_periodistas: "#e07a5f",
    solo_fiscalia: "#f2b8a6", sin_instrumento: "#e2e5e9"
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
  // Color ramps for thematic maps; "tema" uses the active theme color, others are light-to-dark stops
  gamas: {
    tema:    { nombre: "Color del tema", paradas: null },
    rojos:   { nombre: "Rojos",   paradas: ["#fff5f0", "#fcbba1", "#fb6a4a", "#cb181d", "#67000d"] },
    azules:  { nombre: "Azules",  paradas: ["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08306b"] },
    verdes:  { nombre: "Verdes",  paradas: ["#f7fcf5", "#c7e9c0", "#74c476", "#238b45", "#00441b"] },
    morados: { nombre: "Morados", paradas: ["#fcfbfd", "#dadaeb", "#9e9ac8", "#6a51a3", "#3f007d"] },
    calidos: { nombre: "Amarillo a rojo", paradas: ["#ffffcc", "#fed976", "#fd8d3c", "#e31a1c", "#800026"] },
    viridis: { nombre: "Viridis", paradas: ["#fde725", "#5ec962", "#21918c", "#3b528b", "#440154"] },
    grises:  { nombre: "Grises",  paradas: ["#f7f7f7", "#cccccc", "#969696", "#525252", "#000000"] }
  },
  // Choropleth: number of classes and the light end of each theme ramp
  clases: 5,
  colorClaro: "#f4f4f1",
  colorSinDato: "#e2e5e9"
};
