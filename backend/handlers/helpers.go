package handlers

import (
	"encoding/json"
	"net/http"
)

// JSONResponse é exportado para uso em main.go (ex: health check).
func JSONResponse(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func jsonResponse(w http.ResponseWriter, status int, data any) {
	JSONResponse(w, status, data)
}

func jsonError(w http.ResponseWriter, msg string, status int) {
	jsonResponse(w, status, map[string]string{"error": msg})
}

func queryParam(r *http.Request, key string) string {
	return r.URL.Query().Get(key)
}

func queryParamDefault(r *http.Request, key, def string) string {
	if v := r.URL.Query().Get(key); v != "" {
		return v
	}
	return def
}
