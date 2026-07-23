import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getStorage, ref, listAll, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBySfPYg6bqinjrK6vJURO4EYGZsBLLrUU",
  authDomain: "cyshells-6540a.firebaseapp.com",
  projectId: "cyshells-6540a",
  storageBucket: "cyshells-6540a.firebasestorage.app",
  messagingSenderId: "933233470258",
  appId: "1:933233470258:web:ad33d509ab9599a09f052b",
  measurementId: "G-MBT02DLP1W"
};

const app = initializeApp(firebaseConfig);

const omegaRegisters = new Map();

let allData = [];
let charts = {};
let targetData = [];
let currentFileName = 'sin cargar';
const IGNORED_HASHTAG_BASE = new Set([
  'fyp', 'foryou', 'foryoupage', 'fy', 'viral', 'trending', 'parati', 'para_ti'
]);

async function fetchDataFromServer() {
  try {
    showToast('Conectando con el servidor...');
    const response = await fetch('https://hhznmquwyqbtanmenuaef4khjq0iydbt.lambda-url.us-east-2.on.aws/');
    if (!response.ok) throw new Error('Error en la respuesta del servidor');
    const data = await response.json();
    
    allData = normalizeData(data);
    targetData = allData.filter(d => d.riesgo === 'PELIGROSO');
    setLoadedFileName('Base de Datos SQL');
    renderAll();
    showToast('Datos cargados desde SQL con éxito');
  } catch (error) {
    console.error('Error al cargar datos:', error);
    showToast('Error al conectar con SQL. ¿Está el servidor corriendo?');
  }
}

const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#555d6b', font: { family: 'IBM Plex Mono', size: 10 } } },
    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#555d6b', font: { family: 'IBM Plex Mono', size: 10 } } }
  }
};

const RANGE_OPTS = {
  ...CHART_OPTS,
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: false,
      external: renderRangeTooltip
    }
  }
};

const HORIZ_OPTS = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: ctx => `Cuentas: ${ctx.raw}`,
        afterBody: items => {
          const item = items && items.length ? items[0] : null;
          const label = item?.label;
          const membersByLabel = item?.dataset?.membersByLabel || {};
          const members = label ? (membersByLabel[label] || []) : [];
          if (!members.length) return [];
          return ['---', ...members.map(name => `• ${name}`)];
        }
      }
    }
  },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#555d6b', font: { family: 'IBM Plex Mono', size: 10 } } },
    y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b92a0', font: { family: 'IBM Plex Mono', size: 11 } } }
  }
};

// --- 1. SPA NAVIGATION LOGIC ---
function switchTab(tabId, title) {
  // Ocultar todas las secciones
  document.querySelectorAll('.page-section').forEach(section => {
    section.classList.remove('active');
  });
  
  // Quitar activo de todos los items del menú
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });

  // Mostrar la sección seleccionada
  document.getElementById(`section-${tabId}`).classList.add('active');
  
  // Marcar item del menú (buscando por el onclick text)
  event.currentTarget.classList.add('active');

  // Actualizar Título
  document.getElementById('header-title').innerText = title;
}

let omegaData = [];

let previousSelectedRow = null;

