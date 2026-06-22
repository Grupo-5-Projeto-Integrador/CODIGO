package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"jpmall/backend/db"
	"jpmall/backend/models"

	"github.com/go-chi/chi/v5"
)

// GET /api/notifications
func ListNotifications(w http.ResponseWriter, r *http.Request) {
	isReadParam := queryParam(r, "is_read")

	query := `SELECT id, title, message, type, priority, claim_id, is_read, created_at
	          FROM notifications`
	args := []any{}

	if isReadParam == "true" {
		query += " WHERE is_read = true"
	} else if isReadParam == "false" {
		query += " WHERE is_read = false"
	}
	query += " ORDER BY created_at DESC LIMIT 50"

	rows, err := db.Pool.Query(context.Background(), query, args...)
	if err != nil {
		jsonError(w, "Erro ao buscar notificações.", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	notifs := []*models.Notification{}
	for rows.Next() {
		var n models.Notification
		if err := rows.Scan(&n.ID, &n.Title, &n.Message, &n.Type, &n.Priority,
			&n.ClaimID, &n.IsRead, &n.CreatedAt); err == nil {
			notifs = append(notifs, &n)
		}
	}

	var unread int64
	db.Pool.QueryRow(context.Background(),
		"SELECT COUNT(*) FROM notifications WHERE is_read = false").Scan(&unread)

	jsonResponse(w, http.StatusOK, map[string]any{
		"notifications": notifs,
		"unreadCount":   unread,
	})
}

// PUT /api/notifications/{id}/read
func MarkNotificationRead(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var n models.Notification
	err := db.Pool.QueryRow(context.Background(),
		`UPDATE notifications SET is_read = true WHERE id = $1
		 RETURNING id, title, message, type, priority, claim_id, is_read, created_at`, id).
		Scan(&n.ID, &n.Title, &n.Message, &n.Type, &n.Priority, &n.ClaimID, &n.IsRead, &n.CreatedAt)
	if err != nil {
		jsonError(w, "Notificação não encontrada.", http.StatusNotFound)
		return
	}
	jsonResponse(w, http.StatusOK, n)
}

// PUT /api/notifications/read-all
func MarkAllNotificationsRead(w http.ResponseWriter, r *http.Request) {
	tag, _ := db.Pool.Exec(context.Background(),
		"UPDATE notifications SET is_read = true WHERE is_read = false")
	jsonResponse(w, http.StatusOK, map[string]any{"updated": tag.RowsAffected()})
}

// POST /api/notifications
func CreateNotification(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Title    string  `json:"title"`
		Message  string  `json:"message"`
		Type     string  `json:"type"`
		Priority string  `json:"priority"`
		ClaimID  *string `json:"claim_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Title == "" || body.Message == "" {
		jsonError(w, "title e message são obrigatórios.", http.StatusBadRequest)
		return
	}
	if body.Type == "" {
		body.Type = "sistema"
	}
	if body.Priority == "" {
		body.Priority = "normal"
	}

	var n models.Notification
	err := db.Pool.QueryRow(context.Background(),
		`INSERT INTO notifications (title, message, type, priority, claim_id)
		 VALUES ($1,$2,$3,$4,$5) RETURNING id, title, message, type, priority, claim_id, is_read, created_at`,
		body.Title, body.Message, body.Type, body.Priority, body.ClaimID).
		Scan(&n.ID, &n.Title, &n.Message, &n.Type, &n.Priority, &n.ClaimID, &n.IsRead, &n.CreatedAt)
	if err != nil {
		jsonError(w, "Erro ao criar notificação.", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, http.StatusCreated, n)
}
