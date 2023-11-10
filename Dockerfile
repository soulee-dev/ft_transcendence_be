FROM node:lts-alpine

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD npx prisma migrate dev --name=transcendence && npm run start:dev