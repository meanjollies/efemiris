// status bar, location input, and other small UI helpers.

// location input
document.getElementById('loc-btn').addEventListener('click', function() {
  if (!navigator.geolocation) { alert('Geolocation not supported by this browser.'); return; }
  setStatus('loading', 'Getting your location\u2026');
  navigator.geolocation.getCurrentPosition(
    function(pos) { setObserver(pos.coords.latitude, pos.coords.longitude); },
    function()    { setStatus('ok', 'Geolocation permission denied'); }
  );
});

document.getElementById('loc-input').addEventListener('keydown', function(e) {
  if (e.key !== 'Enter') return;
  var parts = e.target.value.split(',').map(function(x) { return parseFloat(x.trim()); });
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) setObserver(parts[0], parts[1]);
});
