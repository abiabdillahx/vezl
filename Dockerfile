# Stage 1: Build web
FROM --platform=linux/amd64 node:22-alpine AS web-builder
ARG SITE_URL
ENV VITE_SITE_URL=$SITE_URL
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Build Go server binary
FROM --platform=linux/amd64 golang:1.23-alpine AS server-builder
WORKDIR /app/server
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/ ./
COPY --from=web-builder /app/web/dist ./internal/static/dist
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o vezl ./cmd/vezl

# Stage 3: Runtime
FROM --platform=linux/amd64 alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=server-builder /app/server/vezl /vezl
ENV DATABASE_PATH=/data/vezl.db \
    GEO_DB_PATH=/data/geo.mmdb
VOLUME /data
EXPOSE 3000
ENTRYPOINT ["/vezl"]