const blockcodes = document.querySelectorAll(".chroma code[data-lang]");

for (const bc of blockcodes) {
  const parent = bc.parentElement;
  const content = bc.innerText.split("\n").filter(Boolean).join("\n");

  // Code title
  const title = document.createElement("div");
  const lang = bc.dataset.lang;
  title.classList.add("code-title");
  title.innerText = lang;

  // Copy to clipboard
  if (navigator.clipboard !== undefined) {
    const cpbutton = document.createElement("button");
    cpbutton.classList.add("copy-button");
    cpbutton.innerText = "Copy";

    cpbutton.addEventListener("click", () => {
      cpbutton.innerText = "Copied";
      setTimeout(() => {
        cpbutton.innerText = "Copy";
      }, 1000);

      navigator.clipboard.writeText(content);
    });

    title.append(cpbutton);
  }

  parent.closest(".highlight").prepend(title);
}

const tagLinks = document.querySelectorAll(".post-tags a");

tagLinks.forEach((link, index) => {
  const tooltip = link.querySelector(".tag-tooltip");
  if (!tooltip) return;

  tooltip.id = `tag-tooltip-${index}`;
  tooltip.setAttribute("aria-hidden", "true");
  link.setAttribute("aria-describedby", tooltip.id);

  const hideTooltip = () => {
    link.classList.remove("is-tooltip-visible");
    tooltip.setAttribute("aria-hidden", "true");
  };

  const showTooltipAt = (x, y) => {
    link.classList.add("is-tooltip-visible");
    tooltip.setAttribute("aria-hidden", "false");

    const margin = 10;
    const gap = 14;
    const left = Math.max(margin, Math.min(x + gap, window.innerWidth - tooltip.offsetWidth - margin));
    let top = y + gap;

    if (top + tooltip.offsetHeight > window.innerHeight - margin) {
      top = y - tooltip.offsetHeight - gap;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${Math.max(margin, top)}px`;
  };

  link.addEventListener("pointerenter", event => showTooltipAt(event.clientX, event.clientY));
  link.addEventListener("pointermove", event => showTooltipAt(event.clientX, event.clientY));
  link.addEventListener("pointerleave", hideTooltip);
  link.addEventListener("focus", () => {
    const bounds = link.getBoundingClientRect();
    showTooltipAt(bounds.left, bounds.bottom);
  });
  link.addEventListener("blur", hideTooltip);
});

const themeToggle = document.querySelector(".theme-toggle");

if (themeToggle) {
  const root = document.documentElement;

  const updateThemeToggle = () => {
    const darkMode = root.dataset.theme === "dark";
    const label = darkMode ? "切换到浅色模式" : "切换到深色模式";
    themeToggle.textContent = darkMode ? "☀" : "☽";
    themeToggle.setAttribute("aria-label", label);
    themeToggle.setAttribute("title", label);
    themeToggle.setAttribute("aria-pressed", String(darkMode));
  };

  updateThemeToggle();
  themeToggle.addEventListener("click", () => {
    const darkMode = root.dataset.theme !== "dark";
    root.dataset.theme = darkMode ? "dark" : "light";

    try {
      localStorage.setItem("aya-theme", darkMode ? "dark" : "light");
    } catch (error) {}

    updateThemeToggle();
  });
}
