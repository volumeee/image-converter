const dropZone = document.getElementById("dropZone");
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

const progressOverlay = document.getElementById("progressOverlay");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

let selectedFiles = [];
let convertedResults = [];

// ============ UI LOGIC ============
qualitySlider.addEventListener("input", () => {
  qualityValue.textContent = `${qualitySlider.value}%`;
});

const updateConvertBtnText = () => {
  const format = formatSelect.options[formatSelect.selectedIndex].text.split(" ")[0];
  convertBtnText.textContent = `Process to ${format}`;
};
formatSelect.addEventListener("change", updateConvertBtnText);

// ============ DRAG & DROP ============
const preventDefaults = (e) => {
  e.preventDefault();
  e.stopPropagation();
};

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
  dropZone.addEventListener(evt, preventDefaults);
});

dropZone.addEventListener("dragover", () => dropZone.classList.add("drag-active"));
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-active"));

dropZone.addEventListener("drop", (e) => {
  dropZone.classList.remove("drag-active");
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
  addFiles(files);
});

dropZone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  addFiles(Array.from(fileInput.files));
  fileInput.value = "";
});

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
    if (!selectedFiles.find(f => f.name === file.name && f.size === file.size)) {
      selectedFiles.push(file);
    }
  });
  renderFileList();
}

window.removeFile = function(index) {
  selectedFiles.splice(index, 1);
  renderFileList();
}

function renderFileList() {
  if (selectedFiles.length === 0) {
    fileListContainer.classList.add("hidden");
    return;
  }
  
  fileListContainer.classList.remove("hidden");
  fileCount.textContent = selectedFiles.length;

  fileList.innerHTML = selectedFiles.map((file, i) => `
    <div class="flex items-center gap-3 p-3 hover:bg-slate-800/50 transition-colors group">
      <div class="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0">
        <img src="${URL.createObjectURL(file)}" class="w-full h-full object-cover" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-slate-200 truncate">${file.name}</p>
        <p class="text-xs text-slate-500">${formatSize(file.size)} • ${file.type.split("/")[1].toUpperCase()}</p>
      </div>
      <button onclick="removeFile(${i})" class="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none title="Remove">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
      </button>
    </div>
  `).join("");
}

clearAllBtn.addEventListener("click", () => {
  selectedFiles = [];
  resultsContainer.classList.add("hidden");
  convertedResults = [];
  renderFileList();
});

// ============ API CALLS ============
convertBtn.addEventListener("click", async () => {
  if (selectedFiles.length === 0) return;

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
      const res = await fetch("/api/convert", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        convertedResults.push(data);
      } else {
        convertedResults.push({ filename: selectedFiles[i].name, error: data.error });
      }
    } catch (err) {
      convertedResults.push({ filename: selectedFiles[i].name, error: err.message });
    }
  }

  progressOverlay.classList.add("hidden");
  progressOverlay.classList.remove("flex");
  renderResults();
});

// ============ RENDER RESULTS ============
function renderResults() {
  resultsContainer.classList.remove("hidden");

  const successful = convertedResults.filter((r) => !r.error);
  const totalOriginal = successful.reduce((a, r) => a + r.originalSize, 0);
  const totalConverted = successful.reduce((a, r) => a + r.convertedSize, 0);
  
  let savingsText = "";
  if (totalOriginal > totalConverted) {
    const p = Math.round((1 - totalConverted/totalOriginal)*100);
    savingsText = `Saved ${formatSize(totalOriginal - totalConverted)} (${p}% smaller)`;
  } else if (totalConverted > totalOriginal) {
    savingsText = `Increased ${formatSize(totalConverted - totalOriginal)}`;
  } else {
    savingsText = "No size change";
  }

  resultsSummary.innerHTML = `Successfully processed <b>${successful.length} of ${convertedResults.length}</b> files. ${savingsText}`;

  resultsList.innerHTML = convertedResults.map((result, i) => {
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
    const badgeColor = isSmaller ? "text-emerald-400 bg-emerald-400/10" : "text-amber-400 bg-amber-400/10";
    const statArrow = isSmaller ? "↓" : "↑";
    const mimeStr = result.format === 'jpeg' ? 'image/jpeg' : `image/${result.format}`;

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
        <button onclick="downloadSingle(${i})" class="p-2 bg-slate-800 text-slate-300 hover:bg-brand-500 hover:text-white rounded-lg transition-colors focus:ring-2 focus:ring-brand-500" title="Download">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
        </button>
      </div>`;
  }).join("");

  resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

window.downloadSingle = function(index) {
  const result = convertedResults[index];
  if (!result || result.error) return;
  const mimeStr = result.format === 'jpeg' ? 'image/jpeg' : `image/${result.format}`;
  const link = document.createElement("a");
  link.href = `data:${mimeStr};base64,${result.base64}`;
  link.download = result.filename;
  link.click();
}

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
  selectedFiles.forEach(f => formData.append("images", f));
  formData.append("format", targetFormat);
  formData.append("quality", qualitySlider.value);
  formData.append("keepMetadata", keepMetadataInput.checked);
  formData.append("watermarkText", watermarkTextInput.value);
  formData.append("watermarkPosition", watermarkPositionInput.value);
  formData.append("watermarkColor", watermarkColorInput.value);
  if (maxWidthInput.value) formData.append("maxWidth", maxWidthInput.value);
  if (maxHeightInput.value) formData.append("maxHeight", maxHeightInput.value);

  try {
    const res = await fetch("/api/convert-bulk", { method: "POST", body: formData });
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
    const files = items.filter(i => i.type.startsWith("image/")).map(i => i.getAsFile());
    if (files.length > 0) addFiles(files);
  }
});

// Init
updateConvertBtnText();
