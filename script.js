const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("visible"));
}

const copyButton = document.querySelector("#copy-citation");
const citation = document.querySelector("#citation");

const fractionSlider = document.querySelector("#rope-fraction");
const positionSlider = document.querySelector("#token-position");
const fractionValue = document.querySelector("#rope-fraction-value");
const positionValue = document.querySelector("#token-position-value");
const pairGrid = document.querySelector("#rope-pair-grid");
const activeSummary = document.querySelector("#rope-active-summary");
const pairTitle = document.querySelector("#rope-pair-title");
const pairDetail = document.querySelector("#rope-pair-detail");

const headDimensions = 64;
const thetaBase = 10000;
let selectedPair = 0;

function compactNumber(value) {
  if (value >= 10000) return value.toExponential(1);
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  if (value >= 1) return value.toFixed(2);
  return value.toExponential(1);
}

function renderRopeExplorer() {
  if (!fractionSlider || !positionSlider || !pairGrid) return;

  const requestedFraction = Number(fractionSlider.value);
  const position = Number(positionSlider.value);
  const rotatedDimensions = requestedFraction === 0
    ? 0
    : Math.max(2, Math.floor((headDimensions * requestedFraction) / 100 / 2) * 2);
  const activePairs = rotatedDimensions / 2;
  const totalPairs = headDimensions / 2;
  const actualFraction = (rotatedDimensions / headDimensions) * 100;

  fractionValue.textContent = `${requestedFraction}%`;
  positionValue.textContent = String(position);
  activeSummary.textContent = rotatedDimensions === 0
    ? "No dimensions rotate · NoPE"
    : `${rotatedDimensions} of ${headDimensions} dimensions rotate · ${activePairs} frequency ${activePairs === 1 ? "pair" : "pairs"} · ${actualFraction.toFixed(1)}% actual`;

  pairGrid.replaceChildren();

  for (let pairIndex = 0; pairIndex < totalPairs; pairIndex += 1) {
    const active = pairIndex < activePairs;
    const frequency = active
      ? thetaBase ** (-(2 * pairIndex) / rotatedDimensions)
      : 0;
    const angle = active ? position * frequency : 0;
    const normalizedAngle = ((angle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    const colorProgress = activePairs <= 1 ? 0 : pairIndex / (activePairs - 1);
    const hue = 82 + colorProgress * 82;
    const color = `hsl(${hue} 78% 61%)`;
    const button = document.createElement("button");

    button.type = "button";
    button.className = `rope-pair${active ? " active" : ""}${pairIndex === selectedPair ? " selected" : ""}`;
    button.style.setProperty("--pair-angle", `${normalizedAngle}rad`);
    button.style.setProperty("--pair-color", active ? color : "#53645d");
    button.setAttribute("aria-pressed", pairIndex === selectedPair ? "true" : "false");
    button.setAttribute(
      "aria-label",
      active
        ? `Hidden dimensions ${2 * pairIndex} and ${2 * pairIndex + 1}, active, frequency ${frequency.toExponential(2)} radians per token`
        : `Hidden dimensions ${2 * pairIndex} and ${2 * pairIndex + 1}, no RoPE applied`
    );
    button.innerHTML = `
      <span class="pair-orbit" aria-hidden="true"><i></i></span>
      <strong>${2 * pairIndex}–${2 * pairIndex + 1}</strong>
      <small>${active ? frequency.toExponential(1) : "off"}</small>
    `;
    button.addEventListener("click", () => {
      selectedPair = pairIndex;
      renderRopeExplorer();
    });
    pairGrid.append(button);
  }

  const selectedActive = selectedPair < activePairs;
  if (!selectedActive) {
    pairTitle.textContent = `Dims ${2 * selectedPair}–${2 * selectedPair + 1} · unchanged`;
    pairDetail.textContent = `No rotary frequency is assigned to this pair at ${requestedFraction}% RoPE.`;
    return;
  }

  const selectedFrequency = thetaBase ** (-(2 * selectedPair) / rotatedDimensions);
  const wavelength = (2 * Math.PI) / selectedFrequency;
  const degrees = (((position * selectedFrequency * 180) / Math.PI) % 360 + 360) % 360;
  const bandLabel = selectedPair === 0
    ? "highest frequency"
    : selectedPair === activePairs - 1
      ? "lowest active frequency"
      : `frequency band ${selectedPair + 1} of ${activePairs}`;

  pairTitle.textContent = `Dims ${2 * selectedPair}–${2 * selectedPair + 1} · ${bandLabel}`;
  pairDetail.textContent = `θ = ${selectedFrequency.toExponential(2)} rad/token · wavelength ≈ ${compactNumber(wavelength)} tokens · rotation here: ${degrees.toFixed(1)}°`;
}

fractionSlider?.addEventListener("input", renderRopeExplorer);
positionSlider?.addEventListener("input", renderRopeExplorer);
renderRopeExplorer();

const cacheChart = document.querySelector("#cache-chart");
const cacheTooltip = document.querySelector("#cache-tooltip");
const cacheHeadSlider = document.querySelector("#cache-head-dim");
const cacheHeadValue = document.querySelector("#cache-head-dim-value");
const cacheHeadMeta = document.querySelector("#cache-head-dim-meta");
const cacheLegendButtons = [...document.querySelectorAll("[data-cache-series]")];
const cacheFull100M = document.querySelector("#cache-full-100m");
const cacheHalf100M = document.querySelector("#cache-half-100m");
const cacheTenth100M = document.querySelector("#cache-tenth-100m");
const cacheSavings100M = document.querySelector("#cache-savings-100m");

const cacheHeadDimensions = [32, 64, 128, 256];
const cacheSeries = [
  { fraction: 1, label: "Full RoPE", color: "#08110f" },
  { fraction: 0.75, label: "75% RoPE", color: "#007b6c" },
  { fraction: 0.5, label: "50% RoPE", color: "#2cb79d" },
  { fraction: 0.25, label: "25% RoPE", color: "#77a92f" },
  { fraction: 0.1, label: "10% RoPE", color: "#8b67c8" },
];
const cacheExponents = Array.from({ length: 18 }, (_, index) => index + 10);
const svgNamespace = "http://www.w3.org/2000/svg";
let cacheFocusIndex = cacheExponents.length - 2;

function createSvgElement(tagName, attributes = {}, text = "") {
  const element = document.createElementNS(svgNamespace, tagName);
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, String(value)));
  if (text) element.textContent = text;
  return element;
}