async function populateOmegaTable() {

  const storage = getStorage(app);
  const parentDir = ref(storage, 'OmegaAnalysis/');
  const root = await listAll(parentDir);

  await Promise.all(
    root.prefixes.map(async (folderRef) => {
      console.log(`Checking directory: ${folderRef.fullPath}`);
      const subfolderResult = await listAll(folderRef);

      const regex = /([0-9]{19})_(alto|medio|nulo)\.jpg/;

      const filePromises = subfolderResult.items.map(async (itemRef) => {

        const match = itemRef.name.match(regex);
        if (!match) return;

        const videoID = match[1];
        const risk = match[2];
        const username = itemRef.fullPath.split("/")[1];

        let fileURL = null;
        const fileRef = ref(storage, itemRef.fullPath);

        try {
          fileURL = await getDownloadURL(fileRef);
        } catch (error) {
          console.error("Error getting download URL:", error);
        }

        omegaData.push({
          id: videoID,
          user: "@" + username,
          nivel: risk.toUpperCase(),
          amenazas: [],
          imgUrl: fileURL
        });

        console.log(`videoID: ${videoID}. Risk: ${risk}. Username: ${username}`);
      });

      await Promise.all(filePromises);
    })
  );

  const tbody = document.getElementById('omega-tbody');
  tbody.innerHTML = '';

  omegaData.forEach((data, index) => {

    let badgeClass;
    switch (data.nivel) {
      case 'ALTO':
        badgeClass = 'badge-risk high';
        break;
      case 'MEDIO':
        badgeClass = 'badge-risk medium';
        break;
      default:
        badgeClass = 'badge-risk null';
        break;
    }

    const tr = document.createElement('tr');
    tr.id = `row-${data.id}`;
    tr.style.cursor = 'default';

    tr.innerHTML = `
      <td style="font-family: 'IBM Plex Mono'; font-size: 0.85rem;">
        <span style="cursor: pointer;" onclick="window.open('https://www.tiktok.com/${data.user}/video/${data.id}')">
          ${data.id}
          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
            <path d="M0 0h24v24H0z" fill="none" />
            <path fill="currentColor" d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6v2H5v12h12v-6zM13 3v2h4.586l-7.793 7.793l1.414 1.414L19 6.414V11h2V3z" />
          </svg>
        </span>
      </td>
      <td>
        <span style="cursor: pointer;" onclick="window.open('https://www.tiktok.com/${data.user}')">
          ${data.user}
          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
            <path d="M0 0h24v24H0z" fill="none" />
            <path fill="currentColor" d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6v2H5v12h12v-6zM13 3v2h4.586l-7.793 7.793l1.414 1.414L19 6.414V11h2V3z" />
          </svg>
        </span>
      </td>
      <td><span class="${badgeClass}">${data.nivel}</span></td>
      <td>
        <button style="background:none; border:1px solid var(--border-strong); color:var(--text-main); padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;"
                onclick="showOmegaPreview(${index})">
          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
            <path d="M0 0h24v24H0z" fill="none" />
            <path fill="currentColor" d="M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6" />
            <path fill="currentColor" d="M12 19c7.63 0 9.93-6.62 9.95-6.68c.07-.21.07-.43 0-.63c-.02-.07-2.32-6.68-9.95-6.68s-9.93 6.61-9.95 6.67c-.07.21-.07.43 0 .63c.02.07 2.32 6.68 9.95 6.68Zm0-12c5.35 0 7.42 3.85 7.93 5c-.5 1.16-2.58 5-7.93 5s-7.42-3.84-7.93-5c.5-1.16 2.58-5 7.93-5" />
          </svg>
        </button>
        <button onclick="downloadFile('${data.imgUrl}', '${data.id}', '${data.user}', '${data.nivel}')" style="background:none; border:1px solid var(--border-strong); color:var(--text-main); padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
            <path d="M0 0h24v24H0z" fill="none" />
            <path fill="currentColor" d="M11.625 15.513q-.175-.063-.325-.213l-3.6-3.6q-.3-.3-.288-.7t.288-.7q.3-.3.713-.312t.712.287L11 12.15V5q0-.425.288-.712T12 4t.713.288T13 5v7.15l1.875-1.875q.3-.3.713-.288t.712.313q.275.3.288.7t-.288.7l-3.6 3.6q-.15.15-.325.213t-.375.062t-.375-.062M6 20q-.825 0-1.412-.587T4 18v-2q0-.425.288-.712T5 15t.713.288T6 16v2h12v-2q0-.425.288-.712T19 15t.713.288T20 16v2q0 .825-.587 1.413T18 20z" />
          </svg>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function downloadFile(url, videoID, username, risk) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");
    const blob = await response.blob();

    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${videoID}_${username.split('@')[1]}_${risk.toLowerCase()}.jpg`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Fetch failed:", error);
  }
}

function closeOmegaPreview() {
  document.getElementById(`row-${previousSelectedRow}`).classList.remove('selected');

  previousSelectedRow = null;

  document.getElementById('image-preview-container').style.display = 'none';

  document.getElementById('ict-title').classList.remove('hidden');
  document.getElementById('step-alpha').classList.remove('hidden');
  document.getElementById('step-beta').classList.remove('hidden');
  document.getElementById('step-omega').classList.remove('hidden');
  document.getElementById('connector-1').classList.remove('hidden');
  document.getElementById('connector-2').classList.remove('hidden');

  const currentImage = document.getElementById('image-preview');
  currentImage.src = null;
}

// Mostrar el preview de la imagen cuando se hace click en "Analizar"
function showOmegaPreview(index) {
  if (previousSelectedRow != null) {
    document.getElementById(`row-${previousSelectedRow}`).classList.remove('selected');
  }

  const data = omegaData[index];

  document.getElementById(`row-${data.id}`).classList.add('selected');
  previousSelectedRow = data.id;

  document.getElementById('ict-title').classList.add('hidden');
  document.getElementById('step-alpha').classList.add('hidden');
  document.getElementById('step-beta').classList.add('hidden');
  document.getElementById('step-omega').classList.add('hidden');
  document.getElementById('connector-1').classList.add('hidden');
  document.getElementById('connector-2').classList.add('hidden');

  const currentImage = document.getElementById('image-preview');
  currentImage.src = data.imgUrl;

  document.getElementById('image-preview-container').style.display = 'flex';
}

window.addEventListener('DOMContentLoaded', () => {
  fetchDataFromServer();
  populateOmegaTable();
});

function normalizeData(input) {
  if (!Array.isArray(input)) return [];
  
  return input.map(row => {
    if (!row) return null;

    let risk = String(row.riesgo || row.label || row.riskLabel || 'SEGURO').toUpperCase();

    if (risk.includes('PELIGROSO') || risk.includes('CRÍTICO') || risk.includes('INTERMEDIO')) {
      risk = 'PELIGROSO';
    } else {
      risk = 'SEGURO';
    }

    return {
      cuenta: String(row.cuenta || row.username || row.author || 'Anónimo'),
      followers: Number(row.followers || row.followersCount) || 0,
      publicaciones: Number(row.publicaciones) || 0,
      comentarios: Number(row.comentarios) || 0,
      hashtags: toUniqueArray(row.hashtags),
      emojis: toUniqueArray(row.emojis),
      musica: toUniqueArray(row.musica),
      riesgo: risk,
      profileUrl: row.profileUrl || row.profileurl || ''
    }
  }).filter(Boolean);
}

function renderAll() {
  updateTimestamp();
  renderCards();
  renderChartFollowers();
  renderChartPosts();
  renderChartHashtags();
  renderChartEmojis();
  renderChartMusic();
  renderChartComments();
  populateTableFilters();
  applyTableFilters();
}

function updateTimestamp() {
  const now = new Date();
  document.getElementById('last-update').textContent =
    now.toLocaleDateString('es-MX') + ' ' + now.toLocaleTimeString('es-MX', {hour:'2-digit',minute:'2-digit'});
}
function setLoadedFileName(name) {
  currentFileName = name || 'sin cargar';
  const el = document.getElementById('loaded-file-name');
  if (el) el.textContent = 'archivo: ' + currentFileName;
  const importTitle = document.getElementById('import-title-text');
  const importSub = document.getElementById('import-sub-text');
  const drop = document.getElementById('drop-zone');
  const loaded = currentFileName !== 'sin cargar';
  if (drop) drop.classList.toggle('file-loaded', loaded);
  if (importTitle) importTitle.textContent = loaded ? currentFileName : 'Importar datos';
  if (importSub) {
    importSub.textContent = loaded ? '' : 'Arrastra un archivo JSON o CSV exportado desde Apify / Octoparse';
  }
}

function renderCards() {
  const totalFollowers = targetData.reduce((a,b) => a + (b.followers||0), 0);
  const totalPosts     = allData.reduce((a,b) => a + (b.publicaciones||0), 0);
  const totalComments  = allData.reduce((a,b) => a + (b.comentarios||0), 0);
  const safeCount      = allData.filter(d => normalizeRiskLabel(d.riesgo || d.label || d.riskLabel) === 'seguro').length;
  const unsafeCount    = Math.max(allData.length - safeCount, 0);
  document.getElementById('stat-cuentas').textContent   = allData.length;
  document.getElementById('stat-followers').textContent = fmtNum(totalFollowers);
  document.getElementById('stat-posts').textContent     = fmtNum(totalPosts);
  document.getElementById('stat-comments').textContent  = fmtNum(totalComments);

  const validTags = allData.flatMap(d => (d.hashtags || []).filter(h => !shouldIgnoreHashtag(h)));
  const tagFreq = countFreq(validTags);
  const top1Tag = topN(tagFreq, 1);
  document.getElementById('stat-hashtag').textContent = top1Tag.length ? top1Tag[0][0] : '—';

  const emojiFreq = countFreq(allData.flatMap(d => d.emojis || []));
  const top1Emoji = topN(emojiFreq, 1);
  document.getElementById('stat-emoji').textContent = top1Emoji.length ? top1Emoji[0][0] : '—';
}

function makeChart(id, type, labels, data, color, opts, extraDatasetProps = {}) {
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(id), {
    type,
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: color,
        borderColor: 'transparent',
        borderRadius: 4,
        borderSkipped: false,
        ...extraDatasetProps
      }]
    },
    options: opts
  });
}

