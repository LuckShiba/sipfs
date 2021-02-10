FROM node:14-alpine
COPY . /app
WORKDIR /app
RUN apk --no-cache add --virtual native-deps make gcc g++ python
RUN yarn install
ENTRYPOINT [ "yarn", "start" ]