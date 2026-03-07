const dropZone = document.getElementById("dropZone");
const dropZoneIcon = document.getElementById("dropZoneIcon");
const dropZoneTitle = document.getElementById("dropZoneTitle");
const dropZoneSub = document.getElementById("dropZoneSub");
const fileInput = document.getElementById("fileInput");

const formatSelect = document.getElementById("formatSelect");
const qualitySlider = document.getElementById("qualitySlider");
const qualityValue = document.getElementById("qualityValue");
const maxWidthInput = document.getElementById("maxWidth");
const maxHeightInput = document.getElementById("maxHeight");

const keepMetadataInput = document.getElementById("keepMetadata");
const watermarkTextInput = document.getElementById("watermarkText");
const watermarkPositionInput = document.getElementById("watermarkPosition");
const watermarkColorInput = document.getElementById("watermarkColor");

const fileListContainer = document.getElementById("fileListContainer");
const fileList = document.getElementById("fileList");
const fileCount = document.getElementById("fileCount");

const convertBtn = document.getElementById("convertBtn");
const convertBtnText = document.getElementById("convertBtnText");
const clearAllBtn = document.getElementById("clearAllBtn");

const resultsContainer = document.getElementById("resultsContainer");
const resultsList = document.getElementById("resultsList");
const resultsSummary = document.getElementById("resultsSummary");
const downloadAllBtn = document.getElementById("downloadAllBtn");

const arsipResultsContainer = document.getElementById("arsipResultsContainer");
const arsipResultsList = document.getElementById("arsipResultsList");

const progressOverlay = document.getElementById("progressOverlay");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

const tabConverter = document.getElementById("tabConverter");
const tabArsip = document.getElementById("tabArsip");
const converterSettings = document.getElementById("converterSettings");
const arsipSettings = document.getElementById("arsipSettings");
const heroTitle = document.getElementById("heroTitle");
const heroDesc = document.getElementById("heroDesc");

const folderInput = document.getElementById("folderInput");
const arsipButtons = document.getElementById("arsipButtons");
const arsipHistoryContainer = document.getElementById("arsipHistoryContainer");
const arsipHistoryList = document.getElementById("arsipHistoryList");

let currentMode = "converter"; // 'converter' or 'arsip'
let selectedFiles = [];
let convertedResults = [];
let arsipResults = [];

