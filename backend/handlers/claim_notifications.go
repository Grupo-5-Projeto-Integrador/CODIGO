package handlers

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"jpmall/backend/db"

	"github.com/go-chi/chi/v5"
)

// ClaimNotificationsHandler não precisa de configuração — SMTP não implementado.
type ClaimNotificationsHandler struct{}

// ClaimNotifRecord representa uma linha da tabela claim_notifications.
type ClaimNotifRecord struct {
	ID             int       `json:"id"`
	RecipientType  string    `json:"recipient_type"`
	RecipientName  string    `json:"recipient_name"`
	RecipientEmail string    `json:"recipient_email"`
	RecipientPhone string    `json:"recipient_phone"`
	Channel        string    `json:"channel"`
	Subject        string    `json:"subject"`
	Message        string    `json:"message"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"created_at"`
}

// GET /api/claims/{id}/notification-data
func (h *ClaimNotificationsHandler) GetNotificationData(w http.ResponseWriter, r *http.Request) {
	claimID := chi.URLParam(r, "id")
	ctx := context.Background()

	// Passo 1 — busca dados do sinistro (sem JOIN em stores, sempre funciona)
	var claimCode, storeName, date, severity, status, description, responsibleArea string
	err := db.Pool.QueryRow(ctx, `
		SELECT id, store, date::text, severity, status, description,
		       COALESCE(responsible_area, '')
		FROM claims_v2
		WHERE id = $1`, claimID).
		Scan(&claimCode, &storeName, &date, &severity, &status, &description, &responsibleArea)
	if err != nil {
		jsonError(w, "Sinistro não encontrado.", http.StatusNotFound)
		return
	}

	// Passo 2 — garante colunas de contato e busca a loja correspondente
	db.Pool.Exec(ctx, `ALTER TABLE stores ADD COLUMN IF NOT EXISTS email VARCHAR(255)`)
	db.Pool.Exec(ctx, `ALTER TABLE stores ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`)

	var storeID int
	var storeCode, storeEmail, storePhone string

	// Tenta via claim_stores (join por ID, mais confiável) — ignora se tabela não existe
	db.Pool.QueryRow(ctx, `
		SELECT s.id, COALESCE(s.code,''), COALESCE(s.email,''), COALESCE(s.phone,'')
		FROM claim_stores cs
		INNER JOIN stores s ON s.id = cs.store_id
		WHERE cs.claim_id = $1
		LIMIT 1`, claimID).
		Scan(&storeID, &storeCode, &storeEmail, &storePhone)

	// Fallback: correspondência por nome (case-insensitive, sem espaços extras)
	if storeID == 0 {
		db.Pool.QueryRow(ctx, `
			SELECT id, COALESCE(code,''), COALESCE(email,''), COALESCE(phone,'')
			FROM stores
			WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
			LIMIT 1`, storeName).
			Scan(&storeID, &storeCode, &storeEmail, &storePhone)
	}

	history := loadClaimNotifHistory(ctx, claimID)

	jsonResponse(w, http.StatusOK, map[string]any{
		"claim_code":       claimCode,
		"store_id":         storeID,
		"store_name":       storeName,
		"store_code":       storeCode,
		"store_email":      storeEmail,
		"store_phone":      storePhone,
		"date":             date,
		"severity":         severity,
		"status":           status,
		"description":      description,
		"responsible_area": responsibleArea,
		"history":          history,
	})
}

