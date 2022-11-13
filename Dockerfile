FROM node:12
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 8081
CMD [ "node", "server.js"]
