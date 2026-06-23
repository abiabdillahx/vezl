package geo

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type Location struct {
	Country string
	Region  string
	City    string
}

var client = &http.Client{Timeout: 2 * time.Second}

func Lookup(ip string) (*Location, error) {
	resp, err := client.Get(fmt.Sprintf("http://ip-api.com/json/%s?fields=country,regionName,city", ip))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Country    string `json:"country"`
		RegionName string `json:"regionName"`
		City       string `json:"city"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &Location{Country: result.Country, Region: result.RegionName, City: result.City}, nil
}
