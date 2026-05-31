// satellite add/remove, chip rendering, and visibility toggling.

function buildChips() {
  var wrap = document.getElementById('sat-chips');
  wrap.innerHTML = '';
  SATELLITES.forEach(function(s) {
    var visible  = visibleSatIds.has(s.id);
    var chip     = document.createElement('span');
    chip.className = 'sat-chip' + (visible ? '' : ' sat-chip-hidden');
    chip.title   = visible ? 'Click to hide' : 'Click to show';
    if (visible) {
      chip.style.background   = s.color + '20';
      chip.style.borderColor  = s.color;
      chip.style.color        = s.color;
    }
    chip.innerHTML =
      escHtml(s.name) +
      '<button class="remove-btn" title="Remove ' + escHtml(s.name) + '" data-id="' + s.id + '">' +
        '<i class="ti ti-x" aria-hidden="true"></i>' +
      '</button>';

    chip.addEventListener('click', function(e) {
      if (e.target.closest('.remove-btn')) return;
      toggleVisibility(s.id);
    });
    chip.querySelector('.remove-btn').addEventListener('click', function(e) {
      e.stopPropagation();
      removeSatellite(s.id);
    });
    wrap.appendChild(chip);
  });
}

function toggleVisibility(id) {
  if (visibleSatIds.has(id)) {
    visibleSatIds.delete(id);
    removeGroundTrack(id);
    if (satMarkers[id]) { map.removeLayer(satMarkers[id]); delete satMarkers[id]; }
  } else {
    visibleSatIds.add(id);
    renderTracks();
  }
  buildChips();
  if (observerLat !== null) computePasses();
}

function addSatellite(sat) {
  if (activeSatIds.has(sat.id)) return;
  SATELLITES.push(sat);
  activeSatIds.add(sat.id);
  visibleSatIds.add(sat.id);
  buildChips();
  fetchAndTrack(sat);
}

function removeSatellite(id) {
  activeSatIds.delete(id);
  visibleSatIds.delete(id);
  SATELLITES = SATELLITES.filter(function(s) { return s.id !== id; });
  removeGroundTrack(id);
  if (satMarkers[id]) { map.removeLayer(satMarkers[id]); delete satMarkers[id]; }
  delete tleData[id];
  buildChips();
  if (observerLat !== null) computePasses();
}
