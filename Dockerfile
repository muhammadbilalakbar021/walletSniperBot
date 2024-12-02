FROM node:18.19-alpine as build-deps
RUN envVersion="Running Production" && echo $envVersion

WORKDIR /usr/app
COPY package.json yarn.lock ./

ADD . ./
RUN file="$(ls -1 /usr/app)" && echo $file
RUN yarn && yarn build

FROM node:18.19-alpine
# RUN apk add --no-cache redis
WORKDIR /blockrock
COPY --from=build-deps /usr/app/node_modules /blockrock/node_modules
COPY --from=build-deps /usr/app/package.json  /blockrock/package.json
COPY --from=build-deps /usr/app/yarn.lock /blockrock/yarn.lock
COPY --from=build-deps /usr/app/tsconfig.build.json  /blockrock/tsconfig.build.json
COPY --from=build-deps /usr/app/dist /blockrock/dist
COPY env  /blockrock/env

EXPOSE 8080
CMD ["yarn","start"]

# CMD ["sh", "-c", "/usr/bin/redis-server & yarn start"]
# /usr/bin/redis-server & yarn start