// ============ TOAST NOTIFICATION ============
function showToast(message, type = "error") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  const bgClass =
    type === "error"
      ? "bg-red-500/90 border-red-500"
      : type === "warning"
        ? "bg-amber-500/90 border-amber-500"
        : "bg-brand-500/90 border-brand-500";
  const icon =
    type === "error"
      ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`
      : type === "warning"
        ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />`
        : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />`;

  toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-white text-sm font-medium border backdrop-blur-md transform transition-all translate-y-10 opacity-0 ${bgClass}`;
  toast.innerHTML = `
    <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
       ${icon}
    </svg>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove("translate-y-10", "opacity-0");
  });

  setTimeout(() => {
    toast.classList.add("translate-y-10", "opacity-0");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============ TABS / NAVIGATION ============
function switchMode(mode) {
  currentMode = mode;
  selectedFiles = [];
  convertedResults = [];
  arsipResults = [];

  localStorage.setItem("appMode", mode);
  // Update UI state
  renderFileList();
  resultsContainer.classList.add("hidden");
  arsipResultsContainer.classList.add("hidden");

  if (mode === "converter") {
    tabConverter.classList.add("bg-brand-500", "text-white", "shadow-lg");
    tabConverter.classList.remove("text-slate-400");
    tabArsip.classList.remove("bg-brand-500", "text-white", "shadow-lg");
    tabArsip.classList.add("text-slate-400");

    converterSettings.classList.remove("hidden");
    if (document.getElementById("converterAdvancedSettings")) {
      document
        .getElementById("converterAdvancedSettings")
        .classList.remove("hidden");
    }
    arsipSettings.classList.add("hidden");
    if (arsipButtons) arsipButtons.classList.add("hidden");

    heroTitle.textContent = "Convert & Compress";
    heroDesc.textContent =
      "Securely optimize your images without leaving your server. Convert into modern formats, resize, and bulk-download effortlessly.";

    dropZoneTitle.textContent = "Click to upload or drag and drop";
    dropZoneSub.textContent = "SVG, PNG, JPG, GIF, TIFF, WebP, AVIF";
    dropZoneIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>`;

    updateConvertBtnText();
  } else {
    tabArsip.classList.add("bg-brand-500", "text-white", "shadow-lg");
    tabArsip.classList.remove("text-slate-400");
    tabConverter.classList.remove("bg-brand-500", "text-white", "shadow-lg");
    tabConverter.classList.add("text-slate-400");

    converterSettings.classList.add("hidden");
    if (document.getElementById("converterAdvancedSettings")) {
      document
        .getElementById("converterAdvancedSettings")
        .classList.add("hidden");
    }
    arsipSettings.classList.remove("hidden");

    heroTitle.textContent = "Arsip (File Sharing)";
    heroDesc.textContent =
      "Upload any file and get a temporary shareable link. Files are automatically deleted after 24 hours.";

    dropZoneTitle.textContent = "Drop any file to share";
    dropZoneSub.textContent = "Maximum 100MB per file • 24h Expiry";
    dropZoneIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>`;

    if (arsipButtons) arsipButtons.classList.remove("hidden");
    if (typeof fetchArsipHistory === "function") fetchArsipHistory();

    convertBtnText.textContent = "Share to Arsip";
  }
}

tabConverter.addEventListener("click", () => switchMode("converter"));
tabArsip.addEventListener("click", () => switchMode("arsip"));

// ============ UI LOGIC ============
qualitySlider.addEventListener("input", () => {
  qualityValue.textContent = `${qualitySlider.value}%`;
});

const updateConvertBtnText = () => {
  if (currentMode !== "converter") return;
  const format =
    formatSelect.options[formatSelect.selectedIndex].text.split(" ")[0];
  convertBtnText.textContent = `Process to ${format}`;
};
formatSelect.addEventListener("change", updateConvertBtnText);

// ============ DRAG & DROP ============
const preventDefaults = (e) => {
  e.preventDefault();
  e.stopPropagation();
};

["dragenter", "dragover", "dragleave", "drop"].forEach((evt) => {
  dropZone.addEventListener(evt, preventDefaults);
});

dropZone.addEventListener("dragover", () =>
  dropZone.classList.add("drag-active"),
);
dropZone.addEventListener("dragleave", () =>
  dropZone.classList.remove("drag-active"),
);

dropZone.addEventListener("drop", (e) => {
  dropZone.classList.remove("drag-active");
  let files = Array.from(e.dataTransfer.files);
  if (currentMode === "converter") {
    const valid = files.filter((f) => f.type.startsWith("image/"));
    if (valid.length < files.length) {
      showToast(
        "Some files were ignored because they are not supported images.",
        "warning",
      );
    }
    files = valid;
  }
  addFiles(files);
});

dropZone.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  let files = Array.from(fileInput.files);
  if (currentMode === "converter") {
    const valid = files.filter((f) => f.type.startsWith("image/"));
    if (valid.length < files.length) {
      showToast(
        "Some files were ignored because they are not supported images.",
        "warning",
      );
    }
    files = valid;
  }
  addFiles(files);
  fileInput.value = "";
});

if (folderInput) {
  folderInput.addEventListener("change", () => {
    let files = Array.from(folderInput.files);
    addFiles(files);
    folderInput.value = "";
  });
}

// ============ FILE MANAGEMENT ============
function formatSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function addFiles(files) {
  files.forEach((file) => {
    if (
      !selectedFiles.find((f) => f.name === file.name && f.size === file.size)
    ) {
      selectedFiles.push(file);
    }
  });
  renderFileList();
}

window.removeFile = function (index) {
  selectedFiles.splice(index, 1);
  renderFileList();
};

function renderFileList() {
  if (selectedFiles.length === 0) {
    fileListContainer.classList.add("hidden");
    return;
  }

  fileListContainer.classList.remove("hidden");
  fileCount.textContent = selectedFiles.length;

  fileList.innerHTML = selectedFiles
    .map((file, i) => {
      let preview = "";
      if (file.type.startsWith("image/")) {
        preview = `<img src="${URL.createObjectURL(file)}" class="w-full h-full object-cover" />`;
      } else {
        preview = `<div class="w-full h-full flex items-center justify-center text-slate-500"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg></div>`;
      }

      return `
    <div class="flex items-center gap-3 p-3 hover:bg-slate-800/50 transition-colors group">
      <div class="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0">
        ${preview}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-slate-200 truncate">${file.name}</p>
        <p class="text-xs text-slate-500">${formatSize(file.size)} • ${file.type ? file.type.split("/")[1].toUpperCase() : "FILE"}</p>
      </div>
      <button onclick="removeFile(${i})" class="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none title="Remove">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
      </button>
    </div>
  `;
    })
    .join("");
}

clearAllBtn.addEventListener("click", () => {
  selectedFiles = [];
  resultsContainer.classList.add("hidden");
  arsipResultsContainer.classList.add("hidden");
  convertedResults = [];
  arsipResults = [];
  renderFileList();
});

// ============ API CALLS ============
convertBtn.addEventListener("click", async () => {
  if (selectedFiles.length === 0) return;

  if (currentMode === "converter") {
    await runConverter();
  } else {
    await runArsipUpload();
  }
});

async function runConverter() {
  const targetFormat = formatSelect.value;
  const quality = qualitySlider.value;
  const maxWidth = maxWidthInput.value;
  const maxHeight = maxHeightInput.value;

  progressOverlay.classList.remove("hidden");
  progressOverlay.classList.add("flex");
  progressBar.style.width = "0%";
  convertedResults = [];

  const total = selectedFiles.length;

  for (let i = 0; i < total; i++) {
    progressText.textContent = `Processing ${i + 1} of ${total}`;
    progressBar.style.width = `${((i + 1) / total) * 100}%`;

    const formData = new FormData();
    formData.append("image", selectedFiles[i]);
    formData.append("format", targetFormat);
    formData.append("quality", quality);
    formData.append("keepMetadata", keepMetadataInput.checked);
    formData.append("watermarkText", watermarkTextInput.value);
    formData.append("watermarkPosition", watermarkPositionInput.value);
    formData.append("watermarkColor", watermarkColorInput.value);
    if (maxWidth) formData.append("maxWidth", maxWidth);
    if (maxHeight) formData.append("maxHeight", maxHeight);

    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        convertedResults.push(data);
      } else {
        convertedResults.push({
          filename: selectedFiles[i].name,
          error: data.error,
        });
      }
    } catch (err) {
      convertedResults.push({
        filename: selectedFiles[i].name,
        error: err.message,
      });
    }
  }

  const successful = convertedResults.filter((r) => !r.error);
  if (successful.length > 0) {
    progressText.textContent = `Saving converted files to Arsip...`;

    try {
      const formData = new FormData();
      formData.append("expiryHours", "24");

      const d = new Date();
      const folderName =
        "Converted_" +
        d.getFullYear() +
        String(d.getMonth() + 1).padStart(2, "0") +
        String(d.getDate()).padStart(2, "0") +
        "_" +
        String(d.getHours()).padStart(2, "0") +
        String(d.getMinutes()).padStart(2, "0") +
        String(d.getSeconds()).padStart(2, "0");

      if (successful.length > 1) {
        formData.append("type", "folder");
        formData.append("folderName", folderName);
        const paths = [];
        for (const r of successful) {
          const mimeStr =
            r.format === "jpeg" ? "image/jpeg" : "image/" + r.format;
          const imgRes = await fetch("data:" + mimeStr + ";base64," + r.base64);
          const blob = await imgRes.blob();
          formData.append("files", blob, r.filename);
          paths.push(r.filename);
        }
        formData.append("paths", JSON.stringify(paths));
      } else {
        const r = successful[0];
        const mimeStr =
          r.format === "jpeg" ? "image/jpeg" : "image/" + r.format;
        const imgRes = await fetch("data:" + mimeStr + ";base64," + r.base64);
        const blob = await imgRes.blob();
        formData.append("type", "file");
        formData.append("files", blob, r.filename);
      }

      const arsipRes = await fetch("/api/arsip/upload", {
        method: "POST",
        body: formData,
      });
      const arsipData = await arsipRes.json();
      if (arsipData.success && typeof fetchArsipHistory === "function") {
        fetchArsipHistory(); // Refresh history list
      }
    } catch (e) {
      console.error("Failed to save converted files to Arsip:", e);
    }
  }

  progressOverlay.classList.add("hidden");
  progressOverlay.classList.remove("flex");
  renderResults();

  if (successful.length > 0) {
    showToast(
      `Successfully processed & archived ${successful.length} items`,
      "success",
    );
  } else {
    showToast("Conversion failed for all files", "error");
  }
}

async function runArsipUpload() {
  progressOverlay.classList.remove("hidden");
  progressOverlay.classList.add("flex");
  progressBar.style.width = "0%";
  arsipResults = [];

  const total = selectedFiles.length;
  progressText.textContent = `Uploading ${total} item(s)...`;
  progressBar.style.width = `50%`;

  const expireVal = document.getElementById("arsipExpiry")
    ? document.getElementById("arsipExpiry").value
    : "24";
  const passVal = document.getElementById("arsipPassword")
    ? document.getElementById("arsipPassword").value
    : "";

  const formData = new FormData();
  formData.append("expiryHours", expireVal);
  if (passVal) formData.append("password", passVal);

  const isFolderUpload =
    selectedFiles.some((f) => f.webkitRelativePath) || total > 1;

  if (isFolderUpload) {
    formData.append("type", "folder");
    const firstRel = selectedFiles.find((f) => f.webkitRelativePath);
    const folderName = firstRel
      ? firstRel.webkitRelativePath.split("/")[0]
      : "Uploaded_Folder";
    formData.append("folderName", folderName);

    const paths = [];
    selectedFiles.forEach((f) => {
      formData.append("files", f);
      paths.push(f.webkitRelativePath || f.name);
    });
    formData.append("paths", JSON.stringify(paths));
  } else {
    formData.append("type", "file");
    formData.append("files", selectedFiles[0]);
  }

  try {
    const res = await fetch("/api/arsip/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    progressBar.style.width = `100%`;
    if (data.success) {
      data.expireHoursStr = expireVal;
      data.hasPassword = !!passVal;
      arsipResults.push(data);
      if (typeof fetchArsipHistory === "function") fetchArsipHistory();
    } else {
      arsipResults.push({ originalName: "Upload", error: data.error });
    }
  } catch (err) {
    arsipResults.push({ originalName: "Upload", error: err.message });
  }

  setTimeout(() => {
    progressOverlay.classList.add("hidden");
    progressOverlay.classList.remove("flex");
    renderArsipResults();

    if (arsipResults.some((r) => !r.error)) {
      showToast("Arsip link successfully created!", "success");
    } else {
      showToast("Failed to upload to Arsip.", "error");
    }
  }, 500);
}

// ============ RENDER RESULTS ============
function renderResults() {
  resultsContainer.classList.remove("hidden");
  arsipResultsContainer.classList.add("hidden");

  const successful = convertedResults.filter((r) => !r.error);
  const totalOriginal = successful.reduce((a, r) => a + r.originalSize, 0);
  const totalConverted = successful.reduce((a, r) => a + r.convertedSize, 0);

  let savingsText = "";
  if (totalOriginal > totalConverted) {
    const p = Math.round((1 - totalConverted / totalOriginal) * 100);
    savingsText = `Saved ${formatSize(totalOriginal - totalConverted)} (${p}% smaller)`;
  } else if (totalConverted > totalOriginal) {
    savingsText = `Increased ${formatSize(totalConverted - totalOriginal)}`;
  } else {
    savingsText = "No size change";
  }

  resultsSummary.innerHTML = `Successfully processed <b>${successful.length} of ${convertedResults.length}</b> files. ${savingsText}`;

  resultsList.innerHTML = convertedResults
    .map((result, i) => {
      if (result.error) {
        return `
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-4 items-center">
          <div class="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center text-red-400">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-red-400 truncate">${result.filename}</p>
            <p class="text-xs text-slate-500 truncate">${result.error}</p>
          </div>
        </div>`;
      }

      const isSmaller = result.savings > 0;
      const badgeColor = isSmaller
        ? "text-emerald-400 bg-emerald-400/10"
        : "text-amber-400 bg-amber-400/10";
      const statArrow = isSmaller ? "↓" : "↑";
      const mimeStr =
        result.format === "jpeg" ? "image/jpeg" : `image/${result.format}`;

      return `
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-4 items-center hover:border-slate-700 transition-colors">
        <div class="w-12 h-12 bg-slate-800 rounded-lg overflow-hidden flex-shrink-0">
          <img src="data:${mimeStr};base64,${result.base64}" class="w-full h-full object-cover" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-slate-200 truncate">${result.filename}</p>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-xs text-slate-500">${formatSize(result.originalSize)} → ${formatSize(result.convertedSize)}</span>
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${badgeColor}">${statArrow} ${Math.abs(result.savings)}%</span>
          </div>
        </div>
        <div class="flex gap-2">
          <button onclick="shareToArsip(${i})" class="p-2 bg-slate-800 text-brand-400 hover:bg-brand-500 hover:text-white rounded-lg transition-colors focus:ring-2 focus:ring-brand-500" title="Share via Arsip">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
          </button>
          <button onclick="downloadSingle(${i})" class="p-2 bg-slate-800 text-slate-300 hover:bg-emerald-500 hover:text-white rounded-lg transition-colors focus:ring-2 focus:ring-emerald-500" title="Download">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          </button>
        </div>
      </div>`;
    })
    .join("");

  resultsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderArsipResults() {
  arsipResultsContainer.classList.remove("hidden");
  resultsContainer.classList.add("hidden");

  arsipResultsList.innerHTML = arsipResults
    .map((result, i) => {
      if (result.error) {
        return `
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-4 items-center">
          <div class="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center text-red-400">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-red-400 truncate">${result.originalName}</p>
            <p class="text-xs text-slate-500 truncate">${result.error}</p>
          </div>
        </div>`;
      }

      return `
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-brand-500/40 transition-all group">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-400">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
            </div>
            <div>
              <p class="text-sm font-bold text-slate-100">${result.originalName}</p>
              <p class="text-[10px] text-slate-500 font-medium">${formatSize(result.size)} • <span class="text-emerald-400">Exp: ${result.expireHoursStr ? result.expireHoursStr + "h" : "24h"}</span> ${result.hasPassword ? '• <span class="text-amber-400">🔒 Protected</span>' : ""}</p>
            </div>
          </div>
          <a href="${result.url}" target="_blank" class="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1">
            Test Link <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          </a>
        </div>
        
        <div class="relative group">
          <input readonly value="${result.url}" class="w-full bg-slate-950 border border-slate-800 text-brand-400 text-xs rounded-lg pl-3 pr-20 py-2.5 font-mono focus:outline-none">
          <button onclick="copyToClipboard('${result.url}', this)" class="absolute right-1 top-1 bottom-1 px-3 bg-brand-500 hover:bg-brand-400 text-white text-[10px] font-bold rounded-md transition-all active:scale-95">
            Copy Link
          </button>
        </div>
      </div>
    `;
    })
    .join("");

  arsipResultsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
}

window.copyToClipboard = function (text, btn) {
  navigator.clipboard.writeText(text);
  const originalText = btn.textContent;
  btn.textContent = "Copied!";
  btn.classList.replace("bg-brand-500", "bg-emerald-500");
  setTimeout(() => {
    btn.textContent = originalText;
    btn.classList.replace("bg-emerald-500", "bg-brand-500");
  }, 2000);
};

window.shareToArsip = function (index) {
  const result = convertedResults[index];
  if (!result || result.error) return;

  const mimeStr =
    result.format === "jpeg" ? "image/jpeg" : `image/${result.format}`;

  // Base64 to Blob
  const byteCharacters = atob(result.base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeStr });

  // Create a File object
  const newFile = new File([blob], result.filename, { type: mimeStr });

  // Switch to Arsip mode and add the file
  switchMode("arsip");

  // Automatically start upload
  selectedFiles = [newFile];
  renderFileList();
  runArsipUpload();
};

window.downloadSingle = function (index) {
  const result = convertedResults[index];
  if (!result || result.error) return;
  const mimeStr =
    result.format === "jpeg" ? "image/jpeg" : `image/${result.format}`;
  const link = document.createElement("a");
  link.href = `data:${mimeStr};base64,${result.base64}`;
  link.download = result.filename;
  link.click();
};

downloadAllBtn.addEventListener("click", async () => {
  if (selectedFiles.length === 0) return;

  const originalHtml = downloadAllBtn.innerHTML;
  downloadAllBtn.disabled = true;
  downloadAllBtn.innerHTML = `
    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
    Zipping...
  `;

  const targetFormat = formatSelect.value;
  const formData = new FormData();
  selectedFiles.forEach((f) => formData.append("images", f));
  formData.append("format", targetFormat);
  formData.append("quality", qualitySlider.value);
  formData.append("keepMetadata", keepMetadataInput.checked);
  formData.append("watermarkText", watermarkTextInput.value);
  formData.append("watermarkPosition", watermarkPositionInput.value);
  formData.append("watermarkColor", watermarkColorInput.value);
  if (maxWidthInput.value) formData.append("maxWidth", maxWidthInput.value);
  if (maxHeightInput.value) formData.append("maxHeight", maxHeightInput.value);

  try {
    const res = await fetch("/api/convert-bulk", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Server error during zip creation.");

    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `images-${targetFormat}-converted.zip`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    downloadAllBtn.disabled = false;
    downloadAllBtn.innerHTML = originalHtml;
  }
});

// Paste support
document.addEventListener("paste", (e) => {
  if (e.clipboardData && e.clipboardData.items) {
    const items = Array.from(e.clipboardData.items);
    let files = [];
    if (currentMode === "converter") {
      const valid = items
        .filter((i) => i.type.startsWith("image/"))
        .map((i) => i.getAsFile());
      if (valid.length < items.length) {
        showToast(
          "Some pasted items were ignored because they are not images.",
          "warning",
        );
      }
      files = valid;
    } else {
      files = items.map((i) => i.getAsFile()).filter((f) => f !== null);
    }
    if (files.length > 0) addFiles(files);
  }
});

// Init
window.fetchArsipHistory = async function () {
  if (!arsipHistoryList) return;

  try {
    arsipHistoryList.innerHTML = `<p class="col-span-full text-slate-500 text-center py-4 text-xs">Loading history...</p>`;
    const res = await fetch("/api/arsip/history");
    const data = await res.json();
    if (data.success && data.files) {
      const dbFilesInfo = Object.values(data.files).sort(
        (a, b) => b.uploadDate - a.uploadDate,
      );
      if (dbFilesInfo.length === 0) {
        arsipHistoryList.innerHTML = `<p class="col-span-full text-slate-500 text-center py-4 text-xs">No share history found or all links have expired.</p>`;
        return;
      }
      arsipHistoryList.innerHTML = dbFilesInfo
        .map((f) => {
          const isFolder = f.type === "folder";
          const iconHtml = isFolder
            ? `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>`
            : `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>`;
          const iconBgClass = isFolder
            ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
            : "bg-blue-500/10 text-blue-400 border border-blue-500/20";

          const expDateStr = new Date(f.expiryDate).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          return `
           <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-brand-500/40 hover:bg-slate-800/40 transition-all duration-300 relative group shadow-lg">
              <div class="absolute -top-3 -right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                <button onclick="openEditModal('${f.id}')" class="bg-blue-600 text-white rounded-full p-2 hover:bg-blue-500 shadow-xl hover:scale-110 transition-transform" title="Edit Options">
                   <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                </button>
                <button onclick="deleteArsip('${f.id}')" class="bg-red-500 text-white rounded-full p-2 hover:bg-red-400 shadow-xl hover:scale-110 transition-transform" title="Delete Option">
                   <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <div class="flex items-start justify-between mb-4 gap-3">
                 <div class="flex gap-3 min-w-0 flex-1">
                    <div class="w-10 h-10 rounded-xl ${iconBgClass} flex items-center justify-center flex-shrink-0 shadow-inner">
                       ${iconHtml}
                    </div>
                    <div class="min-w-0 flex-1 pr-2 space-y-0.5">
                       <p class="text-sm font-bold text-slate-200 truncate block" title="${f.name}">${f.name}</p>
                       <div class="flex items-center gap-1.5 flex-wrap">
                         <p class="text-[11px] text-slate-500 font-medium">${formatSize(f.size)}</p>
                         ${f.hasPassword ? '<span class="text-amber-400 flex inline-flex items-center gap-1 text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg> Protected</span>' : ""}
                       </div>
                       <p class="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 inline-block px-1.5 py-0.5 rounded uppercase tracking-wider mt-1 border border-emerald-500/20 shadow-sm">Exp: ${expDateStr}</p>
                    </div>
                 </div>
                 <a href="${f.url}" target="_blank" class="text-xs font-bold bg-slate-800 hover:bg-brand-500 px-4 py-2 rounded-xl text-white transition-all border border-slate-700 shadow-md hover:shadow-brand-500/30 flex-shrink-0 active:scale-95">Open</a>
              </div>
              <div class="relative group mt-auto">
                 <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <svg class="h-4 w-4 text-slate-500 group-hover:text-brand-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                 </div>
                 <input readonly value="${f.url}" class="w-full bg-slate-950/50 border border-slate-800 text-slate-400 text-xs rounded-xl p-3 pt-3 pb-3 pl-9 pr-20 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all cursor-text font-mono truncate shadow-inner">
                 <button onclick="copyToClipboard('${f.url}', this)" class="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-brand-500 hover:bg-brand-400 text-white text-[11px] font-bold rounded-lg transition-all shadow-md active:scale-95">Copy</button>
              </div>
           </div>
         `;
        })
        .join("");
    }
  } catch (e) {
    console.error("History load error", e);
    arsipHistoryList.innerHTML = `<p class="col-span-full text-red-500 text-center py-4 text-xs">Error loading history.</p>`;
  }
};

window.deleteArsip = async function (id) {
  if (!confirm("Are you sure you want to delete this shared item?")) return;
  try {
    const res = await fetch(`/api/arsip/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast("Arsip item deleted.", "success");
      fetchArsipHistory();
    } else {
      showToast(data.error || "Failed to delete.", "error");
    }
  } catch (e) {
    showToast("Delete error.", "error");
  }
};

