// pass prediction, rendering, sharing, and deep-link restore.

// prediction
function computePasses() {
  if (observerLat === null) return;
  clearPassArcs();

  var now    = new Date();
  var obsRad = {
    latitude:  satellite.degreesToRadians(observerLat),
    longitude: satellite.degreesToRadians(observerLon),
    height: 0
  };
  var results = [];

  SATELLITES.forEach(function(s) {
    if (!visibleSatIds.has(s.id) || !tleData[s.id]) return;
    var satrec  = satellite.twoline2satrec(tleData[s.id].tle1, tleData[s.id].tle2);
    var inPass  = false, passStart = null, maxEl = 0, passPoints = [];

    for (var sec = 0; sec <= 86400; sec += 15) {
      var t  = new Date(now.getTime() + sec * 1000);
      var pv = satellite.propagate(satrec, t);
      if (!pv.position) continue;

      var gmst = satellite.gstime(t);
      var ecf  = satellite.eciToEcf(pv.position, gmst);
      var geo  = satellite.eciToGeodetic(pv.position, gmst);
      var look = satellite.ecfToLookAngles(obsRad, ecf);
      var elDeg = satellite.radiansToDegrees(look.elevation);

      if (elDeg > 5) {
        if (!inPass) { inPass = true; passStart = new Date(t); maxEl = 0; passPoints = []; }
        if (elDeg > maxEl) maxEl = elDeg;
        passPoints.push([satellite.degreesLat(geo.latitude), satellite.degreesLong(geo.longitude)]);
      } else if (inPass) {
        inPass = false;
        results.push({
          sat:    s,
          start:  passStart,
          dur:    Math.round((t - passStart) / 60000),
          maxEl:  Math.round(maxEl),
          points: passPoints.slice()
        });
      }
    }
  });

  results.sort(function(a, b) { return a.start - b.start; });
  passResults = results.slice(0, 30);
  renderPassList();
}

// render pass list
function renderPassList() {
  var list = document.getElementById('passes-list');
  if (!passResults.length) {
    list.innerHTML = '<div class="empty-state"><i class="ti ti-satellite-off" aria-hidden="true"></i>No passes found in the next 24h</div>';
    return;
  }
  list.innerHTML = '';
  passResults.forEach(function(p, i) {
    var div      = document.createElement('div');
    div.className = 'pass-item';

    var timeStr = p.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    var dateStr = p.start.toLocaleDateString([], { month: 'short', day: 'numeric' });
    var isHigh  = p.maxEl >= 60;

    div.innerHTML =
      '<div class="pass-sat" style="color:' + p.sat.color + '">' + escHtml(p.sat.name) + '</div>' +
      '<div class="pass-time">' + dateStr + ' \u00b7 ' + timeStr + '</div>' +
      '<div class="pass-meta">' +
        '<span class="pass-badge badge-dur">'  + p.dur   + 'm</span>' +
        '<span class="pass-badge badge-el">'   + p.maxEl + '\u00b0 max</span>' +
        (isHigh ? '<span class="pass-badge badge-high">high pass</span>' : '') +
        '<button class="share-btn" title="Copy link to this pass" data-idx="' + i + '">' +
          '<i class="ti ti-link" aria-hidden="true"></i>' +
        '</button>' +
      '</div>';

    div.querySelector('.share-btn').addEventListener('click', function(e) {
      e.stopPropagation();
      copyPassLink(i);
    });

    (function(idx, el, pass) {
      div.addEventListener('click', function() { highlightPass(idx, el, pass); });
    })(i, div, p);

    list.appendChild(div);
  });
}

// render pass arc
function clearPassArcs() {
  passArcs.forEach(function(l) { map.removeLayer(l); });
  passArcs = [];
}

function highlightPass(i, el, p) {
  document.querySelectorAll('.pass-item').forEach(function(x) { x.classList.remove('active'); });
  el.classList.add('active');
  clearPassArcs();

  if (p.points.length > 1) {
    var arc = L.polyline(p.points, { color: p.sat.color, weight: 3, opacity: 0.9, dashArray: '7 5' }).addTo(map);
    passArcs.push(arc);
    map.fitBounds(arc.getBounds(), { padding: [60, 60] });
  }

  // keep URL in sync so the back button / bookmarking always reflects what's visible
  updateUrl(i);
}

// make pass shareable via url link
function buildPassUrl(passIndex) {
  var base   = window.location.origin + window.location.pathname;
  var params = new URLSearchParams();
  params.set('lat',  observerLat.toFixed(5));
  params.set('lon',  observerLon.toFixed(5));
  params.set('sats', SATELLITES.map(function(s) { return s.noradId; }).join(','));
  params.set('pass', String(passIndex));
  return base + '?' + params.toString();
}

function updateUrl(passIndex) {
  if (observerLat === null) return;
  var url = buildPassUrl(passIndex);
  window.history.replaceState({}, '', url);
}

function copyPassLink(passIndex) {
  var url = buildPassUrl(passIndex);
  navigator.clipboard.writeText(url).then(function() {
    showToast('Link copied!');
  }).catch(function() {
    // fallback for browsers without clipboard API
    var ta = document.createElement('textarea');
    ta.value = url;
    ta.style.position = 'fixed';
    ta.style.opacity  = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Link copied!');
  });
}

function showToast(msg) {
  var toast = document.getElementById('share-toast');
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(function() { toast.classList.remove('visible'); }, 2200);
}

// if the url has ?lat=&lon=&sats=&pass= params, restore that state.
function restoreFromUrl() {
  var params = new URLSearchParams(window.location.search);
  var lat    = parseFloat(params.get('lat'));
  var lon    = parseFloat(params.get('lon'));
  var satsParam = params.get('sats');
  var passIdx   = parseInt(params.get('pass'), 10);

  if (isNaN(lat) || isNaN(lon) || !satsParam) return;

  var noradIds = satsParam.split(',').map(function(x) { return parseInt(x.trim(), 10); }).filter(function(n) { return !isNaN(n); });
  if (!noradIds.length) return;

  setStatus('loading', 'Restoring shared view\u2026');

  // add each satellite from the URL, fetch tles, then compute passes and highlight
  var addPromises = noradIds.map(function(noradId) {
    var satId = 'norad_' + noradId;
    if (activeSatIds.has(satId)) return Promise.resolve();
    // we don't have a name yet — fetch tle first to get it
    return fetchTLE(noradId).then(function(tle) {
      if (!tle) return;
      var sat = { id: satId, name: tle.name.trim(), noradId: noradId, color: nextColor() };
      SATELLITES.push(sat);
      activeSatIds.add(satId);
      visibleSatIds.add(satId);
      tleData[satId] = tle;
    });
  });

  Promise.all(addPromises).then(function() {
    buildChips();
    renderTracks();
    setObserver(lat, lon);

    // after passes compute, highlight the requested pass
    setTimeout(function() {
      if (!isNaN(passIdx) && passIdx >= 0 && passIdx < passResults.length) {
        var items = document.querySelectorAll('.pass-item');
        if (items[passIdx]) {
          highlightPass(passIdx, items[passIdx], passResults[passIdx]);
          items[passIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }, 200);
  });
}
