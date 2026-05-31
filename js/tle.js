// tle fetching and validation via celestrak's gp endpoint.

function isValidTleLine(line, expectedChar) {
  return line && line.length >= 60 && line[0] === expectedChar;
}

function fetchTLE(noradId) {
  return fetch('https://celestrak.org/NORAD/elements/gp.php?CATNR=' + noradId + '&FORMAT=TLE')
    .then(function(r) { return r.text(); })
    .then(function(text) {
      var lines = text.trim().split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
      for (var i = 0; i < lines.length - 1; i++) {
        if (isValidTleLine(lines[i], '1') && isValidTleLine(lines[i + 1], '2')) {
          var name = i > 0 ? lines[i - 1] : ('NORAD ' + noradId);
          return { name: name, tle1: lines[i], tle2: lines[i + 1] };
        }
      }
      return null;
    })
    .catch(function() { return null; });
}

// fetch tles for all satellites currently in state, then render.
function fetchAllDefaults() {
  setStatus('loading', 'Fetching TLE data\u2026');
  var promises = SATELLITES.map(function(s) {
    return fetchTLE(s.noradId).then(function(tle) {
      if (tle) tleData[s.id] = tle;
    });
  });
  return Promise.all(promises).then(function() {
    var n = Object.keys(tleData).length;
    setStatus('ok', n + ' satellite' + (n !== 1 ? 's' : '') + ' loaded \u00b7 ' + new Date().toLocaleTimeString());
    renderTracks();
  });
}

// fetch tle for a single satellite and begin tracking it.
function fetchAndTrack(sat) {
  setStatus('loading', 'Fetching TLE for ' + sat.name + '\u2026');
  fetchTLE(sat.noradId).then(function(tle) {
    if (tle) {
      tleData[sat.id] = tle;
      renderTracks();
      if (observerLat !== null) {
        setStatus('loading', 'Computing passes\u2026');
        setTimeout(function() {
          computePasses();
          setStatus('ok', 'Updated \u00b7 ' + new Date().toLocaleTimeString());
        }, 20);
      } else {
        setStatus('ok', sat.name + ' loaded');
      }
    } else {
      setStatus('error', 'No TLE data for ' + sat.name + ' \u2014 it may be inactive or deorbited');
    }
  });
}
