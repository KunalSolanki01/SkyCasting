// ── APIs ──
const GEO_API = "https://geocoding-api.open-meteo.com/v1/search";
const WX_API  = "https://api.open-meteo.com/v1/forecast";

// ── WMO code maps ──
const WMO_GLYPH = {
  0:"--",1:"--",2:"-~",3:"~~",45:"~-",48:"~-",
  51:".-",53:".-",55:"..",61:".-",63:"..",65:"...",
  71:"*-",73:"**",75:"***",77:"*.",
  80:".-",81:"..",82:"...",85:"*.",86:"**",
  95:"!!",96:"!!.",99:"!!!"
};
const WMO_DESC = {
  0:"Clear Skies · Serene",1:"Clear Skies · Serene",
  2:"Partly Veiled · Soft Light",3:"Overcast Veil · Muted Stillness",
  45:"Mist Shroud · Ethereal Calm",48:"Mist Shroud · Ethereal Calm",
  51:"Drizzle Descent · Cleansing",53:"Drizzle Descent · Cleansing",55:"Drizzle Descent · Cleansing",
  61:"Rain Veil · Elemental Flow",63:"Rain Veil · Elemental Flow",65:"Rain Veil · Elemental Flow",
  71:"Crystal Descent · Frozen Stillness",73:"Crystal Descent · Frozen Stillness",75:"Crystal Descent · Frozen Stillness",
  80:"Shower Descent · Cleansing",81:"Shower Descent · Cleansing",82:"Shower Descent · Cleansing",
  95:"Storm Surge · Turbulent Force",96:"Storm Surge · Turbulent Force",99:"Storm Surge · Turbulent Force"
};
const WMO_SHORT = {
  0:"Serene",1:"Serene",2:"Veiled",3:"Overcast",
  45:"Ethereal",48:"Ethereal",51:"Drizzle",53:"Drizzle",55:"Drizzle",
  61:"Rain",63:"Rain",65:"Rain",71:"Snow",73:"Snow",75:"Snow",
  80:"Showers",81:"Showers",82:"Showers",95:"Storm",96:"Storm",99:"Storm"
};
const WMO_AMBIENT = {
  0:["#1a0f00","#2a1800"],1:["#1a0f00","#2a1800"],
  2:["#0d1117","#111520"],3:["#0d1117","#111520"],
  45:["#0d1520","#0f1a22"],48:["#0d1520","#0f1a22"],
  61:["#0d1520","#0f1a22"],63:["#0d1520","#0f1a22"],65:["#0d1520","#0f1a22"],
  71:["#0f1520","#141a28"],73:["#0f1520","#141a28"],75:["#0f1520","#141a28"],
  80:["#0d1520","#0f1a22"],81:["#0d1520","#0f1a22"],82:["#0d1520","#0f1a22"],
  95:["#0d0d18","#0a0a14"],96:["#0d0d18","#0a0a14"],99:["#0d0d18","#0a0a14"]
};

// ── Ambient Canvas ──
const canvas = document.getElementById("ambientCanvas");
const ctx    = canvas.getContext("2d");
let blobs    = [];

function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }

function initBlobs(colors) {
  blobs = colors.map((color, i) => ({
    x:  canvas.width  * (i === 0 ? 0.2 : 0.8),
    y:  canvas.height * (i === 0 ? 0.3 : 0.65),
    r:  Math.min(canvas.width, canvas.height) * 0.48,
    color,
    vx: (Math.random() - 0.5) * 0.28,
    vy: (Math.random() - 0.5) * 0.28,
  }));
}

function drawAmbient() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  blobs.forEach(b => {
    b.x += b.vx; b.y += b.vy;
    if (b.x < 0 || b.x > canvas.width)  b.vx *= -1;
    if (b.y < 0 || b.y > canvas.height) b.vy *= -1;
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    g.addColorStop(0, b.color + "55");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });
  requestAnimationFrame(drawAmbient);
}

// ── City timezone state ──
let cityTimezone = "UTC";
let citySunrise  = null;
let citySunset   = null;
let arcTicker    = null;

// ── Hero Map (Leaflet) ──
let heroMap    = null;
let heroMarker = null;

