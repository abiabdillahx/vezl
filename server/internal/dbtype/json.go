// Package dbtype holds column types shared by the generated sqlc code.
package dbtype

import (
	"database/sql/driver"
	"fmt"
)

// JSON is a JSON document stored as TEXT in SQLite. It is written to the
// database as text and marshals to API responses as raw JSON (not a string).
type JSON []byte

func (j JSON) Value() (driver.Value, error) {
	if len(j) == 0 {
		return "{}", nil
	}
	return string(j), nil
}

func (j *JSON) Scan(src any) error {
	switch v := src.(type) {
	case nil:
		*j = JSON("{}")
	case string:
		*j = JSON(v)
	case []byte:
		*j = append(JSON(nil), v...)
	default:
		return fmt.Errorf("dbtype.JSON: cannot scan %T", src)
	}
	return nil
}

func (j JSON) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte("{}"), nil
	}
	return j, nil
}

func (j *JSON) UnmarshalJSON(b []byte) error {
	*j = append((*j)[:0], b...)
	return nil
}
