const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const archiver = require("archiver");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3456;

// Ensure upload/output/arsip directories exist
const UPLOAD_DIR = path.join(__dirname, "uploads");
const OUTPUT_DIR = path.join(__dirname, "output");
const ARSIP_DIR = path.join(__dirname, "arsip");
const ARSIP_DATA_FILE = path.join(ARSIP_DIR, "db.json");

[UPLOAD_DIR, OUTPUT_DIR, ARSIP_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Initialize Arsip DB
if (!fs.existsSync(ARSIP_DATA_FILE)) {
  fs.writeFileSync(ARSIP_DATA_FILE, JSON.stringify({ files: {} }));
}

function getArsipDB() {
  try {
    return JSON.parse(fs.readFileSync(ARSIP_DATA_FILE, "utf8"));
  } catch (e) {
    return { files: {} };
  }
}

function saveArsipDB(data) {
  fs.writeFileSync(ARSIP_DATA_FILE, JSON.stringify(data, null, 2));
}

// Multer config
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // Increase to 100MB for general files
  fileFilter: (req, file, cb) => {
    // For general API, we allow most things, but specifically for image convert we filter in the route
    cb(null, true);
  },
});

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const SUPPORTED_FORMATS = ["webp", "jpeg", "png", "avif", "tiff", "gif"];

function processImage(pipeline, format, quality) {
  const options = {};
  if (["jpeg", "webp", "avif", "tiff"].includes(format)) {
    options.quality = quality;
  }
  return pipeline.toFormat(format, options);
}

function getGravity(position) {
  const map = {
    "bottom-right": "southeast",
    "bottom-left": "southwest",
    "top-right": "northeast",
    "top-left": "northwest",
    center: "center",
  };
  return map[position] || "southeast";
}

function createWatermarkBuffer(text, color, imgWidth) {
  const fontSize = Math.max(14, Math.floor(imgWidth / 25));
  const svgWidth = text.length * (fontSize * 0.7) + 40;
  const svgHeight = fontSize + 40;

  const shadowColor =
    color === "white" ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.6)";

  return Buffer.from(`
    <svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .txt { fill: ${color}; font-size: ${fontSize}px; font-family: sans-serif; font-weight: bold; }
        .shadow { fill: ${shadowColor}; font-size: ${fontSize}px; font-family: sans-serif; font-weight: bold; }
      </style>
      <text x="12" y="${fontSize + 12}" class="shadow">${text}</text>
      <text x="10" y="${fontSize + 10}" class="txt">${text}</text>
    </svg>
  `);
}

