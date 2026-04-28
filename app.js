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

function renderItem(item) {
  const image = item.image
    ? `<img class="news-image" src="${item.image}" alt="${item.title}">`
    : "";

  return `
    <article class="news-item">
      ${image}
      <p class="card-label">${item.category}</p>
      <h4>${item.title}</h4>
      <p>${item.summary}</p>
    </article>
  `;
}

function renderEmpty(category) {
  return `
    <article class="news-item placeholder-news">
      <p class="card-label">Sin publicaciones</p>
      <h4>Esta categoria todavia no tiene noticias</h4>
      <p>
        Cuando publiques una nota en ${category}, va a aparecer automaticamente
        en este bloque.
      </p>
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