function renderChartFollowers() {
  const buckets = buildRangeBuckets(allData, 'followers', 6);
  makeRangeChart('chart-followers', buckets, '#e8413e');
}
function renderChartPosts() {
  const buckets = buildRangeBuckets(allData, 'publicaciones', 6);
  makeRangeChart('chart-posts', buckets, '#e8a83e');
}
function renderChartComments() {
  const buckets = buildRangeBuckets(allData, 'comentarios', 6);
  makeRangeChart('chart-comments', buckets, '#4a9eff');
}
function makeRangeChart(id, buckets, color) {
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(id), {
    type: 'bar',
    data: {
      labels: buckets.labels,
      datasets: [{
        data: buckets.counts,
        membersByBin: buckets.membersByBin,
        backgroundColor: color,
        borderColor: 'transparent',
        borderRadius: 4,
        borderSkipped: false
      }]
    },
    options: RANGE_OPTS
  });
}
function renderRangeTooltip(context) {
  const { chart, tooltip } = context;
  let el = document.getElementById('range-tooltip');
  if (!el) {
    el = document.createElement('div');
    el.id = 'range-tooltip';
    el.className = 'range-tooltip';
    document.body.appendChild(el);
  }
  if (!tooltip || tooltip.opacity === 0) {
    el.style.opacity = 0;
    return;
  }

  const point = tooltip.dataPoints && tooltip.dataPoints.length ? tooltip.dataPoints[0] : null;
  const idx = point ? point.dataIndex : -1;
  const dataset = point?.dataset || {};
  const members = idx >= 0 ? (dataset.membersByBin?.[idx] || []) : [];
  const label = point?.label || '';
  const count = point?.raw ?? 0;

  const namesHtml = members.length
    ? members.map(name => {
      const cls = isHighRiskAccount(name) ? 'tt-name-high' : '';
      return `<div class="${cls}">• ${escapeHtml(name)}</div>`;
    }).join('')
    : '<div>Sin cuentas en este rango</div>';

  el.innerHTML = `
    <div class="tt-title">${escapeHtml(label)}</div>
    <div class="tt-sub">Cuentas: ${count}</div>
    <div class="tt-sep">---</div>
    ${namesHtml}
  `;

  const rect = chart.canvas.getBoundingClientRect();
  el.style.opacity = 1;
  el.style.left = `${rect.left + window.pageXOffset + tooltip.caretX + 12}px`;
  el.style.top = `${rect.top + window.pageYOffset + tooltip.caretY + 12}px`;
}