function initMap(lat, lon) {
  if (!heroMap) {
    heroMap = L.map("heroMap", { zoomControl: true, attributionControl: true, dragging: true, scrollWheelZoom: true, doubleClickZoom: true, touchZoom: false })
      .setView([lat, lon], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(heroMap);
    heroMarker = L.circleMarker([lat, lon], { radius: 6, color: "#D4AF37", fillColor: "#D4AF37", fillOpacity: 0.9, weight: 2 }).addTo(heroMap);
  } else {
    heroMap.setView([lat, lon], 11);
    heroMarker.setLatLng([lat, lon]);
  }
  setTimeout(() => heroMap.invalidateSize(), 120);
}

// ── Clock — city local time ──
function updateClock() {
  const t = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false, timeZone: cityTimezone
  });
  document.getElementById("currentTime").textContent = t;
  const h = document.getElementById("heroLocalTime");
  if (h) h.textContent = t.slice(0, 5);
}

// ── City local ms ──
function cityNowMs() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: cityTimezone,
    year:"numeric", month:"2-digit", day:"2-digit",
    hour:"2-digit", minute:"2-digit", second:"2-digit", hour12: false
  }).formatToParts(new Date());
  const p = {};
  parts.forEach(({ type, value }) => { p[type] = value; });
  const hr = p.hour === "24" ? "00" : p.hour;
  return new Date(`${p.year}-${p.month}-${p.day}T${hr}:${p.minute}:${p.second}`).getTime();
}

// ── Live arc tick ──
function tickArc() {
  if (!citySunrise || !citySunset) return;
  const now   = cityNowMs();
  const body  = document.getElementById("celestialBody");
  const mask  = document.getElementById("moonMask");
  const label = document.getElementById("transitLabel");
  const isDay = now >= citySunrise && now <= citySunset;

  if (isDay) {
    const pct = Math.max(0, Math.min((now - citySunrise) / (citySunset - citySunrise), 1));
    const cx  = (1-pct)*(1-pct)*20 + 2*(1-pct)*pct*150 + pct*pct*280;
    const cy  = (1-pct)*(1-pct)*140 + 2*(1-pct)*pct*10  + pct*pct*140;
    body.setAttribute("cx", cx.toFixed(1));
    body.setAttribute("cy", cy.toFixed(1));
    body.setAttribute("fill", "#D4AF37");
    body.setAttribute("r", "10");
    body.className.baseVal = "is-sun";
    mask.setAttribute("fill", "transparent");
    label.textContent = "SOLAR TRANSIT";
  } else {
    const nightDur = (24 * 3600 * 1000) - (citySunset - citySunrise);
    const elapsed  = now > citySunset
      ? now - citySunset
      : now - (citySunset - 24 * 3600 * 1000);
    // moon travels right->left along the same upper arc
    const pct = Math.max(0, Math.min(elapsed / nightDur, 1));
    const t   = 1 - pct;
    const cx  = t*t*280 + 2*t*pct*150 + pct*pct*20;
    const cy  = t*t*140 + 2*t*pct*10  + pct*pct*140;
    body.setAttribute("cx", cx.toFixed(1));
    body.setAttribute("cy", cy.toFixed(1));
    body.setAttribute("fill", "#c8d8f8");
    body.setAttribute("r", "11");
    body.className.baseVal = "is-moon";
    mask.setAttribute("r", "9");
    mask.setAttribute("cx", (cx + 5).toFixed(1));
    mask.setAttribute("cy", (cy - 5).toFixed(1));
    mask.setAttribute("fill", "var(--moon-mask)");
    label.textContent = "LUNAR TRANSIT";
  }
}

