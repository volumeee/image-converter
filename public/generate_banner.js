const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const svg = `
<svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
  <!-- Defs for gradients -->
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#1e1b4b" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#818cf8" />
      <stop offset="100%" stop-color="#c084fc" />
    </linearGradient>
    <linearGradient id="cardGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(255, 255, 255, 0.1)" />
      <stop offset="100%" stop-color="rgba(255, 255, 255, 0.0)" />
    </linearGradient>
    <filter id="blur">
      <feGaussianBlur stdDeviation="10" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="400" fill="url(#bg)" />

  <!-- Abstract decorative grid & lines -->
  <line x1="0" y1="100" x2="1200" y2="100" stroke="rgba(255, 255, 255, 0.05)" stroke-width="1" />
  <line x1="0" y1="200" x2="1200" y2="200" stroke="rgba(255, 255, 255, 0.05)" stroke-width="1" />
  <line x1="0" y1="300" x2="1200" y2="300" stroke="rgba(255, 255, 255, 0.05)" stroke-width="1" />
  
  <!-- Glowing Abstract Waves / Line -->
  <path d="M-100 200 Q 200 50, 600 250 T 1300 200" fill="none" stroke="url(#glow)" stroke-width="6" opacity="0.4" filter="url(#blur)"/>
  <path d="M-100 210 Q 300 100, 600 200 T 1300 220" fill="none" stroke="url(#glow)" stroke-width="3" opacity="0.6" />
  <path d="M-100 220 Q 350 150, 600 150 T 1300 240" fill="none" stroke="#2dd4bf" stroke-width="2" opacity="0.8" />

  <!-- Abstract File Format Cards (Left Side) -->
  <g transform="translate(150, 150)">
    <rect x="-60" y="-40" width="120" height="80" rx="10" fill="url(#cardGlow)" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
    <text x="0" y="5" font-family="'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="900" fill="#cbd5e1" text-anchor="middle">JPEG</text>
  </g>

  <g transform="translate(180, 240)">
    <rect x="-50" y="-35" width="100" height="70" rx="10" fill="url(#cardGlow)" stroke="rgba(255,255,255,0.2)" stroke-width="1" opacity="0.7"/>
    <text x="0" y="5" font-family="'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="900" fill="#94a3b8" text-anchor="middle">PNG</text>
  </g>

  <!-- Conversion Flow Arrow -->
  <g transform="translate(290, 160)">
    <line x1="0" y1="0" x2="120" y2="0" stroke="#38bdf8" stroke-width="4" stroke-dasharray="10, 8" />
    <polyline points="105,-15 125,0 105,15" fill="none" stroke="#38bdf8" stroke-width="4" stroke-linejoin="round"/>
  </g>

  <!-- Output Format Card (Center Focus) -->
  <g transform="translate(600, 160)">
    <!-- Glow aura behind main card -->
    <rect x="-100" y="-70" width="200" height="140" rx="20" fill="url(#glow)" opacity="0.3" filter="url(#blur)" />
    <!-- Glass card -->
    <rect x="-90" y="-60" width="180" height="120" rx="16" fill="rgba(30,30,50,0.6)" stroke="url(#glow)" stroke-width="3" />
    <!-- Image Icon inside card -->
    <svg x="-40" y="-40" width="80" height="50" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21"></polyline>
    </svg>
    <text x="0" y="40" font-family="'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle">WebP / AVIF</text>
  </g>
  
  <!-- "BULK ENGINE" Label -->
  <g transform="translate(600, 310)">
    <rect x="-80" y="-18" width="160" height="36" rx="18" fill="rgba(56, 189, 248, 0.1)" stroke="#38bdf8" stroke-width="1"/>
    <text x="0" y="5" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#38bdf8" text-anchor="middle" letter-spacing="2">⚡ LIGHTNING FAST</text>
  </g>

  <!-- Server / Processing visual (Right Side) -->
  <g transform="translate(1000, 150)">
    <g opacity="0.8">
      <rect x="-50" y="-60" width="100" height="20" rx="5" fill="#1e293b" stroke="#475569" stroke-width="2"/>
      <circle cx="-35" cy="-50" r="3" fill="#10b981" />
      <line x1="-20" y1="-50" x2="30" y2="-50" stroke="#f8fafc" stroke-width="2" opacity="0.5"/>
      
      <rect x="-50" y="-20" width="100" height="20" rx="5" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
      <circle cx="-35" cy="-10" r="3" fill="#10b981" />
      <line x1="-20" y1="-10" x2="30" y2="-10" stroke="#f8fafc" stroke-width="2" opacity="0.5"/>
      
      <rect x="-50" y="20" width="100" height="20" rx="5" fill="#1e293b" stroke="#475569" stroke-width="2"/>
      <circle cx="-35" cy="30" r="3" fill="#ef4444" />
      <line x1="-20" y1="30" x2="30" y2="30" stroke="#f8fafc" stroke-width="2" opacity="0.5"/>
    </g>
  </g>
  
  <!-- Right arrows -->
  <g transform="translate(750, 160)">
    <line x1="0" y1="-20" x2="160" y2="-50" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-dasharray="5, 5" />
    <line x1="0" y1="0" x2="160" y2="-10" stroke="#818cf8" stroke-width="2" stroke-dasharray="8, 6" />
    <line x1="0" y1="20" x2="160" y2="30" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-dasharray="5, 5" />
  </g>

  <!-- Foreground Title -->
  <text x="600" y="55" font-family="'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="3">UNIVERSAL IMAGE CONVERTER API</text>
</svg>
`;

const outputPath = path.join(__dirname, "banner.png");

sharp(Buffer.from(svg))
  .png()
  .toFile(outputPath)
  .then(() => {
    console.log("Banner effectively generated at:", outputPath);
  })
  .catch((err) => {
    console.error("Error:", err);
  });
