FROM node:24

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci
# RUN - Happens during image building.

COPY . .

RUN npm run build

CMD ["npm", "run", "start:prod"]
# CMD - Happens when the container starts.