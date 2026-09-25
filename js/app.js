(async function () {
  const estado = {
    eventos: [], indicadores: { definiciones: [], valores: [], poblacion: [] }, fuentes: [],
    geos: {},                 // loaded polygon files by map id
    mapaId: "mexico",
    vista: "eventos",         // "eventos" | "tematico"
    forma: "coropleta",       // "coropleta" | "circulos"
    indicador: "_eventos",    // "_eventos" counts visible events per polygon
    temasActivos: new Set(Object.keys(CONFIG.temas)),
    verifActivas: new Set(CONFIG.verificacion),
    texto: "", desde: null, hasta: null   // "YYYY-MM" or null
  };

  const mapa = L.map("mapa", { zoomControl: false });
  L.control.zoom({ position: "bottomright" }).addTo(mapa);
  // CARTO tiles need a key since Aug 2026; fall back to plain OSM without one
  if (CONFIG.cartoKey) {
    L.tileLayer(`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${CONFIG.cartoKey}`, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd", maxZoom: 18
    }).addTo(mapa);
  } else {
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 18
    }).addTo(mapa);
  }

  const capaPoligonos = L.geoJSON(null, { style: estiloNeutro, onEachFeature: alPoligono }).addTo(mapa);
  const capaCirculos = L.layerGroup().addTo(mapa);
  const capaEventos = L.layerGroup().addTo(mapa);

  const [eventos, indicadores, fuentes] = await Promise.all(
    Object.values(CONFIG.rutas).map(r => fetch(r).then(x => x.json()))
  );
  estado.eventos = eventos;
  estado.indicadores = indicadores;
  estado.fuentes = fuentes;

  construirBarra();
  construirTemas();
  construirVerificacion();
  construirIndicadores();
  construirFuentes();
  iniciarFiltros();
  await cambiarMapa("mexico");

  // ---------- top bar ----------

  function construirBarra() {
    const cont = document.getElementById("sel-mapa");
    Object.entries(CONFIG.mapas).forEach(([id, m]) => {
      const b = document.createElement("button");
      b.type = "button"; b.dataset.mapa = id; b.textContent = m.nombre;
      b.setAttribute("aria-pressed", String(id === estado.mapaId));
      b.addEventListener("click", () => cambiarMapa(id));
      cont.appendChild(b);
    });
    document.querySelectorAll("#sel-vista button").forEach(b =>
      b.addEventListener("click", () => cambiarVista(b.dataset.vista)));
    document.querySelectorAll("#sel-forma button").forEach(b =>
      b.addEventListener("click", () => { estado.forma = b.dataset.forma; marcar("#sel-forma", "forma", estado.forma); dibujar(); }));
    document.getElementById("eventos-encima").addEventListener("change", dibujar);
    const desde = document.getElementById("desde"), hasta = document.getElementById("hasta");
    [desde, hasta].forEach(i => i.addEventListener("change", () => {
      estado.desde = mesValido(desde.value) ? desde.value : null;
      estado.hasta = mesValido(hasta.value) ? hasta.value : null;
      dibujar();
    }));
    document.getElementById("periodo-todo").addEventListener("click", () => {
      desde.value = ""; hasta.value = ""; estado.desde = estado.hasta = null; dibujar();
    });
    habilitarTematico(false);
  }

  function mesValido(v) { return /^\d{4}-\d{2}$/.test(v); }

  // Thematic controls stay visible but disabled while viewing events
  function habilitarTematico(on) {
    document.getElementById("indicador").disabled = !on;
    document.querySelectorAll("#sel-forma button").forEach(b => b.disabled = !on);
  }

  function marcar(sel, attr, valor) {
    document.querySelectorAll(`${sel} button`).forEach(b =>
      b.setAttribute("aria-pressed", String(b.dataset[attr] === valor)));
  }

  async function cambiarMapa(id) {
    estado.mapaId = id;
    marcar("#sel-mapa", "mapa", id);
    const m = CONFIG.mapas[id];
    if (!estado.geos[id]) estado.geos[id] = await fetch(m.geo).then(x => x.json());
    capaPoligonos.clearLayers();
    capaPoligonos.addData(estado.geos[id]);
    mapa.fitBounds(capaPoligonos.getBounds(), { padding: [10, 10] });
    document.getElementById("detalle").hidden = true;
    construirIndicadores();
    dibujar();
  }

  function cambiarVista(v) {
    estado.vista = v;
    marcar("#sel-vista", "vista", v);
    const tematico = v === "tematico";
    habilitarTematico(tematico);
    document.getElementById("bloque-tematico").hidden = !tematico;
    dibujar();
  }

  // ---------- sidebar builders ----------

  function construirTemas() {
    const cont = document.getElementById("temas");
    Object.entries(CONFIG.temas).forEach(([id, t]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "tema tema--activo"; b.dataset.tema = id;
      b.style.setProperty("--tema", t.color);
      b.setAttribute("aria-pressed", "true");
      b.innerHTML = `<span class="tema__punto"></span>${t.nombre}`;
      b.addEventListener("click", () => {
        estado.temasActivos.has(id) ? estado.temasActivos.delete(id) : estado.temasActivos.add(id);
        const on = estado.temasActivos.has(id);
        b.classList.toggle("tema--activo", on);
        b.setAttribute("aria-pressed", String(on));
        dibujar();
      });
      cont.appendChild(b);
    });
  }

  function construirVerificacion() {
    const cont = document.getElementById("verif");
    CONFIG.verificacion.forEach(v => {
      const l = document.createElement("label");
      l.className = "verif__item";
      l.innerHTML = `<input type="checkbox" checked value="${v}"> <span class="badge badge--${clase(v)}">${v}</span>`;
      l.querySelector("input").addEventListener("change", e => {
        e.target.checked ? estado.verifActivas.add(v) : estado.verifActivas.delete(v);
        dibujar();
      });
      cont.appendChild(l);
    });
  }

  // Only indicators with values at the current map level are offered
  function construirIndicadores() {
    const sel = document.getElementById("indicador");
    const nivel = CONFIG.mapas[estado.mapaId].nivel;
    sel.innerHTML = "";
    const o0 = document.createElement("option");
    o0.value = "_eventos"; o0.textContent = "Eventos registrados (conteo)";
    sel.appendChild(o0);
    estado.indicadores.definiciones.forEach(d => {
      if (!valoresDe(d.id, nivel).length) return;
      const o = document.createElement("option");
      o.value = d.id; o.textContent = `${d.nombre} (${CONFIG.temas[d.tema].nombre})`;
      sel.appendChild(o);
    });
    if (![...sel.options].some(o => o.value === estado.indicador)) estado.indicador = "_eventos";
    sel.value = estado.indicador;
    sel.onchange = () => { estado.indicador = sel.value; dibujar(); };
  }

  function construirFuentes() {
    const ul = document.getElementById("fuentes");
    estado.fuentes.forEach(f => {
      const li = document.createElement("li");
      const nombre = f.url ? `<a href="${f.url}" target="_blank" rel="noopener">${f.nombre}</a>` : f.nombre;
      li.innerHTML = `${nombre}<br><small>${CONFIG.tiposFuente[f.tipo] || f.tipo} · ${f.periodicidad} · ${f.nivel}</small>`;
      ul.appendChild(li);
    });
  }

  function iniciarFiltros() {
    document.getElementById("buscar").addEventListener("input", e => {
      estado.texto = e.target.value.trim().toLowerCase();
      dibujar();
    });
  }

  // ---------- drawing ----------

  function dibujar() {
    capaEventos.clearLayers();
    capaCirculos.clearLayers();
    const encima = document.getElementById("eventos-encima").checked;
    // Filters only matter when events are drawn or counted
    document.getElementById("bloque-filtros").hidden =
      estado.vista === "tematico" && !encima && estado.indicador !== "_eventos";
    if (estado.vista === "eventos") {
      capaPoligonos.setStyle(estiloNeutro);
      dibujarEventos();
    } else {
      dibujarTematico();
      if (document.getElementById("eventos-encima").checked) dibujarEventos();
    }
  }

  function eventoVisible(e) {
    if (!estado.temasActivos.has(e.tema)) return false;
    if (!estado.verifActivas.has(e.verificacion)) return false;
    const mes = e.fecha.slice(0, 7);
    if (estado.desde && mes < estado.desde) return false;
    if (estado.hasta && mes > estado.hasta) return false;
    if (estado.texto) {
      const blob = `${e.lugar} ${e.titulo} ${e.tipo} ${e.descripcion}`.toLowerCase();
      if (!blob.includes(estado.texto)) return false;
    }
    return true;
  }

  function dibujarEventos() {
    let n = 0;
    estado.eventos.filter(eventoVisible).forEach(e => {
      n++;
      const color = CONFIG.temas[e.tema].color;
      const m = L.circleMarker([e.lat, e.lon], {
        radius: 7, color: "#fff", weight: 1.5, fillColor: color, fillOpacity: 0.9,
        dashArray: e.ejemplo ? "2 2" : null
      });
      m.bindTooltip(e.titulo, { direction: "top", offset: [0, -6] });
      m.on("click", () => mostrarDetalleEvento(e));
      capaEventos.addLayer(m);
    });
    document.getElementById("conteo").textContent =
      (n === 1 ? "1 evento en el mapa" : `${n} eventos en el mapa`) + ` (${textoPeriodo().toLowerCase()})`;
  }

  // Values of an indicator at the level of the current map
  function valoresDe(id, nivel) {
    return estado.indicadores.valores.filter(v =>
      v.indicador === id && (nivel === "municipio" ? !!v.cve_mun : !v.cve_mun));
  }

  function claveDe(props) {
    return CONFIG.mapas[estado.mapaId].nivel === "municipio" ? props.cve_ent + props.cve_mun : props.cve_ent;
  }

  // Returns {clave: {valor, periodo, ejemplo}} for the chosen indicator
  function datosTematicos() {
    const nivel = CONFIG.mapas[estado.mapaId].nivel;
    const datos = {};
    if (estado.indicador === "_eventos") {
      const visibles = estado.eventos.filter(eventoVisible);
      estado.geos[estado.mapaId].features.forEach(f => {
        const n = visibles.filter(e => dentro([e.lon, e.lat], f.geometry)).length;
        datos[claveDe(f.properties)] = { valor: n, periodo: "filtro actual", ejemplo: false };
      });
    } else {
      // Keep, per unit, the most recent value whose period falls inside the selected range
      valoresDe(estado.indicador, nivel).forEach(v => {
        const [ini, fin] = mesesDePeriodo(v.periodo);
        if (estado.desde && fin < estado.desde) return;
        if (estado.hasta && ini > estado.hasta) return;
        const k = nivel === "municipio" ? v.cve_ent + v.cve_mun : v.cve_ent;
        if (!datos[k] || fin > mesesDePeriodo(datos[k].periodo)[1]) datos[k] = { valor: v.valor, periodo: v.periodo, ejemplo: !!v.ejemplo };
      });
    }
    return datos;
  }

  // Period covered by a value, as [first month, last month]: "2025" -> whole year, "2025-06-30" -> that month
  function mesesDePeriodo(p) {
    const s = String(p);
    return s.length === 4 ? [s + "-01", s + "-12"] : [s.slice(0, 7), s.slice(0, 7)];
  }

  function textoPeriodo() {
    if (!estado.desde && !estado.hasta) return "Todo el periodo";
    return `${estado.desde || "inicio"} a ${estado.hasta || "hoy"}`;
  }

  function dibujarTematico() {
    const def = estado.indicador === "_eventos"
      ? { nombre: "Eventos registrados", unidad: "eventos", tema: null, nota: "Conteo de los eventos visibles con los filtros actuales, ubicados dentro de cada polígono." }
      : estado.indicadores.definiciones.find(d => d.id === estado.indicador);
    const color = def.tema ? CONFIG.temas[def.tema].color : "#1f2a37";
    const datos = datosTematicos();
    const valores = Object.values(datos).map(d => d.valor).filter(v => v > 0);
    const cortes = cortesCuantiles(valores, CONFIG.clases);
    const rampa = crearRampa(CONFIG.colorClaro, color, CONFIG.clases);

    document.getElementById("tematico-titulo").textContent = def.nombre;
    document.getElementById("tematico-nota").textContent = `Periodo: ${textoPeriodo()}. ${def.nota || ""}`;

    if (estado.forma === "coropleta") {
      capaPoligonos.setStyle(f => {
        const d = datos[claveDe(f.properties)];
        if (!d || d.valor === 0) return { ...estiloNeutro(), fillColor: CONFIG.colorSinDato, fillOpacity: 0.55 };
        return { color: "#ffffff", weight: 1, fillColor: rampa[claseDe(d.valor, cortes)], fillOpacity: 0.85 };
      });
      dibujarLeyendaColores(cortes, rampa, def.unidad, valores.length);
    } else {
      capaPoligonos.setStyle(estiloNeutro);
      const max = Math.max(...valores, 1);
      estado.geos[estado.mapaId].features.forEach(f => {
        const d = datos[claveDe(f.properties)];
        if (!d || d.valor === 0) return;
        const c = L.geoJSON(f).getBounds().getCenter();
        const r = 5 + 30 * Math.sqrt(d.valor / max);
        const m = L.circleMarker(c, { radius: r, color, weight: 1, fillColor: color, fillOpacity: 0.35, dashArray: d.ejemplo ? "3 3" : null });
        m.bindTooltip(etiquetaValor(f.properties.nombre, d, def.unidad));
        m.on("click", () => mostrarDetallePoligono(f.properties));
        capaCirculos.addLayer(m);
      });
      document.getElementById("leyenda").innerHTML =
        `<div class="leyenda__fila"><span class="leyenda__circulo" style="--tema:${color}"></span>Área proporcional a ${def.unidad}. Máximo: ${max.toLocaleString("es-MX")}.</div>`;
    }
    const fuente = def.fuente ? `Fuente: ${nombreFuente(def.fuente)}. ` : "";
    document.getElementById("tematico-metodo").textContent =
      fuente + (estado.forma === "coropleta"
        ? `Clases por cuantiles (${CONFIG.clases}), cada clase agrupa aproximadamente la misma cantidad de unidades. Sin dato o cero en gris.`
        : "Los círculos con borde punteado muestran datos de ejemplo.");
  }

  // Quantile breaks: robust to the heavy skew typical of these indicators
  function cortesCuantiles(valores, k) {
    const v = [...valores].sort((a, b) => a - b);
    if (!v.length) return [];
    const unicos = [...new Set(v)];
    if (unicos.length <= k) return unicos;
    const cortes = [];
    for (let i = 1; i <= k; i++) cortes.push(v[Math.min(v.length - 1, Math.ceil(i * v.length / k) - 1)]);
    return [...new Set(cortes)];
  }
  function claseDe(valor, cortes) {
    const i = cortes.findIndex(c => valor <= c);
    return Math.min(i < 0 ? cortes.length - 1 : i, CONFIG.clases - 1);
  }

  function crearRampa(claro, oscuro, k) {
    const a = hexRgb(claro), b = hexRgb(oscuro);
    return Array.from({ length: k }, (_, i) => {
      const t = k === 1 ? 1 : 0.15 + 0.85 * (i / (k - 1));
      return rgbHex(a.map((x, j) => Math.round(x + (b[j] - x) * t)));
    });
  }
  function hexRgb(h) { return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); }
  function rgbHex(rgb) { return "#" + rgb.map(x => x.toString(16).padStart(2, "0")).join(""); }

  function dibujarLeyendaColores(cortes, rampa, unidad, n) {
    const ley = document.getElementById("leyenda");
    if (!cortes.length) { ley.innerHTML = `<p class="nota">Sin datos para este mapa.</p>`; return; }
    let previo = 0;
    const filas = cortes.map((c, i) => {
      const txt = previo === c ? fmt(c) : previo === 0 ? `hasta ${fmt(c)}` : `${fmt(previo)} a ${fmt(c)}`;
      previo = c;
      return `<div class="leyenda__fila"><span class="leyenda__caja" style="background:${rampa[i]}"></span>${txt}</div>`;
    });
    filas.push(`<div class="leyenda__fila"><span class="leyenda__caja" style="background:${CONFIG.colorSinDato}"></span>Sin dato o cero</div>`);
    ley.innerHTML = `<p class="nota">${unidad}, ${n} unidades con dato</p>` + filas.join("");
  }

  // ---------- polygons ----------

  function estiloNeutro() {
    return { color: "#8a93a1", weight: 0.9, fillColor: "#ffffff", fillOpacity: 0.02 };
  }

  function alPoligono(feature, layer) {
    layer.on("mouseover", () => {
      if (estado.vista !== "tematico" || estado.forma !== "coropleta") { layer.bindTooltip(feature.properties.nombre, { sticky: true, className: "tooltip-poligono" }).openTooltip(); return; }
      const d = datosTematicos()[claveDe(feature.properties)];
      const def = estado.indicador === "_eventos" ? { unidad: "eventos" } : estado.indicadores.definiciones.find(x => x.id === estado.indicador);
      layer.bindTooltip(d ? etiquetaValor(feature.properties.nombre, d, def.unidad) : `<strong>${feature.properties.nombre}</strong><br>sin dato`, { sticky: true }).openTooltip();
    });
    layer.on("click", () => mostrarDetallePoligono(feature.properties));
  }

  function etiquetaValor(nombre, d, unidad) {
    return `<strong>${nombre}</strong><br>${d.valor.toLocaleString("es-MX")} ${unidad} (${d.periodo})${d.ejemplo ? "<br><em>dato de ejemplo</em>" : ""}`;
  }

  function mostrarDetallePoligono(p) {
    const nivel = CONFIG.mapas[estado.mapaId].nivel;
    const feat = estado.geos[estado.mapaId].features.find(f => claveDe(f.properties) === claveDe(p));
    const vals = estado.indicadores.valores.filter(v =>
      nivel === "municipio" ? v.cve_ent === p.cve_ent && v.cve_mun === p.cve_mun : v.cve_ent === p.cve_ent && !v.cve_mun);
    const filas = vals.map(v => {
      const d = estado.indicadores.definiciones.find(x => x.id === v.indicador);
      return `<li>${d.nombre}: <strong>${v.valor.toLocaleString("es-MX")}</strong> ${d.unidad} (${v.periodo})${v.ejemplo ? " <span class='badge badge--ejemplo'>ejemplo</span>" : ""}</li>`;
    }).join("");
    const nEv = estado.eventos.filter(eventoVisible).filter(e => dentro([e.lon, e.lat], feat.geometry)).length;
    const clave = nivel === "municipio" ? `Clave INEGI ${p.cve_ent}${p.cve_mun}` : `Clave INEGI ${p.cve_ent}`;
    document.getElementById("detalle-cuerpo").innerHTML = `
      <h3 class="detalle__titulo">${p.nombre}</h3>
      <p class="detalle__meta">${clave} · ${nEv} eventos con los filtros actuales</p>
      ${filas ? `<ul class="lista">${filas}</ul>` : "<p class='nota'>Sin indicadores cargados para esta unidad.</p>"}`;
    document.getElementById("detalle").hidden = false;
  }

  function mostrarDetalleEvento(e) {
    const f = estado.fuentes.find(x => x.id === e.fuente);
    const link = e.url ? `<p><a href="${e.url}" target="_blank" rel="noopener">Ver fuente original</a></p>` : "";
    document.getElementById("detalle-cuerpo").innerHTML = `
      <p class="detalle__tema" style="--tema:${CONFIG.temas[e.tema].color}">${CONFIG.temas[e.tema].nombre} · ${e.tipo}</p>
      <h3 class="detalle__titulo">${e.titulo}</h3>
      <p class="detalle__meta">${formatoFecha(e.fecha)} · ${e.lugar}</p>
      <p>${e.descripcion}</p>
      <p><span class="badge badge--${clase(e.verificacion)}">${e.verificacion}</span>
         ${e.ejemplo ? '<span class="badge badge--ejemplo">ejemplo</span>' : ""}</p>
      <p class="nota">Fuente: ${f ? f.nombre : e.fuente}</p>${link}`;
    const sec = document.getElementById("detalle");
    sec.hidden = false;
    sec.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ---------- geometry helpers ----------

  // Ray casting point-in-polygon for Polygon and MultiPolygon geometries
  function dentro(pt, geom) {
    const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
    return polys.some(rings => enAnillo(pt, rings[0]) && !rings.slice(1).some(h => enAnillo(pt, h)));
  }
  function enAnillo(pt, anillo) {
    let dentroFlag = false;
    for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
      const [xi, yi] = anillo[i], [xj, yj] = anillo[j];
      const cruza = (yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi;
      if (cruza) dentroFlag = !dentroFlag;
    }
    return dentroFlag;
  }

  // ---------- misc helpers ----------

  function clase(v) { return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-"); }
  function fmt(n) { return n.toLocaleString("es-MX"); }
  function nombreFuente(id) { const f = estado.fuentes.find(x => x.id === id); return f ? f.nombre : id; }
  function formatoFecha(iso) {
    const d = new Date(iso + "T00:00:00");
    return isNaN(d) ? iso : d.toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
  }
})();
