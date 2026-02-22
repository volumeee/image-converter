const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const archiver = require("archiver");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3456;

// Ensure upload/output directories exist
const UPLOAD_DIR = path.join(__dirname, "uploads");
const OUTPUT_DIR = path.join(__dirname, "output");
[UPLOAD_DIR, OUTPUT_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Multer config
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|tiff|tif|bmp|avif|heif|heic|svg|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype.split("/")[1] || "");
    if (ext || mime) return cb(null, true);
    cb(new Error("Format file tidak didukung."));
  },
});

app.use(express.static(path.join(__dirname, "public")));

const SUPPORTED_FORMATS = ['webp', 'jpeg', 'png', 'avif', 'tiff', 'gif'];

function processImage(pipeline, format, quality) {
  const options = {};
  if (['jpeg', 'webp', 'avif', 'tiff'].includes(format)) {
    options.quality = quality;
  }
  return pipeline.toFormat(format, options);
}

function getGravity(position) {
  const map = {
    'bottom-right': 'southeast',
    'bottom-left': 'southwest',
    'top-right': 'northeast',
    'top-left': 'northwest',
    'center': 'center'
  };
  return map[position] || 'southeast';
}

function createWatermarkBuffer(text, color, imgWidth) {
  const fontSize = Math.max(14, Math.floor(imgWidth / 25));
  const svgWidth = text.length * (fontSize * 0.7) + 40; 
  const svgHeight = fontSize + 40;
  
  const shadowColor = color === 'white' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)';
  
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

    const quality = Math.min(100, Math.max(1, parseInt(req.body.quality) || 80));
    const maxWidth = parseInt(req.body.maxWidth) || null;
    const maxHeight = parseInt(req.body.maxHeight) || null;
    const targetFormat = req.body.format || 'webp';
    const keepMetadata = req.body.keepMetadata === 'true';
    const watermarkText = req.body.watermarkText || '';
    const watermarkPosition = getGravity(req.body.watermarkPosition);
    const watermarkColor = req.body.watermarkColor || 'white';

    if (!SUPPORTED_FORMATS.includes(targetFormat)) {
      return res.status(400).json({ error: "Format tidak didukung" });
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
    const finalWidth = maxWidth ? Math.min(maxWidth, metadata.width) : metadata.width;

    // Watermark
    if (watermarkText) {
      const overlay = createWatermarkBuffer(watermarkText, watermarkColor, finalWidth);
      pipeline = pipeline.composite([
        { input: overlay, gravity: watermarkPosition }
      ]);
    }

    pipeline = processImage(pipeline, targetFormat, quality);
    const outputBuffer = await pipeline.toBuffer();

    const originalName = path.parse(req.file.originalname).name;
    const ext = targetFormat === 'jpeg' ? 'jpg' : targetFormat;
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

    const quality = Math.min(100, Math.max(1, parseInt(req.body.quality) || 80));
    const maxWidth = parseInt(req.body.maxWidth) || null;
    const maxHeight = parseInt(req.body.maxHeight) || null;
    const targetFormat = req.body.format || 'webp';
    const keepMetadata = req.body.keepMetadata === 'true';
    const watermarkText = req.body.watermarkText || '';
    const watermarkPosition = getGravity(req.body.watermarkPosition);
    const watermarkColor = req.body.watermarkColor || 'white';

    if (!SUPPORTED_FORMATS.includes(targetFormat)) {
      if (!res.headersSent) return res.status(400).json({ error: "Format tidak didukung" });
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="converted-to-${targetFormat}.zip"`);

    const archive = archiver("zip", { zlib: { level: 1 } });
    archive.pipe(res);

    for (const file of req.files) {
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
      
      const finalWidth = maxWidth ? Math.min(maxWidth, metadata.width) : metadata.width;

      if (watermarkText) {
        const overlay = createWatermarkBuffer(watermarkText, watermarkColor, finalWidth);
        pipeline = pipeline.composite([
          { input: overlay, gravity: watermarkPosition }
        ]);
      }

      pipeline = processImage(pipeline, targetFormat, quality);
      const outputBuffer = await pipeline.toBuffer();
      const originalName = path.parse(file.originalname).name;
      const ext = targetFormat === 'jpeg' ? 'jpg' : targetFormat;

      archive.append(outputBuffer, { name: `${originalName}.${ext}` });
    }

    await archive.finalize();
  } catch (err) {
    console.error("Bulk convert error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || "Bulk conversion failed" });
    }
  }
});

// Cleanup temp files
setInterval(() => {
  [UPLOAD_DIR, OUTPUT_DIR].forEach((dir) => {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (Date.now() - stat.mtimeMs > 3600000) fs.unlinkSync(filePath);
      });
    }
  });
}, 600000);

app.listen(PORT, () => {
  console.log(`
  ✅ Converter is running on http://localhost:${PORT}
  `);
});
