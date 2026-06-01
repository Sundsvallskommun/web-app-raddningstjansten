# Build the static SPA
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

# Serve with nginx
FROM nginx:alpine AS runner
# Template is envsubst'd at startup using BACKEND_URL (nginx image only substitutes
# variables that exist in the environment, so $host/$uri etc. are left intact).
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html
ENV BACKEND_URL=http://backend:3000
EXPOSE 80
