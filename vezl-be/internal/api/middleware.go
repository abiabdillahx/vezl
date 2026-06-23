package api

import (
	"bytes"
	"encoding/json"
	"regexp"

	"github.com/gin-gonic/gin"
)

// FlattenNullTypes middleware fixes sql.NullString/sql.NullTime serialization.
// Converts {"String":"x","Valid":true} → "x" and {"Valid":false} → null in JSON responses.
var nullObjRe = regexp.MustCompile(`\{[^{}]*"(?:String|Time)"[^{}]*"Valid"\s*:\s*(?:true|false)[^{}]*\}`)

func FlattenNullTypes() gin.HandlerFunc {
	return func(c *gin.Context) {
		w := &bodyWriter{ResponseWriter: c.Writer, body: &bytes.Buffer{}}
		c.Writer = w
		c.Next()

		if w.body.Len() == 0 {
			return
		}

		ct := w.Header().Get("Content-Type")
		if ct != "application/json; charset=utf-8" && ct != "application/json" && ct != "" {
			w.ResponseWriter.Write(w.body.Bytes())
			return
		}

		fixed := nullObjRe.ReplaceAllFunc(w.body.Bytes(), func(match []byte) []byte {
			var obj map[string]json.RawMessage
			if err := json.Unmarshal(match, &obj); err != nil {
				return match
			}
			valid, ok := obj["Valid"]
			if !ok {
				return match
			}
			var isValid bool
			json.Unmarshal(valid, &isValid)
			if !isValid {
				return []byte("null")
			}
			for _, key := range []string{"String", "Time"} {
				if v, ok := obj[key]; ok {
					return v
				}
			}
			return match
		})

		w.ResponseWriter.Write(fixed)
	}
}

type bodyWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *bodyWriter) Write(b []byte) (int, error) {
	return w.body.Write(b)
}

func (w *bodyWriter) WriteHeaderNow() {}
func (w *bodyWriter) Written() bool   { return w.body.Len() > 0 }