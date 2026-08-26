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
