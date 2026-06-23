# Stage 1: Build FE
FROM node:22-alpine AS fe-builder
WORKDIR /app/fe
COPY fe/package*.json ./
RUN npm ci
COPY fe/ ./
RUN npm run build

# Stage 2: Build Go binary
FROM golang:1.23-alpine AS go-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=fe-builder /app/fe/dist ./internal/static/dist
RUN go build -o vezl ./cmd/vezl

# Stage 3: Runtime
FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=go-builder /app/vezl /vezl
ENTRYPOINT ["/vezl"]
