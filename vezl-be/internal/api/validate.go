package api

import (
	"errors"
	"net/url"
	"regexp"
	"strings"
)

var shortcodeRe = regexp.MustCompile(`^[A-Za-z0-9_-]{1,64}$`)

// Single-segment paths the SPA/server own. A shortcode with one of these names
// would be matched before the SPA fallback and hijack the page.
var reservedShortcodes = map[string]bool{
	"login":    true,
	"links":    true,
	"settings": true,
	"admin":    true,
	"api":      true,
	"debug":    true,
	"assets":   true,
}

func IsReservedShortcode(code string) bool {
	return reservedShortcodes[strings.ToLower(code)]
}

func validateShortcode(code string) error {
	if !shortcodeRe.MatchString(code) {
		return errors.New("shortcode must be 1-64 characters: letters, digits, '-' or '_'")
	}
	if IsReservedShortcode(code) {
		return errors.New("shortcode is reserved")
	}
	return nil
}

// validateTargetURL accepts only absolute http(s) URLs with a host.
func validateTargetURL(raw string) error {
	if strings.ContainsAny(raw, "\\ \t\r\n") {
		return errors.New("original_url contains invalid characters")
	}
	u, err := url.Parse(raw)
	if err != nil {
		return errors.New("original_url is not a valid URL")
	}
	if s := strings.ToLower(u.Scheme); s != "http" && s != "https" {
		return errors.New("original_url must start with http:// or https://")
	}
	if HostOf(raw) == "" {
		return errors.New("original_url must include a host")
	}
	return nil
}

// HostOf returns the normalized (lowercase, no port/userinfo/trailing dot)
// hostname of rawURL, or "" if it can't be parsed.
func HostOf(rawURL string) string {
	u, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil {
		return ""
	}
	return strings.TrimSuffix(strings.ToLower(u.Hostname()), ".")
}

// normalizeDomain turns watchlist input ("Evil.com", "https://evil.com/x", "*.evil.com")
// into the bare lowercase host that GetWatchlistByDomain matches against.
func normalizeDomain(d string) string {
	d = strings.TrimPrefix(strings.TrimSpace(d), "*.")
	if !strings.Contains(d, "://") {
		d = "http://" + d
	}
	return HostOf(d)
}
