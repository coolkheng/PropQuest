# 1. Base image
FROM node:18-alpine

# 2. Working directory inside container
WORKDIR /app

# 3. Copy package files first (for caching)
COPY package*.json ./

# 4. Install dependencies
RUN npm install

# 5. Copy the rest of the application
COPY . .

# 6. Expose backend port
EXPOSE 5000

# 7. Run the application
CMD ["npm", "start"]

