(() => {
  "use strict";

  const PI = Math.PI;
  const COLORS = {
    grid: "rgba(148, 163, 184, 0.17)",
    text: "#9db0c8",
    target: "#f8fafc",
    cosine: "#67e8f9",
    sine: "#c084fc",
    rose: "#fb7185",
    amber: "#fbbf24"
  };
  const materials = {
    wood: { name: "Wood", alpha: 1.5e-7 },
    granite: { name: "Granite", alpha: 8e-7 },
    steel: { name: "Steel", alpha: 1.2e-5 }
  };
  const heatModel = { length: 0.8, ambient: 25, hot: 180 };

  const state = {
    explorer: { n: 10, visible: "compare" },
    heat: { material: "granite", boundary: "fixed", n: 20, time: 0, playing: false },
    daily: { material: "granite", boundary: "fixed", n: 15, time: 0, center: 0.5 }
  };

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const format4 = value => Number.isFinite(value) ? value.toFixed(4) : "—";
  const formatMinutes = seconds => `${(seconds / 60).toFixed(seconds % 60 ? 1 : 0)} min`;

  function route() {
    const requested = location.hash.replace("#", "") || "overview";
    const name = ["overview", "explorer", "heat", "daily"].includes(requested) ? requested : "overview";
    qsa("[data-route]").forEach(page => { page.hidden = page.dataset.route !== name; });
    qsa("[data-route-link]").forEach(link => {
      const active = link.dataset.routeLink === name;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
    });
    requestAnimationFrame(() => {
      if (name === "explorer") updateExplorer();
      if (name === "heat") updateHeat();
      if (name === "daily") updateDaily();
    });
  }

  function cosineCoefficient(n) { return 4 * Math.pow(-1, n) / (n * n); }
  function sineCoefficient(n) {
    return 2 * PI * Math.pow(-1, n + 1) / n + 4 * (Math.pow(-1, n) - 1) / (PI * n * n * n);
  }
  function cosineSum(x, nMax) {
    let value = PI * PI / 3;
    for (let n = 1; n <= nMax; n++) value += cosineCoefficient(n) * Math.cos(n * x);
    return value;
  }
  function sineSum(x, nMax) {
    let value = 0;
    for (let n = 1; n <= nMax; n++) value += sineCoefficient(n) * Math.sin(n * x);
    return value;
  }

  function explorerMetrics(nMax, count = 4001) {
    let cosSquared = 0, sinSquared = 0, cosMax = 0, sinMax = 0;
    for (let i = 0; i < count; i++) {
      const x = PI * i / (count - 1);
      const target = x * x;
      const cosError = Math.abs(target - cosineSum(x, nMax));
      const sinError = Math.abs(target - sineSum(x, nMax));
      cosSquared += cosError * cosError;
      sinSquared += sinError * sinError;
      cosMax = Math.max(cosMax, cosError);
      sinMax = Math.max(sinMax, sinError);
    }
    return {
      cosRmse: Math.sqrt(cosSquared / count),
      sinRmse: Math.sqrt(sinSquared / count),
      cosMax,
      sinMax
    };
  }

  let explorerErrorCache = null;
  function buildExplorerErrorCurves() {
    if (explorerErrorCache) return explorerErrorCache;
    const count = 1001;
    const xs = Array.from({ length: count }, (_, i) => PI * i / (count - 1));
    const cosValues = Array(count).fill(PI * PI / 3);
    const sinValues = Array(count).fill(0);
    const cosine = [], sine = [];
    for (let n = 1; n <= 50; n++) {
      const a = cosineCoefficient(n), b = sineCoefficient(n);
      let cosSquare = 0, sinSquare = 0;
      for (let i = 0; i < count; i++) {
        cosValues[i] += a * Math.cos(n * xs[i]);
        sinValues[i] += b * Math.sin(n * xs[i]);
        const target = xs[i] * xs[i];
        cosSquare += (target - cosValues[i]) ** 2;
        sinSquare += (target - sinValues[i]) ** 2;
      }
      cosine.push([n, Math.sqrt(cosSquare / count)]);
      sine.push([n, Math.sqrt(sinSquare / count)]);
    }
    explorerErrorCache = { cosine, sine };
    return explorerErrorCache;
  }

  function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(rect.width * dpr), height = Math.round(rect.height * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width: rect.width, height: rect.height };
  }

  function drawChart(canvas, series, options = {}) {
    const setup = setupCanvas(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;
    const margin = { left: 52, right: 18, top: 16, bottom: 38 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;
    const all = series.flatMap(item => item.points);
    const xMin = options.xMin ?? Math.min(...all.map(point => point[0]));
    const xMax = options.xMax ?? Math.max(...all.map(point => point[0]));
    let yMin = options.yMin ?? Math.min(...all.map(point => point[1]));
    let yMax = options.yMax ?? Math.max(...all.map(point => point[1]));
    if (yMin === yMax) { yMin -= 1; yMax += 1; }
    const pad = options.yPadding ?? (yMax - yMin) * 0.08;
    if (options.yMin == null) yMin -= pad;
    if (options.yMax == null) yMax += pad;
    const sx = x => margin.left + (x - xMin) / (xMax - xMin || 1) * plotW;
    const sy = y => margin.top + (yMax - y) / (yMax - yMin || 1) * plotH;

    ctx.clearRect(0, 0, width, height);
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.fillStyle = COLORS.text;
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const value = yMin + (yMax - yMin) * i / 4;
      const y = sy(value);
      ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(width - margin.right, y); ctx.stroke();
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText((options.yFormat || (v => v.toFixed(v >= 10 ? 0 : 2)))(value), margin.left - 8, y);
    }
    for (let i = 0; i <= 4; i++) {
      const value = xMin + (xMax - xMin) * i / 4;
      const x = sx(value);
      ctx.beginPath(); ctx.moveTo(x, margin.top); ctx.lineTo(x, height - margin.bottom); ctx.stroke();
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText((options.xFormat || (v => v.toFixed(1)))(value), x, height - margin.bottom + 8);
    }
    if (yMin < 0 && yMax > 0) {
      ctx.strokeStyle = "rgba(226,232,240,.3)";
      ctx.beginPath(); ctx.moveTo(margin.left, sy(0)); ctx.lineTo(width - margin.right, sy(0)); ctx.stroke();
    }
    for (const item of series) {
      ctx.save();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.width || 2.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      if (item.dash) ctx.setLineDash(item.dash);
      ctx.beginPath();
      item.points.forEach((point, index) => {
        const x = sx(point[0]), y = sy(point[1]);
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.restore();
    }
  }

  function updateExplorer() {
    const n = state.explorer.n;
    qs("#n-output").value = String(n);
    const metrics = explorerMetrics(n);
    qs("#cos-rmse").textContent = format4(metrics.cosRmse);
    qs("#sin-rmse").textContent = format4(metrics.sinRmse);
    qs("#cos-max").textContent = format4(metrics.cosMax);
    qs("#sin-max").textContent = format4(metrics.sinMax);

    const count = 501;
    const target = [], cosine = [], sine = [], cosError = [], sinError = [];
    for (let i = 0; i < count; i++) {
      const x = PI * i / (count - 1);
      const f = x * x, c = cosineSum(x, n), s = sineSum(x, n);
      target.push([x, f]); cosine.push([x, c]); sine.push([x, s]);
      cosError.push([x, Math.abs(f - c)]); sinError.push([x, Math.abs(f - s)]);
    }
    const visible = state.explorer.visible;
    const approximationSeries = [{ points: target, color: COLORS.target, width: 3 }];
    const pointErrorSeries = [];
    if (visible !== "sine") {
      approximationSeries.push({ points: cosine, color: COLORS.cosine });
      pointErrorSeries.push({ points: cosError, color: COLORS.cosine });
    }
    if (visible !== "cosine") {
      approximationSeries.push({ points: sine, color: COLORS.sine });
      pointErrorSeries.push({ points: sinError, color: COLORS.sine });
    }
    const xFormat = value => Math.abs(value) < .01 ? "0" : Math.abs(value - PI) < .01 ? "π" : `${(value / PI).toFixed(2)}π`;
    drawChart(qs("#approx-chart"), approximationSeries, { xMin: 0, xMax: PI, yMin: -1, yMax: 10.4, xFormat });
    drawChart(qs("#point-error-chart"), pointErrorSeries, { xMin: 0, xMax: PI, yMin: 0, xFormat });

    const curves = buildExplorerErrorCurves();
    const rmseSeries = [];
    if (visible !== "sine") rmseSeries.push({ points: curves.cosine, color: COLORS.cosine });
    if (visible !== "cosine") rmseSeries.push({ points: curves.sine, color: COLORS.sine });
    drawChart(qs("#rmse-chart"), rmseSeries, { xMin: 1, xMax: 50, yMin: 0, xFormat: value => String(Math.round(value)) });
  }

  function simpsonIntegral(fn, steps = 800) {
    if (steps % 2) steps++;
    const h = heatModel.length / steps;
    let sum = fn(0) + fn(heatModel.length);
    for (let i = 1; i < steps; i++) sum += (i % 2 ? 4 : 2) * fn(i * h);
    return sum * h / 3;
  }

  const heatCoefficientCache = new Map();
  function initialExcess(x, center) {
    const sigma = 0.065;
    return (heatModel.hot - heatModel.ambient) * Math.exp(-0.5 * ((x - center) / sigma) ** 2);
  }
  function heatCoefficients(boundary, center) {
    const key = `${boundary}:${center.toFixed(4)}`;
    if (heatCoefficientCache.has(key)) return heatCoefficientCache.get(key);
    const coefficients = [];
    if (boundary === "insulated") {
      const a0 = 2 / heatModel.length * simpsonIntegral(x => initialExcess(x, center));
      coefficients.push(a0 / 2);
      for (let n = 1; n <= 50; n++) {
        coefficients.push(2 / heatModel.length * simpsonIntegral(x => initialExcess(x, center) * Math.cos(n * PI * x / heatModel.length)));
      }
    } else {
      coefficients.push(0);
      for (let n = 1; n <= 50; n++) {
        coefficients.push(2 / heatModel.length * simpsonIntegral(x => initialExcess(x, center) * Math.sin(n * PI * x / heatModel.length)));
      }
    }
    heatCoefficientCache.set(key, coefficients);
    return coefficients;
  }

  function temperatureAt(x, config) {
    const coeffs = heatCoefficients(config.boundary, config.center ?? 0.4);
    const alpha = materials[config.material].alpha;
    let excess = config.boundary === "insulated" ? coeffs[0] : 0;
    for (let n = 1; n <= config.n; n++) {
      const decay = Math.exp(-alpha * (n * PI / heatModel.length) ** 2 * config.time);
      const mode = config.boundary === "insulated" ? Math.cos(n * PI * x / heatModel.length) : Math.sin(n * PI * x / heatModel.length);
      excess += coeffs[n] * decay * mode;
    }
    return heatModel.ambient + excess;
  }

  function thermalColor(temp) {
    const t = clamp((temp - heatModel.ambient) / (heatModel.hot - heatModel.ambient), 0, 1);
    const stops = [
      [0, [20, 62, 114]], [.25, [8, 145, 178]], [.5, [250, 204, 21]], [.75, [249, 115, 22]], [1, [244, 63, 94]]
    ];
    let left = stops[0], right = stops[stops.length - 1];
    for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) { left = stops[i - 1]; right = stops[i]; break; }
    const p = (t - left[0]) / (right[0] - left[0] || 1);
    const rgb = left[1].map((v, i) => Math.round(v + (right[1][i] - v) * p));
    return `rgb(${rgb.join(",")})`;
  }

  function temperatureSeries(config, count = 181) {
    return Array.from({ length: count }, (_, i) => {
      const x = heatModel.length * i / (count - 1);
      return [x, temperatureAt(x, config)];
    });
  }

  function heatGradient(points) {
    const stops = points.filter((_, i) => i % 4 === 0).map((point, i, arr) => `${thermalColor(point[1])} ${(i / (arr.length - 1) * 100).toFixed(1)}%`);
    return `linear-gradient(90deg, ${stops.join(",")})`;
  }

  function updateHeat() {
    const config = { ...state.heat, center: 0.4 };
    qs("#heat-n-output").value = String(config.n);
    qs("#time-output").value = formatMinutes(config.time);
    const points = temperatureSeries(config);
    qs("#heat-strip").style.background = heatGradient(points);
    const peak = Math.max(...points.map(point => point[1]));
    qs("#peak-temp").textContent = `${peak.toFixed(1)}°C`;
    qs("#boundary-label").textContent = config.boundary === "fixed" ? "Sine · fixed temperature" : "Cosine · zero heat flow";
    const initial = Array.from({ length: 181 }, (_, i) => {
      const x = heatModel.length * i / 180;
      return [x, heatModel.ambient + initialExcess(x, config.center)];
    });
    drawChart(qs("#heat-chart"), [
      { points: initial, color: "rgba(248,250,252,.46)", width: 2, dash: [7, 7] },
      { points, color: COLORS.rose, width: 3 }
    ], { xMin: 0, xMax: heatModel.length, yMin: 20, yMax: 190, xFormat: value => `${Math.round(value * 100)} cm`, yFormat: value => `${Math.round(value)}°` });
  }

  function updateDaily() {
    const config = { ...state.daily };
    qs("#pan-position-output").value = `${Math.round(config.center / heatModel.length * 100)}%`;
    qs("#daily-n-output").value = String(config.n);
    qs("#daily-time-output").value = formatMinutes(config.time);
    qs("#daily-clock").textContent = formatMinutes(config.time);
    qs("#pan").style.left = `${config.center / heatModel.length * 100}%`;
    const points = temperatureSeries(config);
    qs("#countertop").style.background = heatGradient(points);
    drawChart(qs("#daily-chart"), [{ points, color: COLORS.amber, width: 3 }], {
      xMin: 0, xMax: heatModel.length, yMin: 20, yMax: 190,
      xFormat: value => `${Math.round(value * 100)} cm`, yFormat: value => `${Math.round(value)}°`
    });
  }

  let lastAnimationTime = 0;
  function animateHeat(timestamp) {
    if (!state.heat.playing) return;
    if (!lastAnimationTime) lastAnimationTime = timestamp;
    const elapsed = (timestamp - lastAnimationTime) / 1000;
    lastAnimationTime = timestamp;
    state.heat.time = Math.min(1800, state.heat.time + elapsed * 120);
    qs("#time-slider").value = String(Math.round(state.heat.time / 10) * 10);
    updateHeat();
    if (state.heat.time >= 1800) {
      state.heat.playing = false;
      qs("#play-heat").textContent = "Replay";
      lastAnimationTime = 0;
      return;
    }
    requestAnimationFrame(animateHeat);
  }

  function bindControls() {
    window.addEventListener("hashchange", route);
    qs("#n-slider").addEventListener("input", event => { state.explorer.n = Number(event.target.value); updateExplorer(); });
    qsa("[data-series]").forEach(button => button.addEventListener("click", () => {
      state.explorer.visible = button.dataset.series;
      qsa("[data-series]").forEach(item => item.classList.toggle("active", item === button));
      updateExplorer();
    }));

    qs("#heat-material").addEventListener("change", event => { state.heat.material = event.target.value; updateHeat(); });
    qs("#heat-n").addEventListener("input", event => { state.heat.n = Number(event.target.value); updateHeat(); });
    qs("#time-slider").addEventListener("input", event => { state.heat.time = Number(event.target.value); updateHeat(); });
    qsa("[data-boundary]").forEach(button => button.addEventListener("click", () => {
      state.heat.boundary = button.dataset.boundary;
      qsa("[data-boundary]").forEach(item => item.classList.toggle("active", item === button));
      updateHeat();
    }));
    qs("#play-heat").addEventListener("click", () => {
      if (state.heat.time >= 1800) { state.heat.time = 0; qs("#time-slider").value = "0"; }
      state.heat.playing = !state.heat.playing;
      qs("#play-heat").textContent = state.heat.playing ? "Pause" : "Play";
      lastAnimationTime = 0;
      if (state.heat.playing) requestAnimationFrame(animateHeat);
    });

    qs("#daily-material").addEventListener("change", event => { state.daily.material = event.target.value; updateDaily(); });
    qs("#pan-position").addEventListener("input", event => { state.daily.center = heatModel.length * Number(event.target.value) / 100; updateDaily(); });
    qs("#daily-n").addEventListener("input", event => { state.daily.n = Number(event.target.value); updateDaily(); });
    qs("#daily-time").addEventListener("input", event => { state.daily.time = Number(event.target.value); updateDaily(); });
    qsa("[data-daily-boundary]").forEach(button => button.addEventListener("click", () => {
      state.daily.boundary = button.dataset.dailyBoundary;
      qsa("[data-daily-boundary]").forEach(item => item.classList.toggle("active", item === button));
      updateDaily();
    }));

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(route, 90);
    });
  }

  bindControls();
  route();
})();