function formatCacheBytes(bytes) {
  const gibibyte = 2 ** 30;
  const mebibyte = 2 ** 20;
  const kibibyte = 2 ** 10;

  if (bytes >= gibibyte) {
    const value = bytes / gibibyte;
    return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} GiB`;
  }
  if (bytes >= mebibyte) {
    const value = bytes / mebibyte;
    return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} MiB`;
  }
  const value = bytes / kibibyte;
  return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} KiB`;
}

function formatSequencePower(exponent) {
  if (exponent < 20) return `${2 ** (exponent - 10)}K`;
  return `${2 ** (exponent - 20)}M`;
}

function selectedCacheHeadDimension() {
  const index = Number(cacheHeadSlider?.value ?? cacheHeadDimensions.length - 1);
  return cacheHeadDimensions[index] ?? 256;
}

function cacheSizeBytes(sequenceLength, headDimension, fraction) {
  return sequenceLength * headDimension * fraction * 4;
}

function updateCacheSummary(headDimension) {
  const sequenceLength = 100_000_000;
  const full = cacheSizeBytes(sequenceLength, headDimension, 1);
  const half = cacheSizeBytes(sequenceLength, headDimension, 0.5);
  const tenth = cacheSizeBytes(sequenceLength, headDimension, 0.1);
  const savings = full - tenth;

  cacheFull100M.textContent = formatCacheBytes(full);
  cacheHalf100M.textContent = formatCacheBytes(half);
  cacheTenth100M.textContent = formatCacheBytes(tenth);
  cacheSavings100M.textContent = `At 100M tokens, reducing RoPE from 100% to 10% saves about ${formatCacheBytes(savings)} for every replicated cache copy.`;
}

function renderCacheChart() {
  if (!cacheChart || !cacheTooltip) return;

  cacheTooltip.hidden = true;

  const width = 1040;
  const height = 540;
  const margin = { top: 42, right: 36, bottom: 88, left: 104 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const minExponent = cacheExponents[0];
  const maxExponent = cacheExponents.at(-1);
  const minLogBytes = 13;
  const maxLogBytes = 38;
  const headDimension = selectedCacheHeadDimension();
  const activeFractions = new Set(
    cacheLegendButtons
      .filter((button) => button.getAttribute("aria-pressed") === "true")
      .map((button) => Number(button.dataset.cacheSeries))
  );

  const xForExponent = (exponent) => margin.left + ((exponent - minExponent) / (maxExponent - minExponent)) * plotWidth;
  const yForBytes = (bytes) => margin.top + ((maxLogBytes - Math.log2(bytes)) / (maxLogBytes - minLogBytes)) * plotHeight;

  cacheChart.replaceChildren();
  cacheChart.append(
    createSvgElement("title", { id: "cache-chart-title" }, `RoPE cache VRAM for a ${headDimension}-dimensional attention head`),
    createSvgElement("desc", { id: "cache-chart-desc" }, "A log scale line plot at every power-of-two sequence length from 2 to the power of 10 through 2 to the power of 27. A reference line marks 100 million tokens.")
  );

  const yTickExponents = [14, 18, 22, 26, 30, 34, 38];
  yTickExponents.forEach((exponent) => {
    const bytes = 2 ** exponent;
    const y = yForBytes(bytes);
    cacheChart.append(
      createSvgElement("line", {
        x1: margin.left,
        y1: y,
        x2: width - margin.right,
        y2: y,
        class: "cache-grid-line cache-grid-line-major",
      }),
      createSvgElement("text", {
        x: margin.left - 14,
        y: y + 4,
        class: "cache-axis-label",
        "text-anchor": "end",
      }, formatCacheBytes(bytes))
    );
  });

  const labeledXExponents = new Set([10, 12, 14, 16, 18, 20, 22, 24, 26, 27]);
  cacheExponents.forEach((exponent) => {
    const x = xForExponent(exponent);
    cacheChart.append(createSvgElement("line", {
      x1: x,
      y1: margin.top,
      x2: x,
      y2: height - margin.bottom,
      class: labeledXExponents.has(exponent) ? "cache-grid-line cache-grid-line-major" : "cache-grid-line",
    }));

    if (!labeledXExponents.has(exponent)) return;
    const label = createSvgElement("text", {
      x,
      y: height - margin.bottom + 27,
      class: "cache-axis-label",
      "text-anchor": "middle",
    });
    label.append(
      createSvgElement("tspan", { x, dy: 0 }, `2^${exponent}`),
      createSvgElement("tspan", { x, dy: 15 }, formatSequencePower(exponent))
    );
    cacheChart.append(label);
  });

  const referenceExponent = Math.log2(100_000_000);
  const referenceX = xForExponent(referenceExponent);
  cacheChart.append(
    createSvgElement("line", {
      x1: referenceX,
      y1: margin.top,
      x2: referenceX,
      y2: height - margin.bottom,
      class: "cache-reference-line",
    }),
    createSvgElement("text", {
      x: referenceX - 8,
      y: margin.top + 14,
      class: "cache-reference-label",
      "text-anchor": "end",
    }, "100M reference")
  );

  cacheChart.append(
    createSvgElement("text", {
      x: margin.left + plotWidth / 2,
      y: height - 12,
      class: "cache-axis-title",
      "text-anchor": "middle",
    }, "Sequence length (powers of 2)"),
    createSvgElement("text", {
      x: 22,
      y: margin.top + plotHeight / 2,
      class: "cache-axis-title",
      "text-anchor": "middle",
      transform: `rotate(-90 22 ${margin.top + plotHeight / 2})`,
    }, "RoPE cache size")
  );

  cacheSeries.forEach((series) => {
    if (!activeFractions.has(series.fraction)) return;

    const group = createSvgElement("g");
    group.style.setProperty("--series-color", series.color);
    const pathData = cacheExponents.map((exponent, index) => {
      const x = xForExponent(exponent);
      const bytes = cacheSizeBytes(2 ** exponent, headDimension, series.fraction);
      const y = yForBytes(bytes);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(" ");
    group.append(createSvgElement("path", { d: pathData, class: "cache-series-line" }));

    cacheExponents.forEach((exponent) => {
      const sequenceLength = 2 ** exponent;
      const bytes = cacheSizeBytes(sequenceLength, headDimension, series.fraction);
      const point = createSvgElement("circle", {
        cx: xForExponent(exponent),
        cy: yForBytes(bytes),
        r: 3.2,
        class: "cache-series-point",
      });
      point.append(createSvgElement("title", {}, `${series.label}, 2^${exponent} tokens: ${formatCacheBytes(bytes)}`));
      group.append(point);
    });
    cacheChart.append(group);
  });

  const overlay = createSvgElement("rect", {
    x: margin.left,
    y: margin.top,
    width: plotWidth,
    height: plotHeight,
    fill: "transparent",
  });
  const hoverGroup = createSvgElement("g");
  hoverGroup.style.display = "none";
  cacheChart.append(overlay, hoverGroup);

  function showCachePoint(index) {
    cacheFocusIndex = Math.max(0, Math.min(cacheExponents.length - 1, index));
    const exponent = cacheExponents[cacheFocusIndex];
    const sequenceLength = 2 ** exponent;
    const x = xForExponent(exponent);
    hoverGroup.replaceChildren(createSvgElement("line", {
      x1: x,
      y1: margin.top,
      x2: x,
      y2: height - margin.bottom,
      class: "cache-hover-line",
    }));

    const rows = [];
    cacheSeries.forEach((series) => {
      if (!activeFractions.has(series.fraction)) return;
      const bytes = cacheSizeBytes(sequenceLength, headDimension, series.fraction);
      const point = createSvgElement("circle", {
        cx: x,
        cy: yForBytes(bytes),
        r: 5,
        class: "cache-hover-point",
      });
      point.style.setProperty("--series-color", series.color);
      hoverGroup.append(point);
      rows.push(`<span><span><i style="--tooltip-color: ${series.color}"></i>${series.label}</span><b>${formatCacheBytes(bytes)}</b></span>`);
    });

    hoverGroup.style.display = "block";
    cacheTooltip.innerHTML = `<strong>2^${exponent} tokens · ${formatSequencePower(exponent)}</strong>${rows.join("")}`;
    cacheTooltip.hidden = false;

    const chartRect = cacheChart.getBoundingClientRect();
    const wrapRect = cacheChart.parentElement.getBoundingClientRect();
    const rawLeft = chartRect.left - wrapRect.left + (x / width) * chartRect.width;
    cacheTooltip.style.left = `${Math.max(116, Math.min(wrapRect.width - 116, rawLeft))}px`;
    cacheTooltip.style.top = "150px";
  }

  function hideCachePoint() {
    hoverGroup.style.display = "none";
    cacheTooltip.hidden = true;
  }

  overlay.addEventListener("pointermove", (event) => {
    const rect = cacheChart.getBoundingClientRect();
    const pointerX = ((event.clientX - rect.left) / rect.width) * width;
    const rawIndex = ((pointerX - margin.left) / plotWidth) * (cacheExponents.length - 1);
    showCachePoint(Math.round(rawIndex));
  });
  overlay.addEventListener("pointerleave", hideCachePoint);
  cacheChart.onfocus = () => showCachePoint(cacheFocusIndex);
  cacheChart.onkeydown = (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    showCachePoint(cacheFocusIndex + (event.key === "ArrowRight" ? 1 : -1));
  };
  cacheChart.onblur = hideCachePoint;

  updateCacheSummary(headDimension);
}

cacheHeadSlider?.addEventListener("input", () => {
  const headDimension = selectedCacheHeadDimension();
  cacheHeadValue.textContent = String(headDimension);
  cacheHeadMeta.textContent = `${headDimension}-d head`;
  cacheHeadSlider.setAttribute("aria-valuetext", `${headDimension} dimensions`);
  renderCacheChart();
});

cacheLegendButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const isPressed = button.getAttribute("aria-pressed") === "true";
    button.setAttribute("aria-pressed", String(!isPressed));
    renderCacheChart();
  });
});

renderCacheChart();

copyButton?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(citation.textContent.trim());
    copyButton.textContent = "Copied";
    window.setTimeout(() => {
      copyButton.textContent = "Copy citation";
    }, 1800);
  } catch {
    copyButton.textContent = "Select below to copy";
  }
});
