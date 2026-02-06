FROM node:20-alpine

WORKDIR /app

# Installer dependencies først for bedre cache
COPY package*.json ./
RUN npm ci

# Kopier resten av prosjektet
COPY . .

EXPOSE 3001

# Starter API (samme som du bruker lokalt)
CMD ["npm", "run", "dev"]
