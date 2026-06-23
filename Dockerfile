# Stage 1: Build FE
FROM --platform=linux/amd64 node:22-alpine AS fe-builder
WORKDIR /app/vezl-fe
COPY vezl-fe/package*.json ./
RUN npm ci
COPY vezl-fe/ ./
RUN npm run build

# Stage 2: Build Go binary
FROM --platform=linux/amd64 golang:1.23-alpine AS go-builder
WORKDIR /app/vezl-be
COPY vezl-be/go.mod vezl-be/go.sum ./
RUN go mod download
COPY vezl-be/ ./
COPY --from=fe-builder /app/vezl-fe/dist ./internal/static/dist
RUN go build -o vezl ./cmd/vezl

# Stage 3: Runtime
FROM --platform=linux/amd64 alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=go-builder /app/vezl-be/vezl /vezl
ENTRYPOINT ["/vezl"]