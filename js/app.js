(async function () {
  const estado = {
    eventos: [],
    indicadores: { definiciones: [], valores: [] },
    fuentes: [],
    estados: null,
    temasActivos: new Set(Object.keys(CONFIG.temas)),
    verifActivas: new Set(CONFIG.verificacion),
    texto: "",
    anioMin: null,
    anioMax: null,
    indicador: ""
  };

  const mapa = L.map("mapa", { zoomControl: false }).setView(CONFIG.centro, CONFIG.zoom);
  L.control.zoom({ position: "bottomright" }).addTo(mapa);
  // CARTO tiles need a key since Aug 2026; fall back to plain OSM without one
  if (CONFIG.cartoKey) {
    L.tileLayer(`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${CONFIG.cartoKey}`, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd", maxZoom: 18
    }).addTo(mapa);
  } else {
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18
    }).addTo(mapa);
  }

  const capaEstados = L.geoJSON(null, { style: estiloEstado, onEachFeature: alEstado }).addTo(mapa);
  const capaIndicador = L.layerGroup().addTo(mapa);
  const capaEventos = L.layerGroup().addTo(mapa);

  // Load all data in parallel
  const [eventos, indicadores, fuentes, estados] = await Promise.all(
    Object.values(CONFIG.rutas).map(r => fetch(r).then(x => x.json()))
  );
  estado.eventos = eventos;
  estado.indicadores = indicadores;
  estado.fuentes = fuentes;
  estado.estados = estados;

  capaEstados.addData(estados);
  construirTemas();
  construirVerificacion();
  construirIndicadores();
  construirFuentes();
  iniciarAnios();
  dibujarEventos();

  // ---------- UI builders ----------

  function construirTemas() {
    const cont = document.getElementById("temas");
    Object.entries(CONFIG.temas).forEach(([id, t]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tema tema--activo";
      b.dataset.tema = id;
      b.style.setProperty("--tema", t.color);
      b.setAttribute("aria-pressed", "true");
      b.innerHTML = `<span class="tema__punto"></span>${t.nombre}`;
      b.addEventListener("click", () => {
        if (estado.temasActivos.has(id)) estado.temasActivos.delete(id);
        else estado.temasActivos.add(id);
        const on = estado.temasActivos.has(id);
        b.classList.toggle("tema--activo", on);
        b.setAttribute("aria-pressed", String(on));
        dibujarEventos();
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
        if (e.target.checked) estado.verifActivas.add(v);
        else estado.verifActivas.delete(v);
        dibujarEventos();
      });
      cont.appendChild(l);
    });
  }

  function construirIndicadores() {
    const sel = document.getElementById("indicador");
    estado.indicadores.definiciones.forEach(d => {
      const o = document.createElement("option");
      o.value = d.id;
      o.textContent = `${d.nombre} (${CONFIG.temas[d.tema].nombre})`;
      sel.appendChild(o);
    });
    sel.addEventListener("change", () => {
      estado.indicador = sel.value;
      dibujarIndicador();
    });
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

  function iniciarAnios() {
    const anios = estado.eventos.map(e => +e.fecha.slice(0, 4)).filter(Boolean);
    const min = document.getElementById("anio-min");
    const max = document.getElementById("anio-max");
    if (anios.length) {
      min.value = Math.min(...anios);
      max.value = Math.max(...anios);
    }
    [min, max].forEach(i => i.addEventListener("input", () => {
      estado.anioMin = +min.value || null;
      estado.anioMax = +max.value || null;
      dibujarEventos();
    }));
    document.getElementById("buscar").addEventListener("input", e => {
      estado.texto = e.target.value.trim().toLowerCase();
      dibujarEventos();
    });
  }

  // ---------- Events layer ----------

  function eventoVisible(e) {
    if (!estado.temasActivos.has(e.tema)) return false;
    if (!estado.verifActivas.has(e.verificacion)) return false;
    const anio = +e.fecha.slice(0, 4);
    if (estado.anioMin && anio < estado.anioMin) return false;
    if (estado.anioMax && anio > estado.anioMax) return false;
    if (estado.texto) {
      const blob = `${e.lugar} ${e.titulo} ${e.tipo} ${e.descripcion}`.toLowerCase();
      if (!blob.includes(estado.texto)) return false;
    }
    return true;
  }

  function dibujarEventos() {
    capaEventos.clearLayers();
    let n = 0;
    estado.eventos.filter(eventoVisible).forEach(e => {
      n++;
      const color = CONFIG.temas[e.tema].color;
      const m = L.circleMarker([e.lat, e.lon], {
        radius: 7, color: "#fff", weight: 1.5, fillColor: color, fillOpacity: 0.9,
        dashArray: e.ejemplo ? "2 2" : null
      });
      m.bindTooltip(e.titulo, { direction: "top", offset: [0, -6] });
      m.on("click", () => mostrarDetalle(e));
      capaEventos.addLayer(m);
    });
    document.getElementById("conteo").textContent =
      n === 1 ? "1 evento en el mapa" : `${n} eventos en el mapa`;
  }

  function mostrarDetalle(e) {
    const f = estado.fuentes.find(x => x.id === e.fuente);
    const cuerpo = document.getElementById("detalle-cuerpo");
    const link = e.url ? `<p><a href="${e.url}" target="_blank" rel="noopener">Ver fuente original</a></p>` : "";
    cuerpo.innerHTML = `
      <p class="detalle__tema" style="--tema:${CONFIG.temas[e.tema].color}">${CONFIG.temas[e.tema].nombre} · ${e.tipo}</p>
      <h3 class="detalle__titulo">${e.titulo}</h3>
      <p class="detalle__meta">${formatoFecha(e.fecha)} · ${e.lugar}</p>
      <p>${e.descripcion}</p>
      <p><span class="badge badge--${clase(e.verificacion)}">${e.verificacion}</span>
         ${e.ejemplo ? '<span class="badge badge--ejemplo">ejemplo</span>' : ""}</p>
      <p class="nota">Fuente: ${f ? f.nombre : e.fuente}</p>
      ${link}`;
    const sec = document.getElementById("detalle");
    sec.hidden = false;
    sec.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ---------- Indicator layer (proportional circles at state centroids) ----------

  function dibujarIndicador() {
    capaIndicador.clearLayers();
    const leyenda = document.getElementById("leyenda");
    const nota = document.getElementById("indicador-nota");
    capaEstados.setStyle(estiloEstado);
    if (!estado.indicador) { leyenda.hidden = true; nota.textContent = ""; return; }

    const def = estado.indicadores.definiciones.find(d => d.id === estado.indicador);
    const vals = estado.indicadores.valores.filter(v => v.indicador === estado.indicador);
    const max = Math.max(...vals.map(v => v.valor), 1);
    const color = CONFIG.temas[def.tema].color;
    const conDatos = new Set(vals.map(v => v.cve_ent));

    capaEstados.setStyle(f => conDatos.has(f.properties.cve_ent)
      ? { ...estiloEstado(), fillColor: color, fillOpacity: 0.08 }
      : estiloEstado());

    vals.forEach(v => {
      const feat = estado.estados.features.find(f => f.properties.cve_ent === v.cve_ent);
      if (!feat) return;
      const c = L.geoJSON(feat).getBounds().getCenter();
      const r = 6 + 34 * Math.sqrt(v.valor / max);
      const m = L.circleMarker(c, { radius: r, color, weight: 1, fillColor: color, fillOpacity: 0.35, dashArray: v.ejemplo ? "3 3" : null });
      m.bindTooltip(`<strong>${feat.properties.nombre}</strong><br>${v.valor.toLocaleString("es-MX")} ${def.unidad} (${v.periodo})${v.ejemplo ? "<br><em>dato de ejemplo</em>" : ""}`);
      capaIndicador.addLayer(m);
    });

    nota.textContent = def.nota || "";
    leyenda.hidden = false;
    leyenda.innerHTML = `<span class="leyenda__circulo" style="--tema:${color}"></span> Tamaño proporcional a ${def.unidad}. Máximo: ${max.toLocaleString("es-MX")}. Fuente: ${nombreFuente(def.fuente)}.`;
  }

  // ---------- State polygons ----------

  function estiloEstado() {
    return { color: "#8a93a1", weight: 0.8, fillColor: "#ffffff", fillOpacity: 0.02 };
  }

  function alEstado(feature, layer) {
    layer.bindTooltip(feature.properties.nombre, { sticky: true, className: "tooltip-estado" });
    layer.on("click", () => mostrarEstado(feature.properties));
  }

  function mostrarEstado(p) {
    const vals = estado.indicadores.valores.filter(v => v.cve_ent === p.cve_ent);
    const filas = vals.map(v => {
      const d = estado.indicadores.definiciones.find(x => x.id === v.indicador);
      return `<li>${d.nombre}: <strong>${v.valor.toLocaleString("es-MX")}</strong> ${d.unidad} (${v.periodo})${v.ejemplo ? " <span class='badge badge--ejemplo'>ejemplo</span>" : ""}</li>`;
    }).join("");
    const nEv = estado.eventos.filter(eventoVisible).filter(e => e.lugar.includes(p.nombre)).length;
    document.getElementById("detalle-cuerpo").innerHTML = `
      <h3 class="detalle__titulo">${p.nombre}</h3>
      <p class="detalle__meta">Clave INEGI ${p.cve_ent} · ${nEv} eventos visibles</p>
      ${filas ? `<ul class="lista">${filas}</ul>` : "<p class='nota'>Sin indicadores cargados para esta entidad.</p>"}`;
    document.getElementById("detalle").hidden = false;
  }

  // ---------- helpers ----------

  function clase(v) {
    return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
  }
  function nombreFuente(id) {
    const f = estado.fuentes.find(x => x.id === id);
    return f ? f.nombre : id;
  }
  function formatoFecha(iso) {
    const d = new Date(iso + "T00:00:00");
    return isNaN(d) ? iso : d.toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
  }
})();
