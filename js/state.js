var SATELLITES    = [];          // { id, name, noradId, color }
var tleData       = {};          // { [satId]: { name, tle1, tle2 } }
var activeSatIds  = new Set();   // satellites in the list
var visibleSatIds = new Set();   // satellites visible on map

var observerLat   = null;
var observerLon   = null;

var passResults   = [];          // computed pass objects
var passArcs      = [];          // leaflet polyline layers for the active pass arc

var satMarkers    = {};          // { [satId]: leaflet marker }
var groundTracks  = {};          // { [satId]: leaflet polyline[] }
var observerMarker = null;

function setStatus(type, msg) {
  document.getElementById('status-dot').className =
    'dot' + (type === 'loading' ? ' loading' : type === 'error' ? ' error' : '');
  document.getElementById('status-text').textContent = msg;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// color palette for auto-assigning to user-added satellites
var COLOR_POOL = [
  '#06b6d4','#a855f7','#f43f5e','#f59e0b',
  '#10b981','#3b82f6','#84cc16','#ff4d4d',
  '#d946ef','#2dd4bf','#38bdf8','#a7f3d0'
];
var _colorIndex = 0;
function nextColor() { return COLOR_POOL[_colorIndex++ % COLOR_POOL.length]; }
