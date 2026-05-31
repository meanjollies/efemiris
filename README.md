# efemiris
A lightweight, minimal, client-side web application designed to track satellite locations, render ground tracks, and calculate upcoming overhead passes within a 24-hour window. Check out [efemiris.haunted.sh](https://efemiris.haunted.sh) for a live demo.

## Structure
```
├── index.html        # Main application layout & entry point
├── css/
│   └── styles.css    # Clean UI skin with native light/dark mode support
└── js/
    ├── state.js      # URL parsing, encoding, and global state management
    ├── map.js        # Leaflet initialization and vector layer handling
    ├── tle.js        # Fetching and caching of TLE data
    ├── passes.js     # Orbital look-ahead pass math calculations
    ├── satellites.js # Catalog data and track updates
    ├── search.js     # Filter logic for satellite search modal
    └── ui.js         # DOM manipulation, chip rendering, and event handlers
```

## Getting Started
Get in loser, because we're going shopping for a dozen 5090s to run this bad boy. Just kidding. efemiris is built entirely as a client-side application, so it requires no heavy build steps, node modules, or backend environments.

### Running Locally
1. Clone this repo:
    ```
    git clone https://github.com/yourusername/efemiris.git
    cd efemiris
    ```
2. Serve it up using any web server you want, e.g. Python:
    ```
    python3 -m http.server 8080
    ```
3. Open your browser and navigate to `http://localhost:8080`.

## Data Attribution
Orbital elements (TLEs) are sourced and tracked utilizing active data catalogs. For checking valid NORAD IDs or expanding satellite catalogs, see:
- [CelesTrak](https://celestrak.org)
- [N2YO](https://www.n2yo.com)