app.post("/api/convert", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Filter image format specifically for convert route
    const allowed = /jpeg|jpg|png|gif|tiff|tif|bmp|avif|heif|heic|svg|webp/;
    const isImage =
      allowed.test(path.extname(req.file.originalname).toLowerCase()) ||
      allowed.test(req.file.mimetype);
    if (!isImage)
      return res
        .status(400)
        .json({ error: "Unsupported file format for image conversion." });

    const quality = Math.min(
      100,
      Math.max(1, parseInt(req.body.quality) || 80),
    );
    const maxWidth = parseInt(req.body.maxWidth) || null;
    const maxHeight = parseInt(req.body.maxHeight) || null;
    const targetFormat = req.body.format || "webp";
    const keepMetadata = req.body.keepMetadata === "true";
    const watermarkText = req.body.watermarkText || "";
    const watermarkPosition = getGravity(req.body.watermarkPosition);
    const watermarkColor = req.body.watermarkColor || "white";

    if (!SUPPORTED_FORMATS.includes(targetFormat)) {
      return res.status(400).json({ error: "Unsupported format" });
    }

    let pipeline = sharp(req.file.buffer);
    const metadata = await pipeline.metadata();

    // EXIF Preservation
    if (keepMetadata) {
      pipeline = pipeline.withMetadata();
    }

    // Resize
    if (maxWidth || maxHeight) {
      pipeline = pipeline.resize({
        width: maxWidth || undefined,
        height: maxHeight || undefined,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Calculate new dimensions after resize for watermark scaling
    const finalWidth = maxWidth
      ? Math.min(maxWidth, metadata.width)
      : metadata.width;

    // Watermark
    if (watermarkText) {
      const overlay = createWatermarkBuffer(
        watermarkText,
        watermarkColor,
        finalWidth,
      );
      pipeline = pipeline.composite([
        { input: overlay, gravity: watermarkPosition },
      ]);
    }

    pipeline = processImage(pipeline, targetFormat, quality);
    const outputBuffer = await pipeline.toBuffer();

    const originalName = path.parse(req.file.originalname).name;
    const ext = targetFormat === "jpeg" ? "jpg" : targetFormat;
    const filename = `${originalName}.${ext}`;

    res.json({
      success: true,
      filename,
      originalSize: req.file.size,
      convertedSize: outputBuffer.length,
      savings: Math.round((1 - outputBuffer.length / req.file.size) * 100),
      width: metadata.width,
      height: metadata.height,
      format: targetFormat,
      base64: outputBuffer.toString("base64"),
    });
  } catch (err) {
    console.error("Convert error:", err);
    res.status(500).json({ error: err.message || "Conversion failed" });
  }
});

app.post("/api/convert-bulk", upload.array("images", 100), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: "No files uploaded" });

    // Quick validation upfront
    const allowed = /jpeg|jpg|png|gif|tiff|tif|bmp|avif|heif|heic|svg|webp/;
    const validFiles = req.files.filter(
      (f) =>
        allowed.test(path.extname(f.originalname).toLowerCase()) ||
        allowed.test(f.mimetype),
    );

    if (validFiles.length === 0) {
      return res
        .status(400)
        .json({ error: "No valid image files found for conversion." });
    }

    const quality = Math.min(
      100,
      Math.max(1, parseInt(req.body.quality) || 80),
    );
    const maxWidth = parseInt(req.body.maxWidth) || null;
    const maxHeight = parseInt(req.body.maxHeight) || null;
    const targetFormat = req.body.format || "webp";
    const keepMetadata = req.body.keepMetadata === "true";
    const watermarkText = req.body.watermarkText || "";
    const watermarkPosition = getGravity(req.body.watermarkPosition);
    const watermarkColor = req.body.watermarkColor || "white";

    if (!SUPPORTED_FORMATS.includes(targetFormat)) {
      if (!res.headersSent)
        return res.status(400).json({ error: "Unsupported format" });
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="converted-to-${targetFormat}.zip"`,
    );

    const archive = archiver("zip", { zlib: { level: 1 } });
    archive.pipe(res);

    for (const file of validFiles) {
      try {
        let pipeline = sharp(file.buffer);
        const metadata = await pipeline.metadata();

        if (keepMetadata) pipeline = pipeline.withMetadata();

        if (maxWidth || maxHeight) {
          pipeline = pipeline.resize({
            width: maxWidth || undefined,
            height: maxHeight || undefined,
            fit: "inside",
            withoutEnlargement: true,
          });
        }

        const finalWidth = maxWidth
          ? Math.min(maxWidth, metadata.width)
          : metadata.width;

        if (watermarkText) {
          const overlay = createWatermarkBuffer(
            watermarkText,
            watermarkColor,
            finalWidth,
          );
          pipeline = pipeline.composite([
            { input: overlay, gravity: watermarkPosition },
          ]);
        }

        pipeline = processImage(pipeline, targetFormat, quality);
        const outputBuffer = await pipeline.toBuffer();
        const originalName = path.parse(file.originalname).name;
        const ext = targetFormat === "jpeg" ? "jpg" : targetFormat;

        archive.append(outputBuffer, { name: `${originalName}.${ext}` });
      } catch (fileErr) {
        console.error(
          `Skipping file ${file.originalname} due to error:`,
          fileErr.message,
        );
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error("Bulk convert error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || "Bulk conversion failed" });
    }
  }
});

// ============ ARSIP (FILE SHARING) ============

app.get("/api/arsip/history", (req, res) => {
  const db = getArsipDB();
  const now = Date.now();
  const validFiles = {};
  for (const [id, info] of Object.entries(db.files)) {
    if (info.expiryDate > now) {
      validFiles[id] = {
        id: id,
        name: info.name || info.originalName,
        type: info.type || "file",
        size: info.size,
        expiryDate: info.expiryDate,
        uploadDate: info.uploadDate,
        url: `${req.protocol}://${req.get("host")}/s/${id}`,
        hasPassword: !!info.passwordHash,
      };
    }
  }
  res.json({ success: true, files: validFiles });
});

