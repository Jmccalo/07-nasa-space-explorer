// ===============================
// NASA Space Explorer - Local JSON version
// ===============================

// Grab date inputs provided in index.html
const startInput = document.getElementById('startDate');
const endInput   = document.getElementById('endDate');
setupDateInputs(startInput, endInput); // still sets defaults & min/max

// UI elements
const getBtn     = document.getElementById('getImagesBtn');
const gallery    = document.getElementById('gallery');
const statusEl   = document.getElementById('status');
const factEl     = document.getElementById('spaceFact');

// Modal elements
const modal        = document.getElementById('modal');
const modalMedia   = document.getElementById('modalMedia');
const modalTitle   = document.getElementById('modalTitle');
const modalDate    = document.getElementById('modalDate');
const modalExplain = document.getElementById('modalExplain');

// Config
const MIN_DATE  = '1995-06-16';
const TODAY_STR = new Date().toISOString().slice(0, 10);

// fun facts
const SPACE_FACTS = [
  "Jupiter's Great Red Spot is a storm larger than Earth.",
  "A day on Venus is longer than its year.",
  "Neutron stars can spin at ~600 times per second.",
  "Saturn would float in water due to its low density.",
  "The Sun holds ~99.86% of the Solar System’s mass.",
  "Some exoplanets may rain glass or metal.",
  "There are billions of galaxies in the observable universe.",
  "Some comets grow ion tails millions of kilometers long.",
];

// show random fact
(function showRandomFact() {
  if (!factEl) return;
  const pick = SPACE_FACTS[Math.floor(Math.random() * SPACE_FACTS.length)];
  factEl.textContent = `Did you know? ${pick}`;
})();

// ----------------------
// Helpers
// ----------------------
function setStatus(msg, isError = false) {
  statusEl.textContent = msg || '';
  statusEl.style.color = isError ? '#b00020' : 'inherit';
}
function clearStatus() { setStatus(''); }

// make sure we always use YYYY-MM-DD
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getISOFromInput(inputEl) {
  if (inputEl.valueAsDate instanceof Date && !isNaN(inputEl.valueAsDate)) {
    return toISODate(inputEl.valueAsDate);
  }
  const d = new Date(inputEl.value);
  if (!isNaN(d)) return toISODate(d);
  return '';
}

// validation
function validateDates(startISO, endISO) {
  if (!startISO || !endISO) return "Please select both a start and end date.";

  const min   = new Date(MIN_DATE);
  const today = new Date(TODAY_STR);
  const start = new Date(startISO);
  const end   = new Date(endISO);

  if (start < min || end < min) return `Dates must be on or after ${MIN_DATE}.`;
  if (start > today || end > today) return "Dates cannot be in the future.";
  if (start > end) return "Start date must be on or before the end date.";
  return null;
}

// turns a string into safe HTML text
function escapeHTML(s = '') {
  return s.replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

// if it's a YouTube link, get the video id
function extractYouTubeId(link) {
  try {
    const u = new URL(link);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
  } catch (_) {}
  return null;
}

// ----------------------
// Data fetching + filtering
// ----------------------

// load the local data file
async function loadLocalApodData() {
  const res = await fetch('data/apod.json'); // <-- this is the file you created
  if (!res.ok) {
    throw new Error('Could not load local APOD data file.');
  }
  return res.json(); // should be an array
}

// filter by inclusive date range
function filterByRange(items, startISO, endISO) {
  const start = new Date(startISO);
  const end   = new Date(endISO);
  return items.filter(item => {
    const d = new Date(item.date);
    return d >= start && d <= end;
  });
}

// ----------------------
// Card + Modal builder
// ----------------------
function makeCard(item) {
  const { title, date, media_type, url, hdurl, thumbnail_url } = item;

  const card = document.createElement('article');
  card.className = 'gallery-item';
  card.tabIndex = 0;

  const thumbWrap = document.createElement('div');
  thumbWrap.className = 'thumb-wrap';

  const isVideo = media_type === 'video';

  // choose what to show as the thumbnail in the card
  let imgSrc = null;
  if (!isVideo) {
    imgSrc = hdurl || url;
  } else {
    // for videos, try API thumbnail_url first, then try to get YT thumbnail
    imgSrc = thumbnail_url || null;
    if (!imgSrc && url) {
      const ytId = extractYouTubeId(url);
      if (ytId) imgSrc = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    }
  }

  const img = document.createElement('img');
  img.className = 'zoom';
  img.alt = title || 'Astronomy Picture';
  img.loading = 'lazy';
  if (imgSrc) img.src = imgSrc;
  thumbWrap.appendChild(img);

  card.appendChild(thumbWrap);

  const meta = document.createElement('p');
  meta.innerHTML = `<strong>${escapeHTML(title || 'Untitled')}</strong><br>${date || ''}`;
  card.appendChild(meta);

  // click / keyboard to open modal
  card.addEventListener('click', () => openModal(item));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openModal(item);
    }
  });

  return card;
}

