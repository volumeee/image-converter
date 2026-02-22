# 🖼️ Universal Image Converter

A beautifully designed, self-hosted, bulk image converter and optimizer. Built with Node.js, Express, Sharp, and Tailwind CSS. 

Convert images directly on your server without relying on third-party cloud services. Perfect for e-commerce catalog processing, internal team tools, or personal asset management.

![Universal Image Converter Preview](/public/favicon.ico)

## ✨ Features

- **Multi-Format Support**: Convert between WebP, AVIF, JPEG, PNG, GIF, and TIFF.
- **Lightning Fast**: Powered by [`sharp`](https://sharp.pixelplumbing.com/), the fastest image processing library for Node.js.
- **Bulk Processing**: Drag and drop up to 100 images at once and download the optimized results in a single ZIP file.
- **Advanced Optimization**: 
  - Dynamic quality compression sliders.
  - Smart aspect-ratio resizing.
  - EXIF Metadata preservation toggle (Keep camera data or strip for max compression).
  - Text watermarking with adjustable positioning.
- **Premium UI/UX**: Aesthetic dark mode with glassmorphism effects, built entirely with Tailwind CSS.

## 🚀 Quick Start

Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### 1. Clone the repository
```bash
git clone https://github.com/volumeee/image-converter.git
cd image-converter
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start the server
```bash
npm start
```
*For development with auto-restart, you can run `npm run dev` if you have nodemon installed.*

### 4. Open in browser
Navigate to:
```
http://localhost:3456
```

## 🛠️ Technology Stack

- **Backend**: Node.js & Express
- **Image Processing Engine**: Sharp
- **Frontend**: Vanilla Javascript (No compiling needed!)
- **Styling**: Tailwind CSS via CDN

## 🛡️ Privacy & Security (Self-Hosted Model)

Unlike web-based converters, **Universal Image Converter** is designed to run locally or on your own VPS. 
- Files never leave your local network/server.
- Uploads and outputs are strictly stored in temporary `uploads/` and `output/` directories.
- Automatic CRON job cleans up processed files every 10 minutes to prevent storage bloat.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