function renderChartHashtags() {
  const ignoredFound = new Set();
  const { freq, membersByTag } = countAccountsByHashtag(allData, ignoredFound);
  const top  = topN(freq, 10);
  const h = Math.max(top.length * 40 + 60, 200);
  document.getElementById('wrap-hashtags').style.height = h + 'px';
  const labels = top.map(t => t[0]);
  makeChart(
    'chart-hashtags',
    'bar',
    labels,
    top.map(t => t[1]),
    '#4a9eff',
    HORIZ_OPTS,
    { membersByLabel: buildMembersByLabel(labels, membersByTag) }
  );
  updateIgnoredHashtagInfo(ignoredFound);
}
function renderChartEmojis() {
  const { freq, membersByValue } = countAccountsByValue(allData, 'emojis');
  const top  = topN(freq, 10);
  const h = Math.max(top.length * 40 + 60, 200);
  document.getElementById('wrap-emojis').style.height = h + 'px';
  const labels = top.map(t => t[0]);
  makeChart(
    'chart-emojis',
    'bar',
    labels,
    top.map(t => t[1]),
    '#a78bfa',
    HORIZ_OPTS,
    { membersByLabel: buildMembersByLabel(labels, membersByValue) }
  );
}
function renderChartMusic() {
  const { freq, membersByValue } = countAccountsByValue(allData, 'musica');
  const top  = topN(freq, 8);
  const h = Math.max(top.length * 40 + 60, 200);
  document.getElementById('wrap-music').style.height = h + 'px';
  const originalLabels = top.map(t => t[0]);
  const displayLabels = originalLabels.map(v => v.length > 30 ? v.slice(0,30) + '…' : v);
  const membersByLabel = {};
  displayLabels.forEach((display, i) => { membersByLabel[display] = membersByValue[originalLabels[i]] || []; });
  makeChart(
    'chart-music',
    'bar',
    displayLabels,
    top.map(t => t[1]),
    '#e8a83e',
    HORIZ_OPTS,
    { membersByLabel }
  );
}

