# SkyCasting

A cyber-spiritual atmospheric weather app with a bento grid layout, glassmorphism cards, live celestial transit, and an embedded location map.

> **Live Repo:** [github.com/KunalSolanki01/SkyCasting](https://github.com/KunalSolanki01/SkyCasting)

---

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/KunalSolanki01/SkyCasting.git
```

### Navigate into the project

```bash
cd SkyCasting
```

### Run locally

No build step needed. Just open `index.html` in your browser:

```bash
# Option 1 — open directly
start index.html

# Option 2 — use VS Code Live Server
code .
# then right-click index.html > Open with Live Server
```

---

## Git Workflow

### Initial setup (first time)

```bash
git init
git remote add origin https://github.com/KunalSolanki01/SkyCasting.git
git branch -M main
```

### Stage, commit and push changes

```bash
git add .
git commit -m "your commit message"
git push origin main
```

### Pull latest changes

```bash
git pull origin main
```

### Check status

```bash
git status
git log --oneline
```

---

## Features

- **Bento Grid Layout** — 12-column CSS grid with 8 named areas: hero, arc, wind, humidity, uv, precipitation, forecast, extra
- **Solar / Lunar Transit** — Live arc animation updating every second using the city's IANA timezone. Sun travels left to right by day; Moon travels right to left by night with a crescent mask illusion
- **Hero Card** — City name, coordinates, local time, temperature, condition, HIGH/LOW/HUMIDITY/WIND strip, badges, and an embedded square map
- **Location Map** — Leaflet.js + OpenStreetMap tiles, no API key required. Gold circle marker pins the exact city location
- **Wind Compass** — Animated needle rotating to live wind direction
- **Humidity Arc** — SVG arc meter filling proportionally to relative humidity
- **UV Index** — Gradient bar with animated marker and category label
- **Precipitation** — 12-hour bar chart with active hour highlight
- **5-Day Forecast** — Grid of forecast cards with WMO condition glyphs
- **Atmospheric Readings** — Cloudiness, dew point, wind gust, sea level pressure
- **Ambient Canvas** — Two animated radial gradient blobs reacting to weather condition
- **Glass Toggle** — Gradient pill switching between dark and light mode
- **Custom Cursors** — Star cursor (default), Mickey Mouse pointer (interactive elements)
- **Animated Counters** — Numbers ease-in on data load
- **Card Entrance Stagger** — Cards animate in with staggered delay

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Markup | HTML5 |
| Styling | CSS3 (custom properties, grid, glassmorphism, keyframe animations) |
| Logic | Vanilla JavaScript (ES6+) |
| Weather API | [Open-Meteo](https://open-meteo.com/) — free, no API key |
| Geocoding | Open-Meteo Geocoding API |
| Map | [Leaflet.js](https://leafletjs.com/) + OpenStreetMap tiles |
| Fonts | Cormorant Garamond, Inter, JetBrains Mono (Google Fonts) |

---

## APIs Used

### Open-Meteo Geocoding
```
GET https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1
```

### Open-Meteo Forecast
```
GET https://api.open-meteo.com/v1/forecast
    ?latitude=&longitude=
    &current=temperature_2m,apparent_temperature,relative_humidity_2m,
             dew_point_2m,precipitation,weather_code,cloud_cover,
             surface_pressure,wind_speed_10m,wind_direction_10m,
             wind_gusts_10m,visibility,uv_index
    &hourly=precipitation
    &daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max
    &timezone=auto
    &forecast_days=5
```

---

## Project Structure

```
weather/
|-- index.html          # Bento grid layout, all 8 cards, Leaflet map div
|-- style.css           # CSS variables, grid, glassmorphism, animations
|-- script.js           # API fetch, render, arc tick, Leaflet map, clock
|-- Weather_2026_dark.webp  # App logo / favicon
`-- README.md
```

---

## Design System

### Color Palette (Dark Mode)
| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#121214` | Page background |
| `--gold` | `#D4AF37` | Accents, labels, sun |
| `--ivory` | `#F5F5F3` | Primary text |
| `--ivory-dim` | `rgba(245,245,243,0.5)` | Secondary text |
| `--mist` | `#6ba3be` | Humidity arc |
| `--moon-mask` | `#121214` | Crescent illusion overlay |

### Typography
| Font | Usage |
|------|-------|
| Cormorant Garamond | City name, temperature, condition, serif values |
| Inter | Body, labels |
| JetBrains Mono | Coordinates, stats labels, badges, clock |

---

## Celestial Transit Logic

- **Sunrise / Sunset** times come from Open-Meteo `daily` response
- City local time is derived via `Intl.DateTimeFormat.formatToParts()` with the city's IANA timezone
- Sun follows a quadratic bezier: `P0=(20,140)` control `(150,10)` `P2=(280,140)`, left to right, `pct` = elapsed day fraction
- Moon follows the same bezier in reverse (right to left), `pct` = elapsed night fraction
- Crescent mask: a second circle offset `+5, -5` from the moon body, filled with `--moon-mask` background color

---

## Light / Dark Mode

Toggle via the pill button in the nav. CSS class `body.light` overrides all `--` variables. Key differences:

- Background shifts from `#121214` to `#f0ede8`
- Moon fill overridden to navy `#1a2a6c` via `body.light #celestialBody.is-moon`
- Ambient canvas opacity reduced to `0.2` in light mode

---

## Default City

App loads with **Vadodara** on startup. Any city can be searched via the nav input or by pressing `Enter`.
