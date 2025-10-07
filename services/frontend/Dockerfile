FROM node:20-alpine
WORKDIR /app

# package.json rein
COPY ./src/package*.json ./

# Install nur für Build Cache
RUN npm install

ENV HOST=0.0.0.0
ENV PORT=8080
ENV CHOKIDAR_USEPOLLING=true
EXPOSE 8080

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080"]