let currentEditId = null;
const editModal = document.getElementById("editArsipModal");

window.openEditModal = function (id) {
  currentEditId = id;
  if (editModal) {
    editModal.classList.remove("hidden");
    editModal.classList.add("flex");
  }
};

window.closeEditModal = function () {
  currentEditId = null;
  if (editModal) {
    editModal.classList.add("hidden");
    editModal.classList.remove("flex");
  }
  document.getElementById("editArsipExpiry").value = "24";
  document.getElementById("editArsipPassword").value = "";
};

const saveEditBtn = document.getElementById("saveEditArsipBtn");
if (saveEditBtn) {
  saveEditBtn.addEventListener("click", async () => {
    if (!currentEditId) return;

    const expObj = document.getElementById("editArsipExpiry");
    const pwdObj = document.getElementById("editArsipPassword");

    const payload = {};
    if (expObj.value.trim() !== "")
      payload.expiryHours = parseFloat(expObj.value);
    if (pwdObj.value !== "") payload.password = pwdObj.value; // If they want to remove password, we can say if space entered, but for now strict empty means ignored in UI unless logic is updated. We'll update the server payload logic.
    // Actually our UI prompt says "Leave empty to remove password" ??? Wait.
    // Let's explicitly pass the empty password string if they touched it, otherwise undefined.
    // To support "Leave empty to remove password", we can just pass the value no matter what.
    payload.password = pwdObj.value;

    try {
      saveEditBtn.textContent = "Updating...";
      const res = await fetch(`/api/arsip/${currentEditId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Settings updated successfully!", "success");
        closeEditModal();
        fetchArsipHistory();
      } else {
        showToast(data.error || "Update failed.", "error");
      }
    } catch (e) {
      showToast("Update error.", "error");
    } finally {
      saveEditBtn.textContent = "Update Settings";
    }
  });
}

updateConvertBtnText();

document.addEventListener("DOMContentLoaded", () => {
  const savedMode = localStorage.getItem("appMode");
  if (savedMode) {
    switchMode(savedMode);
  } else {
    switchMode("converter");
  }

  if (typeof fetchArsipHistory === "function") {
    fetchArsipHistory();
  }
});
