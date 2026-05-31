// leaflet map setup, ground track rendering, and observer marker.

var map = L.map('map', { zoomControl: true, attributionControl: true }).setView([20, 0], 2);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  subdomains: 'abcd',
  maxZoom: 18
}).addTo(map);

function satIcon(color) {
  return L.divIcon({
    html: '<div style="width:11px;height:11px;border-radius:50%;background:' + color + ';border:2px solid #fff;box-shadow:0 0 6px ' + color + '99"></div>',
    iconSize: [15, 15], iconAnchor: [7, 7], className: ''
  });
}

// position propagation
function getSatPosition(satId, date) {
  var d = tleData[satId];
  if (!d) return null;
  try {
    var satrec = satellite.twoline2satrec(d.tle1, d.tle2);
    var pv     = satellite.propagate(satrec, date);
    if (!pv.position) return null;
    var gmst   = satellite.gstime(date);
    var geo    = satellite.eciToGeodetic(pv.position, gmst);
    return {
      lat: satellite.degreesLat(geo.latitude),
      lon: satellite.degreesLong(geo.longitude),
      alt: geo.height
    };
  } catch(e) { return null; }
}

// ground tracks
function removeGroundTrack(id) {
  if (groundTracks[id]) {
    groundTracks[id].forEach(function(l) { map.removeLayer(l); });
    delete groundTracks[id];
  }
}

function renderTracks() {
  // remove tracks for satellites no longer visible
  Object.keys(groundTracks).forEach(function(id) {
    if (!visibleSatIds.has(id)) removeGroundTrack(id);
  });
  Object.keys(satMarkers).forEach(function(id) {
    if (!visibleSatIds.has(id)) { map.removeLayer(satMarkers[id]); delete satMarkers[id]; }
  });

  var now = new Date();

  SATELLITES.forEach(function(s) {
    if (!visibleSatIds.has(s.id) || !tleData[s.id]) return;

    // build segments, splitting at antimeridian crossings
    var segments = [], seg = [], prevLon = null;
    for (var m = -50; m <= 50; m += 0.5) {
      var pos = getSatPosition(s.id, new Date(now.getTime() + m * 60000));
      if (!pos || isNaN(pos.lat) || isNaN(pos.lon)) continue;
      if (prevLon !== null && Math.abs(pos.lon - prevLon) > 180) {
        if (seg.length > 1) segments.push(seg.slice());
        seg = [];
      }
      seg.push([pos.lat, pos.lon]);
      prevLon = pos.lon;
    }
    if (seg.length > 1) segments.push(seg);

    removeGroundTrack(s.id);
    groundTracks[s.id] = segments.map(function(pts) {
      return L.polyline(pts, { color: s.color, weight: 1.5, opacity: 0.55 }).addTo(map);
    });

    // current-position marker
    var cur = getSatPosition(s.id, now);
    if (cur) {
      if (satMarkers[s.id]) map.removeLayer(satMarkers[s.id]);
      var mk = L.marker([cur.lat, cur.lon], { icon: satIcon(s.color) }).addTo(map);
      mk.bindTooltip('<b>' + s.name + '</b><br>Alt: ' + Math.round(cur.alt) + ' km');
      satMarkers[s.id] = mk;
    }
  });
}

// observer marker
function setObserver(lat, lon) {
  observerLat = lat;
  observerLon = lon;
  document.getElementById('loc-input').value = lat.toFixed(4) + ', ' + lon.toFixed(4);
  document.getElementById('map-overlay').textContent = '\uD83D\uDCCD ' + lat.toFixed(3) + '\u00b0, ' + lon.toFixed(3) + '\u00b0';

  if (observerMarker) map.removeLayer(observerMarker);
  observerMarker = L.circleMarker([lat, lon], {
    radius: 7, color: '#fff', fillColor: '#E24B4A', fillOpacity: 1, weight: 2
  }).addTo(map).bindTooltip('Your location');

  setStatus('loading', 'Computing passes\u2026');
  setTimeout(function() {
    computePasses();
    setStatus('ok', 'Passes updated \u00b7 ' + new Date().toLocaleTimeString());
  }, 20);
}

// click map to place observer
map.on('click', function(e) { setObserver(e.latlng.lat, e.latlng.lng); });
