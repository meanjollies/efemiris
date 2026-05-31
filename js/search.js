// satellite search modal — queries CelesTrak SATCAT with ACTIVE=1.

var satcatLoaded = true;
function loadSatcat() { return Promise.resolve(); }

var searchTimeout = null;

function openSearch() {
  document.getElementById('modal-backdrop').classList.add('open');
  document.getElementById('search-modal').classList.add('open');
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').innerHTML =
    '<div id="search-status">Start typing to search active satellites</div>';
  setTimeout(function() { document.getElementById('search-input').focus(); }, 50);
}

function closeSearch() {
  document.getElementById('modal-backdrop').classList.remove('open');
  document.getElementById('search-modal').classList.remove('open');
}

function runSearch(query) {
  query = query.trim();
  if (!query) return;
  var resultsEl = document.getElementById('search-results');
  resultsEl.innerHTML = '<div id="search-status">Searching\u2026</div>';

  var isNumeric  = /^\d+$/.test(query);
  var satcatUrl  = isNumeric
    ? 'https://celestrak.org/satcat/records.php?CATNR=' + encodeURIComponent(query) + '&ACTIVE=1&FORMAT=json'
    : 'https://celestrak.org/satcat/records.php?NAME='  + encodeURIComponent(query) + '&ACTIVE=1&FORMAT=json';

  fetch(satcatUrl)
    .then(function(r) { return r.text(); })
    .then(function(text) {
      var data;
      try { data = JSON.parse(text); } catch(e) { data = []; }
      if (!Array.isArray(data) || data.length === 0) {
        resultsEl.innerHTML = '<div id="search-status">No active satellites found for \u201c' + escHtml(query) + '\u201d.</div>';
        return;
      }
      var candidates = data
        .map(function(obj) {
          return {
            name:    (obj.OBJECT_NAME || obj.SATNAME || '').trim(),
            noradId: parseInt(obj.NORAD_CAT_ID || obj.CATNR, 10)
          };
        })
        .filter(function(o) { return o.name && !isNaN(o.noradId); })
        .slice(0, 8);
      renderSearchResults(candidates, query);
    })
    .catch(function() {
      resultsEl.innerHTML = '<div id="search-status">Search failed \u2014 check your connection and try again.</div>';
    });
}

function renderSearchResults(results, query) {
  var container = document.getElementById('search-results');
  var html = '';
  results.forEach(function(r) {
    var satId       = 'norad_' + r.noradId;
    var alreadyAdded = activeSatIds.has(satId);
    html +=
      '<div class="result-row">' +
        '<div class="result-info">' +
          '<div class="result-name">' + escHtml(r.name) + '</div>' +
          '<div class="result-meta">NORAD ' + r.noradId + '</div>' +
        '</div>' +
        '<button class="result-add-btn" data-norad="' + r.noradId + '" data-name="' + escHtml(r.name) + '"' +
          (alreadyAdded ? ' disabled' : '') + '>' +
          (alreadyAdded ? 'Tracking' : 'Track') +
        '</button>' +
      '</div>';
  });
  container.innerHTML = html;

  container.querySelectorAll('.result-add-btn:not([disabled])').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var noradId = parseInt(this.dataset.norad, 10);
      var name    = this.dataset.name;
      this.disabled    = true;
      this.textContent = 'Tracking';
      addSatFromNorad(noradId, name);
      closeSearch();
    });
  });
}

function addSatFromNorad(noradId, name) {
  var satId = 'norad_' + noradId;
  if (activeSatIds.has(satId)) return;
  addSatellite({ id: satId, name: name, noradId: noradId, color: nextColor() });
}

// event wiring
document.getElementById('add-sat-btn').addEventListener('click', openSearch);
document.getElementById('search-close').addEventListener('click', closeSearch);
document.getElementById('modal-backdrop').addEventListener('click', closeSearch);

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeSearch();
});

document.getElementById('search-input').addEventListener('input', function() {
  clearTimeout(searchTimeout);
  var q = this.value.trim();
  if (!q) {
    document.getElementById('search-results').innerHTML =
      '<div id="search-status">Start typing to search active satellites</div>';
    return;
  }
  searchTimeout = setTimeout(function() { runSearch(q); }, 220);
});

document.getElementById('search-input').addEventListener('keydown', function(e) {
  if (e.key !== 'Enter') return;
  var q = this.value.trim();
  if (/^\d{4,6}$/.test(q)) {
    addSatFromNorad(parseInt(q, 10), 'NORAD ' + q);
    closeSearch();
  }
});
