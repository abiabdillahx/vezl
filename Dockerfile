# syntax=docker/dockerfile:1

# Build stages run on the builder's native platform ($BUILDPLATFORM); Go
# cross-compiles to the target, so multi-arch builds need no emulation.

# Stage 1: Build web (platform-independent static files)
FROM --platform=$BUILDPLATFORM node:22-alpine AS web-builder
ARG SITE_URL
ENV VITE_SITE_URL=$SITE_URL
WORKDIR /app/web
COPY web/package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build

# Stage 2: Build Go server binary for the target platform
FROM --platform=$BUILDPLATFORM golang:1.23-alpine AS server-builder
ARG TARGETOS
ARG TARGETARCH
WORKDIR /app/server
COPY server/go.mod server/go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY server/ ./
COPY --from=web-builder /app/web/dist ./internal/static/dist
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH \
    go build -trimpath -ldflags="-s -w" -o vezl ./cmd/vezl

# Stage 3: Runtime (no RUN steps, so non-native targets need no emulation)
FROM alpine:3.20
COPY --from=server-builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=server-builder /app/server/vezl /vezl
ENV DATABASE_PATH=/data/vezl.db \
    GEO_DB_PATH=/data/geo.mmdb
VOLUME /data
EXPOSE 3000
ENTRYPOINT ["/vezl"]
