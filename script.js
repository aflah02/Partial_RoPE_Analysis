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