function openModal(item) {
  const { title, date, explanation, media_type, url, hdurl } = item;

  modalTitle.textContent   = title || 'Untitled';
  modalDate.textContent    = date || '';
  modalExplain.textContent = explanation || '';
  if (item.copyright) {
  const creditLine = document.createElement('p');
  creditLine.style.fontSize = '13px';
  creditLine.style.color = '#666';
  creditLine.style.marginTop = '12px';
  creditLine.textContent = `Image Credit: ${item.copyright}`;
  modalExplain.insertAdjacentElement('afterend', creditLine);
}


  modalMedia.innerHTML = '';

  if (media_type === 'image') {
    const big = document.createElement('img');
    big.src = hdurl || url;
    big.alt = title || 'Astronomy Picture';
    big.loading = 'eager';
    big.style.maxHeight = '70vh';
    big.style.width = '100%';
    big.style.objectFit = 'contain';
    modalMedia.appendChild(big);
  } else if (media_type === 'video' && url) {
    const ytId = extractYouTubeId(url);
    if (ytId) {
      const iframe = document.createElement('iframe');
      iframe.width = '100%';
      iframe.height = '480';
      iframe.src = `https://www.youtube.com/embed/${ytId}`;
      iframe.title = title || 'APOD Video';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      modalMedia.appendChild(iframe);
    } else {
      // fallback: link out instead of embed
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = 'Watch video';
      modalMedia.appendChild(a);
    }
  } else {
    modalMedia.textContent = 'Media unavailable.';
  }

  modal.setAttribute('aria-hidden', 'false');
  document.addEventListener('keydown', escToClose);
}

function closeModal() {
  modal.setAttribute('aria-hidden', 'true');
  modalMedia.innerHTML = '';
  document.removeEventListener('keydown', escToClose);
}
function escToClose(e) {
  if (e.key === 'Escape') closeModal();
}
// backdrop or X button have data-close="true"
modal.addEventListener('click', (e) => {
  if (e.target.dataset.close === 'true') closeModal();
});

// ----------------------
// Render into the page
// ----------------------
function renderGallery(items) {
  gallery.innerHTML = '';

  if (!items || items.length === 0) {
    gallery.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">🛰️</div>
        <p>No results for that range. Try different dates.</p>
      </div>`;
    return;
  }

  // newest first
  items.sort((a, b) => (a.date < b.date ? 1 : -1));

  const frag = document.createDocumentFragment();
  items.forEach(item => frag.appendChild(makeCard(item)));
  gallery.appendChild(frag);
}

// ----------------------
// Main button event
// ----------------------
getBtn.addEventListener('click', async () => {
  const startISO = getISOFromInput(startInput);
  const endISO   = getISOFromInput(endInput);

  const err = validateDates(startISO, endISO);
  if (err) { setStatus(err, true); return; }

  setStatus('🔄 Loading space photos…');

  try {
    // 1. load all data from local json
    const allItems = await loadLocalApodData();

    // 2. filter items by chosen range
    const filtered = filterByRange(allItems, startISO, endISO);

    // 3. render
    renderGallery(filtered);

    clearStatus();
  } catch (e) {
    console.error(e);
    setStatus('Could not load local APOD data.', true);
  }
});

// done 🚀
