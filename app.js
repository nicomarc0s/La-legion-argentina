const storageKey = "legionArgentinaNews";

function readNews() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function legacyParagraphs(text) {
  const parts = String(text)
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    return "<p></p>";
  }

  return parts
    .map((part) => `<p>${escapeHtml(part).replaceAll("\n", "<br>")}</p>`)
    .join("");
}

function sanitizeStyle(styleText) {
  const allowed = new Set([
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "text-decoration",
    "text-decoration-line"
  ]);

  return styleText
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const divider = entry.indexOf(":");
      if (divider === -1) return "";
      const property = entry.slice(0, divider).trim().toLowerCase();
      const value = entry.slice(divider + 1).trim();
      return allowed.has(property) ? `${property}: ${value}` : "";
    })
    .filter(Boolean)
    .join("; ");
}

function sanitizeSummaryHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html;

  const allowedTags = new Set([
    "P",
    "BR",
    "B",
    "STRONG",
    "I",
    "EM",
    "U",
    "UL",
    "OL",
    "LI",
    "SPAN",
    "DIV"
  ]);

  function cleanNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent || "");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return document.createDocumentFragment();
    }

    const tagName = node.tagName.toUpperCase();
    const normalizedTag = tagName === "DIV" ? "P" : tagName;

    if (!allowedTags.has(tagName)) {
      const fragment = document.createDocumentFragment();
      Array.from(node.childNodes).forEach((child) => {
        fragment.appendChild(cleanNode(child));
      });
      return fragment;
    }

    const element = document.createElement(normalizedTag.toLowerCase());
    const safeStyle = sanitizeStyle(node.getAttribute("style") || "");
    if (safeStyle) {
      element.setAttribute("style", safeStyle);
    }

    Array.from(node.childNodes).forEach((child) => {
      element.appendChild(cleanNode(child));
    });

    return element;
  }

  const wrapper = document.createElement("div");
  Array.from(template.content.childNodes).forEach((child) => {
    wrapper.appendChild(cleanNode(child));
  });

  return wrapper.innerHTML.trim();
}

function getSummaryHtml(item) {
  if (item.summaryHtml) {
    return sanitizeSummaryHtml(item.summaryHtml);
  }

  return legacyParagraphs(item.summary || "");
}

function renderItem(item) {
  const image = item.image
    ? `<img class="news-image" src="${item.image}" alt="${escapeHtml(item.title)}">`
    : "";

  return `
    <article class="news-item">
      ${image}
      <p class="card-label">${escapeHtml(item.category)}</p>
      <h4>${escapeHtml(item.title)}</h4>
      <div class="news-text">
        ${getSummaryHtml(item)}
      </div>
    </article>
  `;
}

function renderEmpty(category) {
  return `
    <article class="news-item placeholder-news">
      <p class="card-label">Sin publicaciones</p>
      <h4>Esta categoria todavia no tiene noticias</h4>
      <div class="news-text">
        <p>
          Cuando publiques una nota en ${escapeHtml(category)}, va a aparecer
          automaticamente en este bloque.
        </p>
      </div>
    </article>
  `;
}

function renderNewsByCategory() {
  const news = readNews();
  const containers = document.querySelectorAll(".news-list[data-category]");

  containers.forEach((container) => {
    const category = container.dataset.category;
    const items = news.filter((item) => item.category === category);

    container.innerHTML = items.length
      ? items.map(renderItem).join("")
      : renderEmpty(category);
  });
}

renderNewsByCategory();
