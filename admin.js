const publicNewsFile = "news.json";
const legacyStorageKey = "legionArgentinaNews";
const sessionKey = "legionArgentinaAdminOpen";
const adminPassword = "Legion2026";

const loginForm = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");
const editorBox = document.getElementById("editor-box");
const newsForm = document.getElementById("news-form");
const newsStatus = document.getElementById("news-status");
const savedNewsList = document.getElementById("saved-news-list");
const logoutButton = document.getElementById("logout-button");
const editorModeStatus = document.getElementById("editor-mode-status");
const publishStatus = document.getElementById("publish-status");
const newsImageInput = document.getElementById("news-image");
const imagePreviewBox = document.getElementById("image-preview-box");
const imagePreview = document.getElementById("image-preview");
const summaryEditor = document.getElementById("news-summary-editor");
const summaryHtmlInput = document.getElementById("news-summary-html");
const fontFamilySelect = document.getElementById("news-font-family");
const fontSizeSelect = document.getElementById("news-font-size");
const submitNewsButton = document.getElementById("submit-news-button");
const cancelEditButton = document.getElementById("cancel-edit-button");
const downloadJsonButton = document.getElementById("download-json-button");
const reloadNewsButton = document.getElementById("reload-news-button");

let selectedImage = "";
let editingIndex = null;
let workingNews = [];

