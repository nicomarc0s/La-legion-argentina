const storageKey = "legionArgentinaNews";
const sessionKey = "legionArgentinaAdminOpen";
const adminPassword = "Legion2026";

const loginForm = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");
const editorBox = document.getElementById("editor-box");
const newsForm = document.getElementById("news-form");
const newsStatus = document.getElementById("news-status");
const savedNewsList = document.getElementById("saved-news-list");
const logoutButton = document.getElementById("logout-button");
const newsImageInput = document.getElementById("news-image");
const imagePreviewBox = document.getElementById("image-preview-box");
const imagePreview = document.getElementById("image-preview");
let selectedImage = "";

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

function writeNews(news) {
  localStorage.setItem(storageKey, JSON.stringify(news));
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

function renderSavedNews() {
  const news = readNews();

  if (!news.length) {
    savedNewsList.innerHTML = `
      <article class="saved-item">
        <p class="card-label">Todavia no hay noticias</p>
        <h3>Tu primera publicacion aparecera aca</h3>
      </article>
    `;
    return;
  }

  savedNewsList.innerHTML = news
    .map(
      (item, index) => `
        <article class="saved-item">
          ${item.image ? `<img class="news-image" src="${item.image}" alt="${escapeHtml(item.title)}">` : ""}
          <p class="card-label">${escapeHtml(item.category)}</p>
          <h3>${escapeHtml(item.title)}</h3>
          <div class="news-text">
            ${formatParagraphs(item.summary)}
          </div>
          <button type="button" class="delete-button" data-index="${index}">
            Eliminar
          </button>
        </article>
      `
    )
    .join("");

  document.querySelectorAll(".delete-button").forEach((button) => {
    button.addEventListener("click", () => {
      const current = readNews();
      const next = current.filter(
        (_, itemIndex) => itemIndex !== Number(button.dataset.index)
      );
      writeNews(next);
      renderSavedNews();
      newsStatus.textContent = "La noticia fue eliminada.";
    });
  });
}

function openEditor() {
  sessionStorage.setItem(sessionKey, "open");
  loginForm.classList.add("hidden");
  editorBox.classList.remove("hidden");
  renderSavedNews();
}

function closeEditor() {
  sessionStorage.removeItem(sessionKey);
  editorBox.classList.add("hidden");
  loginForm.classList.remove("hidden");
  loginForm.reset();
  selectedImage = "";
  imagePreviewBox.classList.add("hidden");
  imagePreview.removeAttribute("src");
  if (loginStatus) loginStatus.textContent = "";
}

function resetImagePreview() {
  selectedImage = "";
  imagePreviewBox.classList.add("hidden");
  imagePreview.removeAttribute("src");
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const enteredPassword = document.getElementById("admin-password").value;

  if (enteredPassword === adminPassword) {
    loginStatus.textContent = "";
    openEditor();
    return;
  }

  loginStatus.textContent = "La clave no es correcta.";
});

newsForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const category = document.getElementById("news-category").value.trim();
  const title = document.getElementById("news-title").value.trim();
  const summary = document.getElementById("news-summary").value.trim();

  if (!category || !title || !summary) {
    newsStatus.textContent = "Completa todos los campos antes de publicar.";
    return;
  }

  const news = readNews();
  news.unshift({ category, title, summary, image: selectedImage });
  writeNews(news);
  newsForm.reset();
  resetImagePreview();
  newsStatus.textContent = "La noticia fue publicada en el inicio.";
  renderSavedNews();
});

logoutButton.addEventListener("click", closeEditor);

newsImageInput.addEventListener("change", () => {
  const file = newsImageInput.files && newsImageInput.files[0];

  if (!file) {
    resetImagePreview();
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    selectedImage = typeof reader.result === "string" ? reader.result : "";
    if (!selectedImage) {
      resetImagePreview();
      return;
    }
    imagePreview.src = selectedImage;
    imagePreviewBox.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
});

if (sessionStorage.getItem(sessionKey) === "open") {
  openEditor();
}
