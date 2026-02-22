FROM node:20-alpine

# Menyediakan environment untuk production
ENV NODE_ENV=production

# Memastikan direktori kerja terpusat
WORKDIR /app

# Meng-copy package.json dkk terlebih dahulu agar layer bisa di-cache
COPY package*.json ./

# Menginstall dependensi (khusus untuk environment production)
# Menggunakan npm install dengan arg --omit=dev
RUN npm pkg delete scripts.prepare && npm install --omit=dev

# Copy semua *source code*
COPY . .

# Membuat direktori yang dibutuhkan sebelum aplikasi dijalankan
RUN mkdir -p uploads output && chown -R node:node /app

# Switch user menjadi node, agar tidak menggunakan akses root yang riskan
USER node

# Mengekspos port 3456
EXPOSE 3456

# Memulai server
CMD ["node", "server.js"]