function readLegacyNews() {
  try {
    const raw = localStorage.getItem(legacyStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

async function loadPublicNews() {
  try {
    const response = await fetch(`${publicNewsFile}?v=${Date.now()}`, {
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error("No se pudo cargar news.json");
    }
    const parsed = await response.json();
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return readLegacyNews();
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

function slugify(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildNewsItem(category, title, summaryText, summaryHtml, image, currentId) {
  return {
    id: currentId || `${slugify(title)}-${Date.now()}`,
    category,
    title,
    summary: summaryText,
    summaryHtml,
    image
  };
}

function renderSavedNews() {
  if (!workingNews.length) {
    savedNewsList.innerHTML = `
      <article class="saved-item">
        <p class="card-label">Todavia no hay noticias</p>
        <h3>Tu primera publicacion aparecera aca</h3>
      </article>
    `;
    return;
  }

  savedNewsList.innerHTML = workingNews
    .map(
      (item, index) => `
        <article class="saved-item">
          ${item.image ? `<img class="news-image" src="${item.image}" alt="${escapeHtml(item.title)}">` : ""}
          <p class="card-label">${escapeHtml(item.category)}</p>
          <h3>${escapeHtml(item.title)}</h3>
          <div class="news-text">
            ${getSummaryHtml(item)}
          </div>
          <div class="saved-actions">
            <button type="button" class="edit-button" data-index="${index}">
              Editar
            </button>
            <button type="button" class="delete-button" data-index="${index}">
              Eliminar
            </button>
          </div>
        </article>
      `
    )
    .join("");

  document.querySelectorAll(".edit-button").forEach((button) => {
    button.addEventListener("click", () => {
      startEditing(Number(button.dataset.index));
    });
  });

  document.querySelectorAll(".delete-button").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      workingNews = workingNews.filter((_, itemIndex) => itemIndex !== index);
      if (editingIndex === index) {
        resetEditor();
        resetEditMode();
      } else if (editingIndex !== null && index < editingIndex) {
        editingIndex -= 1;
      }
      renderSavedNews();
      newsStatus.textContent = "La noticia fue eliminada del archivo en edicion.";
      publishStatus.textContent =
        "Descarga el nuevo news.json y subilo a GitHub para reflejar este cambio.";
    });
  });
}

function openEditor() {
  sessionStorage.setItem(sessionKey, "open");
  loginForm.classList.add("hidden");
  editorBox.classList.remove("hidden");
  renderSavedNews();
}

function resetEditor() {
  newsForm.reset();
  selectedImage = "";
  imagePreviewBox.classList.add("hidden");
  imagePreview.removeAttribute("src");
  summaryEditor.innerHTML = "";
  summaryHtmlInput.value = "";
  fontFamilySelect.value = "";
  fontSizeSelect.value = "";
}

function resetEditMode() {
  editingIndex = null;
  submitNewsButton.textContent = "Agregar al archivo";
  cancelEditButton.classList.add("hidden");
  editorModeStatus.textContent = "";
}

function closeEditor() {
  sessionStorage.removeItem(sessionKey);
  editorBox.classList.add("hidden");
  loginForm.classList.remove("hidden");
  loginForm.reset();
  resetEditor();
  resetEditMode();
  if (loginStatus) loginStatus.textContent = "";
}

function updateSummaryValue() {
  summaryHtmlInput.value = sanitizeSummaryHtml(summaryEditor.innerHTML);
}

function resetImagePreview() {
  selectedImage = "";
  imagePreviewBox.classList.add("hidden");
  imagePreview.removeAttribute("src");
}

function runEditorCommand(command, value = null) {
  summaryEditor.focus();
  document.execCommand("styleWithCSS", false, true);
  document.execCommand(command, false, value);
  updateSummaryValue();
}

function setEditorImage(image) {
  selectedImage = image || "";
  if (selectedImage) {
    imagePreview.src = selectedImage;
    imagePreviewBox.classList.remove("hidden");
    return;
  }
  imagePreviewBox.classList.add("hidden");
  imagePreview.removeAttribute("src");
}

function startEditing(index) {
  const item = workingNews[index];
  if (!item) return;

  editingIndex = index;
  document.getElementById("news-category").value = item.category || "";
  document.getElementById("news-title").value = item.title || "";
  summaryEditor.innerHTML = getSummaryHtml(item);
  updateSummaryValue();
  setEditorImage(item.image || "");
  submitNewsButton.textContent = "Guardar en el archivo";
  cancelEditButton.classList.remove("hidden");
  editorModeStatus.textContent = `Editando: ${item.title}`;
  newsStatus.textContent = "";
  editorBox.scrollIntoView({ behavior: "smooth", block: "start" });
}

function downloadNewsJson() {
  const blob = new Blob([JSON.stringify(workingNews, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "news.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  publishStatus.textContent =
    "Se descargo news.json. Ahora subilo a GitHub para publicar los cambios.";
}

async function reloadFromFile() {
  workingNews = await loadPublicNews();
  renderSavedNews();
  resetEditor();
  resetEditMode();
  publishStatus.textContent = "Se recargo el contenido desde news.json.";
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

summaryEditor.addEventListener("input", updateSummaryValue);

document.querySelectorAll(".tool-button").forEach((button) => {
  button.addEventListener("click", () => {
    runEditorCommand(button.dataset.command);
  });
});

fontFamilySelect.addEventListener("change", () => {
  if (fontFamilySelect.value) {
    runEditorCommand("fontName", fontFamilySelect.value);
  }
});

fontSizeSelect.addEventListener("change", () => {
  if (fontSizeSelect.value) {
    runEditorCommand("fontSize", fontSizeSelect.value);
  }
});

newsForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const category = document.getElementById("news-category").value.trim();
  const title = document.getElementById("news-title").value.trim();
  const summaryHtml = sanitizeSummaryHtml(summaryEditor.innerHTML);
  const summaryText = summaryEditor.innerText.trim();

  if (!category || !title || !summaryText) {
    newsStatus.textContent = "Completa categoria, titulo y resumen antes de guardar.";
    return;
  }

  const currentId =
    editingIndex !== null && workingNews[editingIndex]
      ? workingNews[editingIndex].id
      : "";
  const item = buildNewsItem(
    category,
    title,
    summaryText,
    summaryHtml,
    selectedImage,
    currentId
  );

  const wasEditing = editingIndex !== null;

  if (wasEditing) {
    workingNews[editingIndex] = item;
  } else {
    workingNews.unshift(item);
  }

  resetEditor();
  resetEditMode();
  renderSavedNews();
  newsStatus.textContent = wasEditing
    ? "La noticia fue actualizada en el archivo en edicion."
    : "La noticia fue agregada al archivo en edicion.";
  publishStatus.textContent =
    "Descarga el nuevo news.json y subilo a GitHub para publicarlo.";
});

logoutButton.addEventListener("click", closeEditor);
cancelEditButton.addEventListener("click", () => {
  resetEditor();
  resetEditMode();
  newsStatus.textContent = "Edicion cancelada.";
});
downloadJsonButton.addEventListener("click", downloadNewsJson);
reloadNewsButton.addEventListener("click", reloadFromFile);

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

async function initAdmin() {
  workingNews = await loadPublicNews();
  renderSavedNews();
  if (readLegacyNews().length) {
    publishStatus.textContent =
      "Se detectaron noticias viejas guardadas en este navegador. Ahora el sitio publica desde news.json.";
  }
}

initAdmin();

if (sessionStorage.getItem(sessionKey) === "open") {
  openEditor();
}
