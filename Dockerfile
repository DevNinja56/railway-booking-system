# Dockerfile
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the code
COPY . .

# Expose the port used by the app
EXPOSE 4000

# Start the application
CMD ["npm", "run", "dev"]
