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

function formatParagraphs(text) {
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
        ${formatParagraphs(item.summary)}
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
