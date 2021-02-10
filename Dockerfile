FROM node:14-alpine
COPY . /app
WORKDIR /app
RUN yarn install
ENTRYPOINT [ "yarn", "start" ]