/* ── TABLA ── */
function renderTable(data) {
  const tbody = document.getElementById('table-body');
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div id="empty-state"><div class="empty-title">Sin resultados</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(row => {
    const initials = (row.cuenta || '').replace('@','').slice(0,2).toUpperCase();
    const htags = (row.hashtags||[]).slice(0,4).map(h => `<span class="tag hashtag">${h}</span>`).join('');
    const emjs  = (row.emojis||[]).slice(0,4).map(e => `<span class="tag emoji">${e}</span>`).join('');
    const music = (row.musica||[]).slice(0,2).map(m => `<span class="tag music">${m.length>28?m.slice(0,28)+'…':m}</span>`).join('');
    const riskLabel = row.riesgo;
    const riskClass = riskLabel === 'PELIGROSO' ? 'risk-high' : 'risk-safe';
    const accountClass = riskLabel === 'PELIGROSO' ? 'account-name risk-high-name' : 'account-name';
    const tiktokUrl = `https://www.tiktok.com/${row.cuenta.startsWith('@') ? row.cuenta : '@' + row.cuenta}`;
    const safeUrl = escapeHtml(tiktokUrl);
    const accountNameHtml = `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="${accountClass}" style="text-decoration: none;">${row.cuenta}</a>`;
    return `<tr>
      <td><div class="td-account"><div class="account-avatar">${initials}</div>${accountNameHtml}</div></td>
      <td><div class="tags"><span class="tag risk ${riskClass}">${riskLabel}</span></div></td>
      <td class="num">${fmtNum(row.followers||0)}</td>
      <td class="num">${fmtNum(row.publicaciones||0)}</td>
      <td class="num">${fmtNum(row.comentarios||0)}</td>
      <td><div class="tags">${htags}</div></td>
      <td><div class="tags">${emjs}</div></td>
      <td><div class="tags">${music}</div></td>
    </tr>`;
  }).join('');
}