// ── Animated number counter ──
function animateValue(el, target, suffix = "", duration = 800) {
  const start = parseFloat(el.textContent) || 0;
  const diff  = target - start;
  const startTime = performance.now();
  function step(now) {
    const p = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(start + diff * ease) + suffix;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── Render ──
function render(geo, wx) {
  const c   = wx.current;
  const d   = wx.daily;
  const h   = wx.hourly;
  const wmo = c.weather_code;

  // Hero
  document.getElementById("cityName").textContent    = geo.name + ", " + (geo.country_code || "");
  document.getElementById("coordinates").textContent =
    `${Math.abs(geo.latitude).toFixed(4)}° ${geo.latitude >= 0 ? "N" : "S"}, ` +
    `${Math.abs(geo.longitude).toFixed(4)}° ${geo.longitude >= 0 ? "E" : "W"}`;

  animateValue(document.getElementById("temperature"), Math.round(c.temperature_2m), "");
  document.getElementById("conditionText").textContent = WMO_DESC[wmo] || "Atmospheric Presence";

  // Hero strip
  document.getElementById("heroHigh").textContent     = Math.round(d.temperature_2m_max[0]) + "°";
  document.getElementById("heroLow").textContent      = Math.round(d.temperature_2m_min[0]) + "°";
  document.getElementById("heroHumidity").textContent = c.relative_humidity_2m + "%";
  document.getElementById("heroWind").textContent     = Math.round(c.wind_speed_10m) + " km/h";

  // Arc stats
  document.getElementById("feelsLike").textContent  = Math.round(c.apparent_temperature) + "°C";
  document.getElementById("visibility").textContent = c.visibility >= 1000
    ? (c.visibility / 1000).toFixed(1) + " km" : c.visibility + " m";
  document.getElementById("pressure").textContent   = c.surface_pressure.toFixed(0) + " hPa";

  // Wind compass
  const dirs     = ["N","NE","E","SE","S","SW","W","NW"];
  const dirNames = ["North","Northeast","East","Southeast","South","Southwest","West","Northwest"];
  const idx = Math.round((c.wind_direction_10m || 0) / 45) % 8;
  document.getElementById("windSpeed").textContent = Math.round(c.wind_speed_10m) + " km/h";
  document.getElementById("windDir").textContent   = dirs[idx] + " · " + dirNames[idx];
  document.getElementById("compassNeedle").style.transform = `rotate(${c.wind_direction_10m || 0}deg)`;

  // Humidity arc
  const offset = 157 - (c.relative_humidity_2m / 100) * 157;
  document.getElementById("humidityArc").style.strokeDashoffset = offset;
  document.getElementById("humidityValue").textContent = c.relative_humidity_2m + "%";

  // UV
  const uv    = c.uv_index ?? 0;
  const uvPct = Math.min(uv / 11, 1);
  document.getElementById("uvFill").style.width  = (1 - uvPct) * 100 + "%";
  document.getElementById("uvMarker").style.left = uvPct * 100 + "%";
  document.getElementById("uvValue").textContent = uv.toFixed(1);
  const uvCats = ["","Low","Moderate","High","Very High","Extreme"];
  const uvCat  = uv <= 2 ? 1 : uv <= 5 ? 2 : uv <= 7 ? 3 : uv <= 10 ? 4 : 5;
  document.getElementById("uvLabel").textContent = uvCats[uvCat] + " · Max " + (d.uv_index_max[0] ?? "—");

  // Extra readings
  document.getElementById("cloudiness").textContent = c.cloud_cover + "%";
  document.getElementById("dewPoint").textContent   = Math.round(c.dew_point_2m) + "°C";
  document.getElementById("windGust").textContent   = Math.round(c.wind_gusts_10m) + " km/h";
  document.getElementById("seaLevel").textContent   = (c.surface_pressure).toFixed(0) + " hPa";

  // Badges
  const badges = document.getElementById("badgesContainer");
  badges.innerHTML = "";
  const list = [
    c.relative_humidity_2m < 60 ? "Optimal Sattva Air Quality" : "Elevated Moisture Presence",
    c.surface_pressure > 1010   ? "Stable Barometric Pressure" : "Low Pressure System"
  ];
  list.forEach((txt, i) => {
    const b = document.createElement("span");
    b.className = "badge" + (i === 1 && c.surface_pressure <= 1010 ? " warn" : "");
    b.style.animationDelay = (i * 0.12) + "s";
    b.textContent = txt;
    badges.appendChild(b);
  });

  // Sunrise / Sunset
  const sunrise = new Date(d.sunrise[0]);
  const sunset  = new Date(d.sunset[0]);
  const fmt = dt => dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  document.getElementById("sunriseLabel").textContent = "Sunrise " + fmt(sunrise);
  document.getElementById("sunsetLabel").textContent  = "Sunset "  + fmt(sunset);

  // Precip value
  document.getElementById("precipValue").textContent = (c.precipitation ?? 0).toFixed(1) + " mm";

  // Precip bars with staggered animation
  const precipBars   = document.getElementById("precipBars");
  precipBars.innerHTML = "";
  const hourlyPrecip = (h.precipitation || []).slice(0, 12);
  const maxP = Math.max(...hourlyPrecip, 0.1);
  const curHour = new Date().getHours() % 12;
  hourlyPrecip.forEach((val, i) => {
    const bar = document.createElement("div");
    bar.className = "precip-bar" + (i === curHour ? " active" : "");
    bar.style.height = Math.max((val / maxP) * 100, 3) + "%";
    bar.style.animationDelay = (i * 0.05) + "s";
    precipBars.appendChild(bar);
  });

  // 5-day forecast with stagger
  const grid = document.getElementById("forecastGrid");
  grid.innerHTML = "";
  d.time.slice(0, 5).forEach((dateStr, i) => {
    const date  = new Date(dateStr);
    const label = i === 0 ? "TODAY" : date.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase();
    const code  = d.weather_code[i];
    const high  = Math.round(d.temperature_2m_max[i]);
    const low   = Math.round(d.temperature_2m_min[i]);
    const card  = document.createElement("div");
    card.className = "forecast-card" + (i === 0 ? " today" : "");
    card.innerHTML = `
      <div class="forecast-day">${label}</div>
      <span class="forecast-glyph">${WMO_GLYPH[code] || "--"}</span>
      <span class="forecast-high">${high}°</span>
      <span class="forecast-low">${low}°</span>
      <div class="forecast-desc">${WMO_SHORT[code] || "Balanced"}</div>`;
    grid.appendChild(card);
  });

  // Timezone + arc ticker
  cityTimezone = wx.timezone || "UTC";
  citySunrise  = sunrise.getTime();
  citySunset   = sunset.getTime();
  if (arcTicker) clearInterval(arcTicker);
  tickArc();
  arcTicker = setInterval(tickArc, 1000);

  // Hero map
  initMap(geo.latitude, geo.longitude);

  // Ambient blobs
  initBlobs(WMO_AMBIENT[wmo] || ["#0d1117","#111520"]);
}

// ── Fetch ──
async function fetchWeather(city) {
  showLoader(true);
  try {
    const geoRes  = await fetch(`${GEO_API}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    const geoData = await geoRes.json();
    if (!geoData.results?.length) throw new Error("City not found in sanctuary");
    const geo = geoData.results[0];

    const params = new URLSearchParams({
      latitude:  geo.latitude,
      longitude: geo.longitude,
      current: [
        "temperature_2m","apparent_temperature","relative_humidity_2m",
        "dew_point_2m","precipitation","weather_code","cloud_cover",
        "surface_pressure","wind_speed_10m","wind_direction_10m",
        "wind_gusts_10m","visibility","uv_index"
      ].join(","),
      hourly:       "precipitation",
      daily:        "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max",
      timezone:     "auto",
      forecast_days: 5
    });

    const wxRes  = await fetch(`${WX_API}?${params}`);
    const wxData = await wxRes.json();
    render(geo, wxData);
  } catch (err) {
    document.getElementById("conditionText").textContent = err.message || "Could not reach atmosphere";
  } finally {
    showLoader(false);
  }
}

function showLoader(on) {}

// ── Search ──
function search() {
  const val = document.getElementById("cityInput").value.trim();
  if (val) fetchWeather(val);
}
document.getElementById("searchBtn").addEventListener("click", search);
document.getElementById("cityInput").addEventListener("keydown", e => { if (e.key === "Enter") search(); });

// ── Theme toggle ──
document.getElementById("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light");
});

// ── Init ──
window.addEventListener("resize", resizeCanvas);
resizeCanvas();
drawAmbient();
setInterval(updateClock, 1000);
updateClock();
fetchWeather("Vadodara");