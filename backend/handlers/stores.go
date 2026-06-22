package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"jpmall/backend/db"

	"github.com/go-chi/chi/v5"
)

type storeResponse struct {
	ID      int    `json:"id"`
	Code    string `json:"code"`
	Name    string `json:"name"`
	Segment string `json:"segment,omitempty"`
	Email   string `json:"email,omitempty"`
	Phone   string `json:"phone,omitempty"`
}

// GET /api/stores
func ListStores(w http.ResponseWriter, r *http.Request) {
	search := queryParam(r, "search")
	segment := queryParam(r, "segment")

	conds := []string{}
	args := []any{}
	i := 1

	if search != "" {
		conds = append(conds, fmt.Sprintf("(name ILIKE $%d OR code ILIKE $%d OR segment ILIKE $%d)", i, i, i))
		args = append(args, "%"+search+"%")
		i++
	}
	if segment != "" {
		conds = append(conds, fmt.Sprintf("segment ILIKE $%d", i))
		args = append(args, "%"+segment+"%")
	}

	where := ""
	if len(conds) > 0 {
		where = " WHERE " + strings.Join(conds, " AND ")
	}

	rows, err := db.Pool.Query(context.Background(),
		"SELECT id, code, name, COALESCE(segment,'') FROM stores"+where+" ORDER BY name ASC",
		args...)
	if err != nil {
		jsonError(w, "Erro ao buscar lojas.", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	stores := []storeResponse{}
	for rows.Next() {
		var s storeResponse
		if err := rows.Scan(&s.ID, &s.Code, &s.Name, &s.Segment); err == nil {
			stores = append(stores, s)
		}
	}
	jsonResponse(w, http.StatusOK, stores)
}

// GET /api/stores/{id}
// Retorna email e phone se as colunas existirem (migration 004).
func GetStore(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var s storeResponse

	// Tenta com email/phone (migration 004 aplicada)
	err := db.Pool.QueryRow(context.Background(),
		`SELECT id, code, name, COALESCE(segment,''), COALESCE(email,''), COALESCE(phone,'')
		 FROM stores WHERE id = $1`, id).
		Scan(&s.ID, &s.Code, &s.Name, &s.Segment, &s.Email, &s.Phone)

	if err != nil {
		// Fallback: colunas email/phone podem não existir ainda
		err2 := db.Pool.QueryRow(context.Background(),
			`SELECT id, code, name, COALESCE(segment,'') FROM stores WHERE id = $1`, id).
			Scan(&s.ID, &s.Code, &s.Name, &s.Segment)
		if err2 != nil {
			jsonError(w, "Loja não encontrada.", http.StatusNotFound)
			return
		}
	}
	jsonResponse(w, http.StatusOK, s)
}

// PUT /api/stores/{id}/contact
// Atualiza email e phone (WhatsApp) da loja.
func UpdateStoreContact(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	ctx := context.Background()

	var body struct {
		Email string `json:"email"`
		Phone string `json:"phone"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON inválido.", http.StatusBadRequest)
		return
	}

	email := strings.TrimSpace(body.Email)
	phone := strings.TrimSpace(body.Phone)

	// Validação básica de email
	if email != "" && !strings.Contains(email, "@") {
		jsonError(w, "Email inválido.", http.StatusBadRequest)
		return
	}

	// Garantir que as colunas existem (migration 004 pode não ter sido aplicada)
	db.Pool.Exec(ctx, `ALTER TABLE stores ADD COLUMN IF NOT EXISTS email VARCHAR(255)`)
	db.Pool.Exec(ctx, `ALTER TABLE stores ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`)

	var s storeResponse
	err := db.Pool.QueryRow(ctx, `
		UPDATE stores
		   SET email = NULLIF($1, ''),
		       phone = NULLIF($2, '')
		 WHERE id = $3
		RETURNING id, code, name, COALESCE(segment,''), COALESCE(email,''), COALESCE(phone,'')`,
		email, phone, id).
		Scan(&s.ID, &s.Code, &s.Name, &s.Segment, &s.Email, &s.Phone)

	if err != nil {
		jsonError(w, "Loja não encontrada.", http.StatusNotFound)
		return
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"success": true,
		"store":   s,
	})
}

// GET /api/stores/meta/segments
func ListSegments(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Pool.Query(context.Background(),
		"SELECT DISTINCT segment FROM stores WHERE segment IS NOT NULL AND segment <> '' ORDER BY segment")
	if err != nil {
		jsonError(w, "Erro ao buscar segmentos.", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	segs := []string{}
	for rows.Next() {
		var s string
		if rows.Scan(&s) == nil {
			segs = append(segs, s)
		}
	}
	jsonResponse(w, http.StatusOK, segs)
}
