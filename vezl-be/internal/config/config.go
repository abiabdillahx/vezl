package config

import (
	"os"
	"strconv"
)

type Config struct {
	DatabaseURL         string
	SessionSecret       string
	Port                string
	BaseURL             string
	AdminEmail          string
	AdminUsername       string
	AdminPassword       string
	GeoEnabled          bool
	GeoProvider         string
	VTAPIKey            string
	RegistrationEnabled bool
	SessionExpiryDays   int
}

func Load() *Config {
	return &Config{
		DatabaseURL:         mustEnv("DATABASE_URL"),
		SessionSecret:       mustEnv("SESSION_SECRET"),
		Port:                getEnv("PORT", "3000"),
		BaseURL:             getEnv("BASE_URL", ""),
		AdminEmail:          getEnv("ADMIN_EMAIL", ""),
		AdminUsername:       getEnv("ADMIN_USERNAME", "admin"),
		AdminPassword:       getEnv("ADMIN_PASSWORD", ""),
		GeoEnabled:          getEnvBool("GEO_ENABLED", true),
		GeoProvider:         getEnv("GEO_PROVIDER", "ip-api"),
		VTAPIKey:            getEnv("VTAPI_KEY", ""),
		RegistrationEnabled: getEnvBool("REGISTRATION_ENABLED", false),
		SessionExpiryDays:   getEnvInt("SESSION_EXPIRY_DAYS", 30),
	}
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic("required env var missing: " + key)
	}
	return v
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return b
}

func getEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	i, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return i
}
