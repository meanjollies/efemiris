// single source of truth for all mutable app state.

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
  '#185FA5','#854F0B','#3B6D11','#993556',
  '#534AB7','#1D9E75','#BA7517','#0F6E56',
  '#3C3489','#712B13','#0C447C','#27500A'
];
var _colorIndex = 0;
function nextColor() { return COLOR_POOL[_colorIndex++ % COLOR_POOL.length]; }