app.post("/api/arsip/upload", upload.array("files", 1000), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: "No file uploaded" });

    const crypto = require("crypto");
    const shortId = crypto.randomBytes(6).toString("hex");
    const isFolder = req.body.type === "folder";
    const folderName = req.body.folderName || "Folder";
    const filePaths = req.body.paths ? JSON.parse(req.body.paths) : [];

    let storedName = shortId;
    let totalSize = 0;
    let filesMeta = [];

    if (isFolder) {
      const targetDir = path.join(ARSIP_DIR, shortId);
      fs.mkdirSync(targetDir, { recursive: true });
      req.files.forEach((file, idx) => {
        const relPath = filePaths[idx] || file.originalname;
        const sanitizedRelBase = relPath.replace(/[^a-zA-Z0-9.\-_/]/g, "_");
        const fullPath = path.join(targetDir, sanitizedRelBase);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, file.buffer);
        totalSize += file.size;
        filesMeta.push({
          originalName: file.originalname,
          path: sanitizedRelBase,
          size: file.size,
          mimeType: file.mimetype,
        });
      });
    } else {
      const file = req.files[0];
      const filename = file.originalname.replace(/[^a-zA-Z0-9.\-_]/gi, "_");
      storedName = `${shortId}-${filename}`;
      fs.writeFileSync(path.join(ARSIP_DIR, storedName), file.buffer);
      totalSize = file.size;
      filesMeta.push({
        originalName: file.originalname,
        path: storedName,
        size: file.size,
        mimeType: file.mimetype,
      });
    }

    const db = getArsipDB();
    const expiryHours = parseInt(req.body.expiryHours) || 24;
    const expiryDate = Date.now() + expiryHours * 60 * 60 * 1000;

    let passwordHash = null;
    if (req.body.password) {
      passwordHash = crypto
        .createHash("sha256")
        .update(req.body.password)
        .digest("hex");
    }

    db.files[shortId] = {
      type: isFolder ? "folder" : "file",
      name: isFolder ? folderName : filesMeta[0].originalName,
      storedName: storedName,
      files: filesMeta,
      size: totalSize,
      mimeType: isFolder ? "folder" : filesMeta[0].mimeType,
      uploadDate: Date.now(),
      expiryDate: expiryDate,
      passwordHash: passwordHash,
    };

    saveArsipDB(db);

    const fullUrl = `${req.protocol}://${req.get("host")}/s/${shortId}`;

    res.json({
      success: true,
      shortId,
      url: fullUrl,
      expiryDate,
      originalName: db.files[shortId].name,
      size: totalSize,
      type: db.files[shortId].type,
    });
  } catch (err) {
    console.error("Arsip upload error:", err);
    res.status(500).json({ error: "Failed to upload file to Arsip." });
  }
});