/* ── BÚSQUEDA ── */
document.getElementById('search-input').addEventListener('input', applyTableFilters);
document.getElementById('filter-riesgo').addEventListener('change', applyTableFilters);
document.getElementById('filter-hashtag').addEventListener('change', applyTableFilters);
document.getElementById('filter-musica').addEventListener('change', applyTableFilters);

/* ── EXPORT ── */
function exportJSON() {
  if (!allData.length) return showToast('No hay datos para exportar');
  const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'tiktok-monitor.json');
  showToast('JSON exportado');
}
function exportCSV() {
  if (!allData.length) return showToast('No hay datos para exportar');
  const headers = ['cuenta','followers','publicaciones','comentarios','hashtags','emojis','musica','riesgo'];
  const rows = allData.map(d => [
    d.cuenta, d.followers||0, d.publicaciones||0, d.comentarios||0,
    (d.hashtags||[]).join('|'), (d.emojis||[]).join('|'), (d.musica||[]).join('|'), normalizeRiskLabel(d.riesgo || d.label || d.riskLabel)
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  downloadBlob(new Blob([csv], {type:'text/csv'}), 'tiktok-monitor.csv');
  showToast('CSV exportado');
}
function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

/* ── HELPERS ── */
function fmtNum(n) {
  if (n >= 1e6) return (n/1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n/1e3).toFixed(1) + 'K';
  return n.toString();
}
function shortName(name) { return (name||'').replace('@','').slice(0,12); }
function buildRangeBuckets(accounts, key, bucketCount = 6) {
  const values = accounts.map(a => Number(a[key]) || 0);
  if (!values.length) {
    return { labels: ['0-0'], counts: [0], membersByBin: [[]] };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return {
      labels: [`${fmtNum(min)} - ${fmtNum(max)}`],
      counts: [accounts.length],
      membersByBin: [accounts.map(a => a.cuenta || 'sin_cuenta')]
    };
  }
  const bins = Math.max(1, bucketCount);
  const step = Math.ceil((max - min + 1) / bins);
  const labels = [];
  const counts = Array.from({ length: bins }, () => 0);
  const membersByBin = Array.from({ length: bins }, () => []);
  for (let i = 0; i < bins; i++) {
    const start = min + i * step;
    const end = i === bins - 1 ? max : (start + step - 1);
    labels.push(`${fmtNum(start)} - ${fmtNum(end)}`);
  }
  accounts.forEach(acc => {
    const v = Number(acc[key]) || 0;
    let idx = Math.floor((v - min) / step);
    if (idx < 0) idx = 0;
    if (idx >= bins) idx = bins - 1;
    counts[idx] += 1;
    membersByBin[idx].push(acc.cuenta || 'sin_cuenta');
  });
  return { labels, counts, membersByBin };
}
function countFreq(arr) {
  const map = {};
  arr.forEach(v => { if(v) map[v] = (map[v]||0)+1; });
  return map;
}
function countAccountsByHashtag(accounts, ignoredCollector) {
  const map = {};
  const membersByTag = {};
  accounts.forEach(acc => {
    const uniqueTags = new Set((acc.hashtags || []).map(h => normalizeHashtag(h)).filter(Boolean));
    uniqueTags.forEach(tag => {
      if (shouldIgnoreHashtag(tag)) {
        if (ignoredCollector) ignoredCollector.add(tag);
        return;
      }
      map[tag] = (map[tag] || 0) + 1;
      if (!membersByTag[tag]) membersByTag[tag] = [];
      membersByTag[tag].push(acc.cuenta || 'sin_cuenta');
    });
  });
  return { freq: map, membersByTag };
}
function countAccountsByValue(accounts, key) {
  const freq = {};
  const membersByValue = {};
  accounts.forEach(acc => {
    const values = new Set((acc[key] || []).map(v => String(v || '').trim()).filter(Boolean));
    values.forEach(v => {
      freq[v] = (freq[v] || 0) + 1;
      if (!membersByValue[v]) membersByValue[v] = [];
      membersByValue[v].push(acc.cuenta || 'sin_cuenta');
    });
  });
  return { freq, membersByValue };
}
function buildMembersByLabel(labels, sourceMap) {
  const map = {};
  labels.forEach(label => { map[label] = sourceMap[label] || []; });
  return map;
}
function shouldIgnoreHashtag(tag) {
  const clean = String(tag || '').replace(/^#/, '').toLowerCase().trim();
  if (!clean) return true;
  if (IGNORED_HASHTAG_BASE.has(clean)) return true;
  if (clean.includes('fyp') || clean.includes('parati') || clean.includes('viral') || clean.includes('foryoupage')) return true;
  return false;
}
function updateIgnoredHashtagInfo(ignoredSet) {
  const el = document.getElementById('ignored-hashtags-list');
  if (!el) return;
  const items = Array.from(ignoredSet || []).sort((a, b) => a.localeCompare(b));
  el.textContent = items.length ? items.join(', ') : 'ninguno';
}
function countRepeatedValuesByAccount(accounts, key) {
  const freq = {};
  accounts.forEach(acc => {
    const unique = new Set((acc[key] || []).map(v => String(v || '').trim()).filter(Boolean));
    unique.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
  });
  return freq;
}
function populateSelectWithRepeated(selectId, defaultLabel, entries) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const current = select.value;
  const opts = [`<option value="">${defaultLabel}</option>`];
  entries
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .forEach(([value, count]) => {
      const safeValue = escapeHtml(value);
      opts.push(`<option value="${safeValue}">${safeValue} (${count})</option>`);
    });
  select.innerHTML = opts.join('');
  if (current && Array.from(select.options).some(o => o.value === current)) {
    select.value = current;
  }
}
function populateTableFilters() {
  const riesgoFreq = countFreq(allData.map(d => d.riesgo));
  const hashtagFreq = countRepeatedValuesByAccount(allData, 'hashtags');
  const musicaFreq = countRepeatedValuesByAccount(allData, 'musica');

  const riesgoEntries = Object.entries(riesgoFreq).sort((a, b) => riskRank(b[0]) - riskRank(a[0]));
  const riesgoSelect = document.getElementById('filter-riesgo');
  if (riesgoSelect) {
    const current = riesgoSelect.value;
    const opts = ['<option value="">riesgo: todos</option>'];
    riesgoEntries.forEach(([label, count]) => {
      opts.push(`<option value="${label}">${label} (${count})</option>`);
    });
    riesgoSelect.innerHTML = opts.join('');
    if (current && Array.from(riesgoSelect.options).some(o => o.value === current)) {
      riesgoSelect.value = current;
    }
  }

  populateSelectWithRepeated('filter-hashtag', 'hashtag repetido: todos', Object.entries(hashtagFreq));
  populateSelectWithRepeated('filter-musica', 'música repetida: todos', Object.entries(musicaFreq));
}
function applyTableFilters() {
  const q = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
  const riesgo = document.getElementById('filter-riesgo')?.value || '';
  const hashtag = document.getElementById('filter-hashtag')?.value || '';
  const musica = document.getElementById('filter-musica')?.value || '';

  const filtered = allData.filter(row => {
    if (q && !(row.cuenta || '').toLowerCase().includes(q)) return false;
    const rowRisk = row.riesgo;
    if (riesgo && rowRisk !== riesgo) return false;
    if (hashtag && !(row.hashtags || []).includes(hashtag)) return false;
    if (musica && !(row.musica || []).includes(musica)) return false;
    return true;
  });

  renderTable(filtered);
}
function topN(freq, n) {
  return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,n);
}
function normalizeRiskLabel(value) {
  const clean = String(value || '').trim().toLowerCase();
  if (!clean) return 'seguro';
  if (clean.includes('muy') && clean.includes('peligro')) return 'muy peligroso';
  if (clean.includes('inter')) return 'intermedio';
  if (clean.includes('sospech')) return 'intermedio';
  if (clean.includes('segur')) return 'seguro';
  return 'seguro';
}
function riskRank(label) {
  if (label === 'muy peligroso') return 3;
  if (label === 'intermedio') return 2;
  return 1;
}
function highestRisk(a, b) {
  return riskRank(b) > riskRank(a) ? b : a;
}
function isHighRiskAccount(accountName) {
  const row = allData.find(d => (d.cuenta || '') === accountName);
  if (!row) return false;
  return normalizeRiskLabel(row.riesgo || row.label || row.riskLabel) === 'muy peligroso';
}
function normalizeHashtag(tag) {
  if (!tag) return '';
  const clean = String(tag).trim();
  if (!clean) return '';
  return clean.startsWith('#') ? clean.toLowerCase() : ('#' + clean.toLowerCase());
}
function toUniqueArray(val) {
  if (!Array.isArray(val)) return [];
  return Array.from(new Set(val.map(v => String(v || '').trim()).filter(Boolean)));
}
function extractHashtags(item) {
  const out = [];
  const raw = item.hashtags;
  if (Array.isArray(raw)) {
    raw.forEach(h => {
      if (typeof h === 'string') out.push(normalizeHashtag(h));
      else if (h && typeof h === 'object') out.push(normalizeHashtag(h.name || h.title || ''));
    });
  }
  const text = typeof item.text === 'string' ? item.text : '';
  const fromText = text.match(/#[^\s#]+/g) || [];
  fromText.forEach(t => out.push(normalizeHashtag(t)));
  return Array.from(new Set(out.filter(Boolean)));
}
function extractEmojis(text) {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(/\p{Extended_Pictographic}/gu) || [];
  return Array.from(new Set(matches));
}
function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

async function procesarArchivo(evento) {
    const archivo = evento.target.files[0];
    if (!archivo) return;

    const titulo = document.getElementById('import-title-text');
    const sub = document.getElementById('import-sub-text');
    
    const textoOriginalTitulo = titulo.innerText;
    const textoOriginalSub = sub.innerText;

    titulo.innerText = "Procesando...";
    sub.innerText = "Subiendo datos a la base de datos hack_shell...";

    const lector = new FileReader();
    lector.onload = async (e) => {
        try {
            const contenidoJson = JSON.parse(e.target.result);
            
            const respuesta = await fetch('http://localhost:3000/api/upload-json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contenidoJson)
            });

            if (respuesta.ok) {
                alert("¡Base de datos actualizada correctamente!");
                titulo.innerText = "¡Sincronización Exitosa!";
                sub.innerText = "Los datos del JSON ya están en tu base de datos SQL.";
            } else {
                throw new Error("Error en el servidor");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("No se pudo conectar con el servidor de base de datos.");
            titulo.innerText = "Error de conexión";
            sub.innerText = "Asegúrate de que el servidor Node.js esté encendido.";
        }
    };
    lector.readAsText(archivo);
}

window.switchTab = switchTab;
window.showOmegaPreview = showOmegaPreview;

window.exportJSON = exportJSON;
window.exportCSV = exportCSV;

window.downloadFile = downloadFile;
window.closeOmegaPreview = closeOmegaPreview;