// GET /api/claims/{id}/whatsapp-link
func (h *ClaimNotificationsHandler) GetWhatsAppLink(w http.ResponseWriter, r *http.Request) {
	claimID := chi.URLParam(r, "id")
	ctx := context.Background()

	// Passo 1 — dados do sinistro
	var storeName, date, severity, status, description, responsibleArea string
	err := db.Pool.QueryRow(ctx, `
		SELECT store, date::text, severity, status, description,
		       COALESCE(responsible_area, '')
		FROM claims_v2
		WHERE id = $1`, claimID).
		Scan(&storeName, &date, &severity, &status, &description, &responsibleArea)
	if err != nil {
		jsonError(w, "Sinistro não encontrado.", http.StatusNotFound)
		return
	}

	// Passo 2 — busca loja (mesma lógica: claim_stores → nome)
	var storeCode, storePhone string
	db.Pool.QueryRow(ctx, `
		SELECT COALESCE(s.code,''), COALESCE(s.phone,'')
		FROM claim_stores cs
		INNER JOIN stores s ON s.id = cs.store_id
		WHERE cs.claim_id = $1
		LIMIT 1`, claimID).
		Scan(&storeCode, &storePhone)

	if storePhone == "" && storeCode == "" {
		db.Pool.QueryRow(ctx, `
			SELECT COALESCE(code,''), COALESCE(phone,'')
			FROM stores
			WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
			LIMIT 1`, storeName).
			Scan(&storeCode, &storePhone)
	}

	phone := normalizePhone(storePhone)
	if phone == "" {
		phone = "556232511000"
	}

	dateFormatted := date
	if t, parseErr := time.Parse("2006-01-02", date); parseErr == nil {
		dateFormatted = t.Format("02/01/2006")
	}

	storeLabel := storeName
	if storeCode != "" {
		storeLabel = storeName + " - " + storeCode
	}

	areaLine := ""
	if responsibleArea != "" {
		areaLine = "Área responsável: " + responsibleArea + "\n"
	}

	msg := fmt.Sprintf(`Prezado lojista,

Informamos que foi registrado um sinistro vinculado à sua unidade no Flamboyant Shopping.

Código do sinistro: %s
Loja/LUC: %s
Data: %s
Gravidade: %s
Status: %s
%s
Descrição:
%s

Solicitamos atenção ao caso e acompanhamento junto à administração do shopping.

Atenciosamente,
Equipe de Gestão de Sinistros
Flamboyant Shopping`,
		claimID, storeLabel, dateFormatted, severity, status, areaLine, description)

	waURL := "https://wa.me/" + phone + "?text=" + url.QueryEscape(msg)

	db.Pool.Exec(ctx, `
		INSERT INTO claim_notifications
		    (claim_id, recipient_type, recipient_name, recipient_phone, channel, message, status)
		VALUES ($1, 'store', $2, $3, 'whatsapp', $4, 'link_generated')`,
		claimID, storeName, phone, msg)

	db.Pool.Exec(ctx, `
		INSERT INTO notifications (title, message, type, priority, claim_id)
		VALUES ($1, $2, 'whatsapp', 'normal', $3)`,
		"WhatsApp gerado — "+claimID,
		"Link gerado para "+storeName+" ("+phone+")",
		claimID)

	jsonResponse(w, http.StatusOK, map[string]any{
		"phone":   phone,
		"message": msg,
		"url":     waURL,
	})
}

// GET /api/claims/{id}/notifications
func (h *ClaimNotificationsHandler) GetClaimNotifications(w http.ResponseWriter, r *http.Request) {
	claimID := chi.URLParam(r, "id")
	ctx := context.Background()
	notifs := loadClaimNotifHistory(ctx, claimID)
	jsonResponse(w, http.StatusOK, map[string]any{"notifications": notifs})
}

func loadClaimNotifHistory(ctx context.Context, claimID string) []ClaimNotifRecord {
	out := []ClaimNotifRecord{}
	rows, err := db.Pool.Query(ctx, `
		SELECT id, recipient_type,
		       COALESCE(recipient_name,''), COALESCE(recipient_email,''),
		       COALESCE(recipient_phone,''), channel, COALESCE(subject,''),
		       message, status, created_at
		FROM claim_notifications
		WHERE claim_id = $1
		ORDER BY created_at DESC`, claimID)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var n ClaimNotifRecord
		if scanErr := rows.Scan(
			&n.ID, &n.RecipientType, &n.RecipientName, &n.RecipientEmail,
			&n.RecipientPhone, &n.Channel, &n.Subject, &n.Message, &n.Status, &n.CreatedAt,
		); scanErr == nil {
			out = append(out, n)
		}
	}
	return out
}

func normalizePhone(raw string) string {
	r := strings.NewReplacer(" ", "", "(", "", ")", "", "-", "", ".", "", "+", "")
	p := r.Replace(raw)
	if p == "" {
		return ""
	}
	if !strings.HasPrefix(p, "55") {
		p = "55" + p
	}
	return p
}