app.all("/s/:id", (req, res) => {
  const shortId = req.params.id;
  const db = getArsipDB();
  const fileInfo = db.files[shortId];

  if (!fileInfo) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>File Not Found</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-slate-950 text-slate-200 font-sans min-h-screen flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-sm text-center shadow-2xl">
          <div class="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <h1 class="text-2xl font-bold text-white mb-2">File Not Found</h1>
          <p class="text-sm text-slate-400 mb-8 leading-relaxed">The link is invalid, expired, or the file has been deleted.</p>
          <a href="/" class="block w-full py-2.5 bg-brand-500 hover:bg-brand-400 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors shadow-lg">Back to Application</a>
        </div>
      </body>
      </html>
    `);
  }

  const filePath = path.join(
    ARSIP_DIR,
    fileInfo.type === "folder" ? shortId : fileInfo.storedName,
  );

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File physically not found on server.");
  }

  // Handle Password Protection
  const providedPassword = req.query.pwd || (req.body && req.body.pwd);
  const pwdParam = providedPassword
    ? `&pwd=${encodeURIComponent(providedPassword)}`
    : "";

  if (fileInfo.passwordHash) {
    if (!providedPassword) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Protected File</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-slate-950 text-slate-200 font-sans min-h-screen flex items-center justify-center p-4">
          <form method="POST" class="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-sm text-center shadow-2xl">
            <div class="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            </div>
            <h2 class="text-xl font-bold text-white mb-1">Protected ${fileInfo.type === "folder" ? "Folder" : "File"}</h2>
            <p class="text-xs text-slate-400 mb-8 truncate" title="${fileInfo.name || fileInfo.originalName}">${fileInfo.name || fileInfo.originalName}</p>
            <input type="password" name="pwd" placeholder="Enter password to unlock" required class="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all mb-4" />
            <button type="submit" class="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors shadow-lg active:scale-[0.98]">Unlock Secure Area</button>
          </form>
        </body>
        </html>
       `);
    }

    const crypto = require("crypto");
    const providedHash = crypto
      .createHash("sha256")
      .update(providedPassword)
      .digest("hex");

    if (providedHash !== fileInfo.passwordHash) {
      return res.status(401).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Access Denied</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-slate-950 text-slate-200 font-sans min-h-screen flex items-center justify-center p-4">
          <div class="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-sm text-center shadow-2xl">
            <div class="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <h1 class="text-2xl font-bold text-white mb-2">Incorrect Password</h1>
            <p class="text-sm text-slate-400 mb-8 leading-relaxed">The password you entered is invalid. Please try again.</p>
            <a href="/s/${shortId}" class="block w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors border border-slate-700">Try Again</a>
          </div>
        </body>
        </html>
      `);
    }
  }

  // Folder View (Google Drive-like)
  if (fileInfo.type === "folder") {
    const downloadPath = req.query.downloadFile;
    if (downloadPath) {
      const targetFileObj = fileInfo.files.find((f) => f.path === downloadPath);
      if (!targetFileObj)
        return res.status(404).send("File not found in folder.");
      const resolvedPath = path.join(filePath, targetFileObj.path);

      const disposition = req.query.inline ? "inline" : "attachment";
      res.setHeader(
        "Content-Disposition",
        `${disposition}; filename="${targetFileObj.originalName}"`,
      );
      res.setHeader("Content-Type", targetFileObj.mimeType);
      return res.sendFile(resolvedPath);
    }

    const fileListHTML = fileInfo.files
      .map((f, idx) => {
        const previewUrl = `/s/${shortId}?downloadFile=${encodeURIComponent(f.path)}&inline=1${pwdParam}`;
        return `
        <div class="file-item group flex justify-between items-center p-3 border-b border-slate-800/60 cursor-pointer hover:bg-slate-800/50 transition-all select-none" onclick="setPreview('${previewUrl}', '${f.path}', '${(f.size / 1024 / 1024).toFixed(2)}', event)">
          <div class="flex items-center gap-3 overflow-hidden">
             <div class="w-8 h-8 rounded bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-400 group-hover:text-amber-400 transition-colors">
               <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/></svg>
             </div>
             <span class="text-sm text-slate-300 font-medium truncate">${f.path}</span>
          </div>
          <div class="flex items-center gap-4 flex-shrink-0">
            <span class="text-xs font-medium text-slate-500">${(f.size / 1024 / 1024).toFixed(2)} MB</span>
            <a href="/s/${shortId}?downloadFile=${encodeURIComponent(f.path)}${pwdParam}" onclick="event.stopPropagation()" class="p-2 bg-slate-800 hover:bg-brand-500 hover:text-white text-slate-300 rounded-lg transition-colors shadow-sm" title="Download">
               <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            </a>
          </div>
        </div>
      `;
      })
      .join("");

    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${fileInfo.name} - Arsip</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: { brand: { 400: '#8b7df0', 500: '#6c5ce7', 600: '#5a4bcf' } }
              }
            }
          }
        </script>
        <style>
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
          .file-item.active { background: rgba(139, 125, 240, 0.1) !important; border-left: 3px solid #8b7df0; }
          .file-item.active svg.w-4 { color: #8b7df0 !important; }
        </style>
      </head>
      <body class="bg-slate-950 text-slate-200 font-sans h-screen flex flex-col overflow-hidden selection:bg-brand-500 selection:text-white">
        
        <nav class="bg-slate-900 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between flex-shrink-0 z-10 shadow-sm">
           <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>
              </div>
              <div class="overflow-hidden">
                <h2 class="text-sm font-bold text-white leading-none truncate max-w-xs md:max-w-md">${fileInfo.name}</h2>
                <span class="text-[10px] uppercase font-bold text-brand-400 tracking-wider">Arsip • ${fileInfo.files.length} items</span>
              </div>
           </div>
        </nav>

        <div class="flex flex-1 overflow-hidden flex-col md:flex-row">
          
          <!-- Sidebar: File List -->
          <div class="w-full md:w-80 lg:w-96 bg-slate-900/50 border-r border-slate-800/60 flex flex-col overflow-y-auto custom-scrollbar flex-shrink-0 z-0 shadow-xl max-h-[40vh] md:max-h-full">
            <div class="sticky top-0 bg-slate-900/90 backdrop-blur-sm z-10 px-4 py-3 border-b border-slate-800/60 font-semibold text-xs text-slate-400 uppercase tracking-wider">
              Files
            </div>
            ${fileListHTML}
          </div>

          <!-- Main: Preview Pane -->
          <div class="flex-1 bg-slate-950 flex flex-col relative overflow-hidden z-0">
             
             <!-- Preview Header -->
             <div id="previewHeader" class="hidden items-center justify-between p-4 bg-slate-900/40 border-b border-slate-800/60 backdrop-blur-sm absolute top-0 w-full z-10">
                <div class="flex-1 min-w-0 pr-4">
                  <span id="previewTitle" class="text-sm font-bold text-white truncate block"></span>
                  <span class="text-[10px] text-slate-400 flex items-center gap-2">
                    <span id="previewSize"></span>
                    <span class="w-1 h-1 bg-slate-700 rounded-full"></span>
                    <span>Preview</span>
                  </span>
                </div>
                <div class="flex-shrink-0">
                   <a id="previewDownloadBtn" href="#" class="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-xs font-bold rounded-lg transition-colors shadow-lg active:scale-95 flex items-center gap-2">
                     <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                     <span class="hidden sm:inline">Download</span>
                   </a>
                </div>
             </div>
             
             <!-- Preview Content -->
             <div id="previewContent" class="flex-1 flex justify-center items-center p-4 md:p-8 overflow-hidden pt-20">
                <div class="text-center">
                  <div class="w-20 h-20 mx-auto bg-slate-800/50 rounded-full flex items-center justify-center mb-4 text-slate-600">
                    <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  </div>
                  <p class="text-sm font-medium text-slate-400">Select a file from the sidebar to preview</p>
                </div>
             </div>
          </div>
        </div>

        <script>
          function setPreview(url, name, sizeMB, evt) {
            document.querySelectorAll('.file-item').forEach(e => e.classList.remove('active'));
            if(evt && evt.currentTarget) evt.currentTarget.classList.add('active');
            
            document.getElementById('previewHeader').classList.remove('hidden');
            document.getElementById('previewHeader').classList.add('flex');
            
            document.getElementById('previewTitle').innerText = name;
            document.getElementById('previewSize').innerText = sizeMB + ' MB';
            
            const downloadUrl = url.replace('&inline=1', '');
            document.getElementById('previewDownloadBtn').href = downloadUrl;
            
            const ext = name.split('.').pop().toLowerCase();
            const isImg = ['jpg','jpeg','png','gif','webp','svg','avif'].includes(ext);
            const isVideo = ['mp4','webm','ogg'].includes(ext);
            const isAudio = ['mp3','wav','ogg'].includes(ext);
            
            const content = document.getElementById('previewContent');
            content.classList.remove('pt-20');
            
            if (isImg) {
              content.innerHTML = '<div class="w-full h-full p-4 md:p-12 mb-10 flex items-center justify-center overflow-hidden"><img src="' + url + '" class="max-w-full max-h-full object-contain rounded-lg shadow-2xl bg-white/5 border border-white/5" /></div>';
            } else if (isVideo) {
              content.innerHTML = '<video src="' + url + '" controls autoplay class="max-w-full max-h-full rounded-xl shadow-2xl border border-white/5"></video>';
            } else if (isAudio) {
              content.innerHTML = '<audio src="' + url + '" controls autoplay class="w-full max-w-sm"></audio>';
            } else {
              content.innerHTML = '<iframe src="' + url + '" class="w-full h-[85%] rounded-xl shadow-2xl bg-white border-0 mt-16"></iframe>';
            }
          }
          
          const urlParams = new URLSearchParams(window.location.search);
          const previewFile = urlParams.get('previewFile');
          if (previewFile) {
             const items = document.querySelectorAll('.file-item');
             for(let item of items) {
               if(item.innerHTML.includes(previewFile)) {
                  item.click();
                  break;
               }
             }
          }
        </script>
      </body>
      </html>
    `);
  }

  // Auto-preview for files OR sub-file preview (Single files)
  const isImage = fileInfo.mimeType && fileInfo.mimeType.startsWith("image/");
  // The `previewPath` variable was only used for folder previews, which is now handled by the split-pane logic.
  // This block now only handles single file previews.

  if (!req.query.download && !req.query.inline && fileInfo.type === "file") {
    const previewTag = isImage
      ? `<img src="/s/${shortId}?inline=1${pwdParam}" style="max-width:100%; max-height:70vh; object-fit:contain; border-radius:4px;" />`
      : `<iframe src="/s/${shortId}?inline=1${pwdParam}" style="width:100%; height:70vh; border:none; border-radius:4px; background:white;"></iframe>`;
    const isVideo = ["mp4", "webm", "ogg"].includes(
      fileInfo.name?.split(".").pop().toLowerCase() || "",
    );
    const isAudio = ["mp3", "wav", "ogg"].includes(
      fileInfo.name?.split(".").pop().toLowerCase() || "",
    );

    let advancedPreviewTag = previewTag;
    if (isVideo) {
      advancedPreviewTag = `<video src="/s/${shortId}?inline=1${pwdParam}" controls autoplay class="max-w-full max-h-full rounded-lg shadow-2xl border border-white/5"></video>`;
    } else if (isAudio) {
      advancedPreviewTag = `<audio src="/s/${shortId}?inline=1${pwdParam}" controls autoplay class="w-full max-w-sm"></audio>`;
    } else if (isImage) {
      advancedPreviewTag = `<img src="/s/${shortId}?inline=1${pwdParam}" class="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl bg-white/5 border border-white/5" />`;
    } else {
      advancedPreviewTag = `<iframe src="/s/${shortId}?inline=1${pwdParam}" class="w-full h-[70vh] rounded-xl shadow-2xl bg-white border-0"></iframe>`;
    }

    return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${fileInfo.name || fileInfo.originalName} - Preview</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-slate-950 text-slate-200 font-sans min-h-screen flex flex-col p-4 md:p-8">
          <div class="max-w-5xl w-full mx-auto flex flex-col flex-1">
            <div class="bg-slate-900 border-x border-t border-slate-800 p-4 rounded-t-2xl flex flex-wrap gap-4 justify-between items-center shadow-lg">
              <div class="flex items-center gap-3 overflow-hidden">
                <div class="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <div class="min-w-0">
                  <h1 class="text-sm md:text-base font-bold text-white truncate">${fileInfo.name || fileInfo.originalName}</h1>
                  <p class="text-[10px] md:text-xs text-slate-400">${(fileInfo.size / 1024 / 1024).toFixed(2)} MB • Secure Preview</p>
                </div>
              </div>
              <a href="/s/${shortId}?download=1${pwdParam}" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg active:scale-95 flex items-center gap-2 flex-shrink-0">
                 <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                 Download Original
              </a>
            </div>
            
            <div class="flex-1 bg-slate-950/50 border border-slate-800 flex justify-center items-center p-4 md:p-10 relative overflow-hidden ring-1 ring-inset ring-white/5 shadow-2xl">
               ${advancedPreviewTag}
            </div>
            
            <div class="bg-slate-900 border-x border-b border-slate-800 p-4 rounded-b-2xl shadow-lg flex justify-center">
              <p class="text-xs text-slate-500">Served securely by Posin Self-Hosted Archiver.</p>
            </div>
          </div>
        </body>
        </html>
     `);
  }

  const disposition = req.query.inline ? "inline" : "attachment";
  res.setHeader(
    "Content-Disposition",
    `${disposition}; filename="${fileInfo.name || fileInfo.originalName}"`,
  );
  res.setHeader("Content-Type", fileInfo.mimeType);
  res.sendFile(filePath);
});

// Cleanup temp files & Expired Arsip
setInterval(
  () => {
    // Cleanup Image Converter temps
    [UPLOAD_DIR, OUTPUT_DIR].forEach((dir) => {
      if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach((file) => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (Date.now() - stat.mtimeMs > 3600000) fs.unlinkSync(filePath); // 1 hour for converter
        });
      }
    });

    // Cleanup Arsip
    const db = getArsipDB();
    const now = Date.now();
    let changed = false;

    Object.keys(db.files).forEach((id) => {
      if (now > db.files[id].expiryDate) {
        const filePath = path.join(
          ARSIP_DIR,
          db.files[id].type === "folder" ? id : db.files[id].storedName,
        );
        if (fs.existsSync(filePath)) {
          try {
            fs.rmSync(filePath, { recursive: true, force: true });
          } catch (e) {}
        }
        delete db.files[id];
        changed = true;
      }
    });

    if (changed) saveArsipDB(db);
  },
  5 * 60 * 1000,
); // Check every 5 mins

// Optional: Delete endpoint
app.delete("/api/arsip/:id", (req, res) => {
  const shortId = req.params.id;
  const db = getArsipDB();

  if (db.files[shortId]) {
    const fileInfo = db.files[shortId];
    const targetName =
      fileInfo.type === "folder" ? shortId : fileInfo.storedName;
    const filePath = path.join(ARSIP_DIR, targetName);

    try {
      if (fs.existsSync(filePath)) {
        fs.rmSync(filePath, { recursive: true, force: true });
      }
    } catch (e) {
      console.error("Delete file failed", e);
    }

    delete db.files[shortId];
    saveArsipDB(db);
    return res.json({ success: true, message: "File deleted successfully" });
  }

  return res.status(404).json({ error: "File not found or already deleted" });
});

app.put("/api/arsip/:id", (req, res) => {
  const shortId = req.params.id;
  const db = getArsipDB();

  if (!db.files[shortId]) {
    return res.status(404).json({ error: "File not found or already deleted" });
  }

  try {
    const fileInfo = db.files[shortId];
    let changed = false;

    if (req.body.expiryHours !== undefined) {
      if (req.body.expiryHours !== "") {
        const h = parseFloat(req.body.expiryHours);
        if (h > 0) {
          fileInfo.expiryDate = Date.now() + h * 60 * 60 * 1000;
          changed = true;
        }
      }
    }

    if (req.body.password !== undefined) {
      if (req.body.password === "") {
        fileInfo.passwordHash = null;
      } else {
        const crypto = require("crypto");
        fileInfo.passwordHash = crypto
          .createHash("sha256")
          .update(req.body.password)
          .digest("hex");
      }
      changed = true;
    }

    if (changed) {
      saveArsipDB(db);
    }

    res.json({
      success: true,
      message: "Updated successfully",
      hasPassword: !!fileInfo.passwordHash,
    });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Failed to update item" });
  }
});

app.listen(PORT, () => {
  console.log(`\n  ✅ Converter is running on http://localhost:${PORT}`);
});
