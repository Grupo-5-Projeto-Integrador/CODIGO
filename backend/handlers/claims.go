package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"jpmall/backend/db"
	"jpmall/backend/middleware"
	"jpmall/backend/models"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// claimsUser extrai nome, iniciais e papel do usuário autenticado no JWT.
// Retorna "Sistema" / "SI" / "Sistema" se não houver autenticação.
func claimsUser(r *http.Request) (name, initials, role string) {
	claims, ok := r.Context().Value(middleware.UserClaimsKey).(*middleware.UserClaims)
	if !ok || claims == nil || claims.Name == "" {
		return "Sistema", "SI", "Sistema"
	}
	n := claims.Name
	parts := strings.Fields(n)
	ini := "??"
	if len(parts) == 1 {
		if len(parts[0]) >= 2 {
			ini = strings.ToUpper(parts[0][:2])
		} else {
			ini = strings.ToUpper(parts[0])
		}
	} else if len(parts) >= 2 {
		ini = strings.ToUpper(string([]rune(parts[0])[0])) +
			strings.ToUpper(string([]rune(parts[len(parts)-1])[0]))
	}
	rl := claims.Role
	if rl == "" {
		rl = "Usuário"
	}
	return n, ini, rl
}

const uploadDir = "./uploads"
const maxUploadSize = 50 << 20 // 50 MB

var allowedExts = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".pdf": true,
	".mp4": true, ".gif": true, ".webp": true, ".avi": true, ".mov": true,
}

// scanClaim lê uma linha do banco e devolve um Claim populado.
func scanClaim(rows pgx.Rows) (*models.Claim, error) {
	var c models.Claim
	var filesJSON, auditJSON, employeeContactsJSON []byte
	var otherType, responsibleArea, employeeName, employeeContact *string
	var resolvedAt *time.Time
	var compensationAmount *float64
	var dateVal time.Time

	err := rows.Scan(
		&c.ID, &c.Store, &c.Type, &otherType, &c.Severity, &dateVal, &c.Description,
		&responsibleArea, &c.TenantNotified, &c.ResponsibleNotified,
		&employeeName, &employeeContact, &c.Status, &filesJSON, &c.IrregularPolicy,
		&auditJSON, &c.CreatedAt, &c.Responsibility, &compensationAmount, &resolvedAt,
		&employeeContactsJSON,
	)
	if err != nil {
		return nil, err
	}
	c.Date = dateVal.Format("2006-01-02")

	c.OtherType = otherType
	c.ResponsibleArea = responsibleArea
	c.EmployeeName = employeeName
	c.EmployeeContact = employeeContact
	c.ResolvedAt = resolvedAt
	if compensationAmount != nil {
		c.CompensationAmount = *compensationAmount
	}
	if c.Responsibility == "" {
		c.Responsibility = "Externa"
	}

	// Desserializa JSONB
	if len(filesJSON) > 0 {
		_ = json.Unmarshal(filesJSON, &c.Files)
	}
	if c.Files == nil {
		c.Files = []string{}
	}
	if len(auditJSON) > 0 {
		_ = json.Unmarshal(auditJSON, &c.AuditTrail)
	}
	if c.AuditTrail == nil {
		c.AuditTrail = []models.AuditEntry{}
	}
	if len(employeeContactsJSON) > 0 {
		_ = json.Unmarshal(employeeContactsJSON, &c.EmployeeContacts)
	}
	if c.EmployeeContacts == nil {
		c.EmployeeContacts = []models.EmployeeContact{}
	}
	return &c, nil
}

// scanClaimRow é igual a scanClaim mas recebe pgx.Row (query de um único resultado).
func scanClaimRow(row pgx.Row) (*models.Claim, error) {
	var c models.Claim
	var filesJSON, auditJSON, employeeContactsJSON []byte
	var otherType, responsibleArea, employeeName, employeeContact *string
	var resolvedAt *time.Time
	var compensationAmount *float64
	var dateVal time.Time

	err := row.Scan(
		&c.ID, &c.Store, &c.Type, &otherType, &c.Severity, &dateVal, &c.Description,
		&responsibleArea, &c.TenantNotified, &c.ResponsibleNotified,
		&employeeName, &employeeContact, &c.Status, &filesJSON, &c.IrregularPolicy,
		&auditJSON, &c.CreatedAt, &c.Responsibility, &compensationAmount, &resolvedAt,
		&employeeContactsJSON,
	)
	if err != nil {
		return nil, err
	}
	c.Date = dateVal.Format("2006-01-02")

	c.OtherType = otherType
	c.ResponsibleArea = responsibleArea
	c.EmployeeName = employeeName
	c.EmployeeContact = employeeContact
	c.ResolvedAt = resolvedAt
	if compensationAmount != nil {
		c.CompensationAmount = *compensationAmount
	}
	if c.Responsibility == "" {
		c.Responsibility = "Externa"
	}
	if len(filesJSON) > 0 {
		_ = json.Unmarshal(filesJSON, &c.Files)
	}
	if c.Files == nil {
		c.Files = []string{}
	}
	if len(auditJSON) > 0 {
		_ = json.Unmarshal(auditJSON, &c.AuditTrail)
	}
	if c.AuditTrail == nil {
		c.AuditTrail = []models.AuditEntry{}
	}
	if len(employeeContactsJSON) > 0 {
		_ = json.Unmarshal(employeeContactsJSON, &c.EmployeeContacts)
	}
	if c.EmployeeContacts == nil {
		c.EmployeeContacts = []models.EmployeeContact{}
	}
	return &c, nil
}

const claimSelect = `SELECT id, store, type, other_type, severity, date, description,
	responsible_area, tenant_notified, responsible_notified, employee_name, employee_contact,
	status, files, irregular_policy, audit_trail, created_at, responsibility,
	compensation_amount, resolved_at, employee_contacts FROM claims_v2`

// GET /api/claims
func ListClaims(w http.ResponseWriter, r *http.Request) {
	status := queryParam(r, "status")
	store := queryParam(r, "store")
	severity := queryParam(r, "severity")
	search := queryParam(r, "search")
	limit, _ := strconv.Atoi(queryParamDefault(r, "limit", "100"))
	offset, _ := strconv.Atoi(queryParamDefault(r, "offset", "0"))

	conds := []string{}
	args := []any{}
	i := 1

	if status != "" {
		conds = append(conds, fmt.Sprintf("status = $%d", i))
		args = append(args, status)
		i++
	}
	if store != "" {
		conds = append(conds, fmt.Sprintf("store ILIKE $%d", i))
		args = append(args, "%"+store+"%")
		i++
	}
	if severity != "" {
		conds = append(conds, fmt.Sprintf("severity = $%d", i))
		args = append(args, severity)
		i++
	}
	if search != "" {
		conds = append(conds, fmt.Sprintf("(store ILIKE $%d OR description ILIKE $%d OR id ILIKE $%d)", i, i, i))
		args = append(args, "%"+search+"%")
		i++
	}

	where := ""
	if len(conds) > 0 {
		where = " WHERE " + strings.Join(conds, " AND ")
	}

	countArgs := append([]any{}, args...)
	var total int64
	db.Pool.QueryRow(context.Background(), "SELECT COUNT(*) FROM claims_v2"+where, countArgs...).Scan(&total)

	args = append(args, limit, offset)
	query := fmt.Sprintf("%s%s ORDER BY created_at DESC LIMIT $%d OFFSET $%d", claimSelect, where, i, i+1)

	rows, err := db.Pool.Query(context.Background(), query, args...)
	if err != nil {
		jsonError(w, "Erro ao buscar sinistros.", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	claims := []*models.Claim{}
	for rows.Next() {
		c, err := scanClaim(rows)
		if err == nil {
			claims = append(claims, c)
		}
	}
	jsonResponse(w, http.StatusOK, map[string]any{"claims": claims, "total": total})
}

// GET /api/claims/{id}
func GetClaim(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	row := db.Pool.QueryRow(context.Background(), claimSelect+" WHERE id = $1", id)
	c, err := scanClaimRow(row)
	if err != nil {
		jsonError(w, "Sinistro não encontrado.", http.StatusNotFound)
		return
	}
	jsonResponse(w, http.StatusOK, c)
}

// POST /api/claims
func CreateClaim(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize*20)

	var body struct {
		Store               string  `json:"store"`
		StoreIDs            []int   `json:"store_ids"`
		Type                string  `json:"type"`
		OtherType           *string `json:"otherType"`
		Severity            string  `json:"severity"`
		Date                string  `json:"date"`
		Description         string  `json:"description"`
		ResponsibleArea     *string `json:"responsibleArea"`
		TenantNotified      bool    `json:"tenantNotified"`
		ResponsibleNotified bool    `json:"responsibleNotified"`
		EmployeeName        *string                  `json:"employeeName"`
		EmployeeContact     *string                  `json:"employeeContact"`
		EmployeeContacts    []models.EmployeeContact `json:"employeeContacts"`
		IrregularPolicy     bool                     `json:"irregularPolicy"`
		Responsibility      string  `json:"responsibility"`
	}

	// Suporta JSON puro ou multipart/form-data
	ct := r.Header.Get("Content-Type")
	var uploadedFiles []string

	if strings.Contains(ct, "multipart/form-data") {
		if err := r.ParseMultipartForm(maxUploadSize); err != nil {
			jsonError(w, "Erro ao processar upload.", http.StatusBadRequest)
			return
		}
		dataStr := r.FormValue("data")
		if err := json.Unmarshal([]byte(dataStr), &body); err != nil {
			jsonError(w, "JSON inválido no campo 'data'.", http.StatusBadRequest)
			return
		}
		uploadedFiles = saveUploadedFiles(r)
	} else {
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			jsonError(w, "JSON inválido.", http.StatusBadRequest)
			return
		}
	}

	// Se store_ids foi enviado mas store (texto) está vazio, montar label a partir do banco
	if body.Store == "" && len(body.StoreIDs) > 0 {
		var names []string
		for _, sid := range body.StoreIDs {
			var name string
			err := db.Pool.QueryRow(context.Background(),
				"SELECT name FROM stores WHERE id = $1", sid).Scan(&name)
			if err == nil {
				names = append(names, name)
			}
		}
		body.Store = strings.Join(names, ", ")
	}

	if body.Store == "" || body.Type == "" || body.Severity == "" || body.Date == "" || body.Description == "" {
		jsonError(w, "Campos obrigatórios: store, type, severity, date, description.", http.StatusBadRequest)
		return
	}

	if body.Responsibility == "" {
		body.Responsibility = "Externa"
	}

	id := fmt.Sprintf("SIN-%d-%s", time.Now().Year(), uuid.New().String()[:6])

	userName, userInitials, userRole := claimsUser(r)

	auditTrail := []models.AuditEntry{
		{
			ID:           uuid.New().String(),
			User:         userName,
			UserInitials: userInitials,
			UserRole:     userRole,
			Timestamp:    time.Now().Format(time.RFC3339),
			Action:       "Sinistro registrado no sistema",
			Type:         "created",
		},
	}
	if body.TenantNotified {
		auditTrail = append(auditTrail, models.AuditEntry{
			ID: uuid.New().String(), User: userName, UserInitials: userInitials, UserRole: userRole,
			Timestamp: time.Now().Format(time.RFC3339),
			Action:    "Lojista notificado sobre o sinistro", Type: "comment",
		})
	}
	if body.ResponsibleNotified && body.ResponsibleArea != nil {
		auditTrail = append(auditTrail, models.AuditEntry{
			ID: uuid.New().String(), User: userName, UserInitials: userInitials, UserRole: userRole,
			Timestamp: time.Now().Format(time.RFC3339),
			Action:    fmt.Sprintf("Área(s) responsável(is) (%s) notificada(s)", *body.ResponsibleArea),
			Type:      "comment",
		})
	}
	if body.IrregularPolicy {
		auditTrail = append(auditTrail, models.AuditEntry{
			ID: uuid.New().String(), User: userName, UserInitials: userInitials, UserRole: userRole,
			Timestamp: time.Now().Format(time.RFC3339),
			Action:    "⚠️ Loja com apólice irregular detectada", Type: "comment",
		})
	}

	filesJSON, _ := json.Marshal(uploadedFiles)
	auditJSON, _ := json.Marshal(auditTrail)
	if body.EmployeeContacts == nil {
		body.EmployeeContacts = []models.EmployeeContact{}
	}
	empContactsJSON, _ := json.Marshal(body.EmployeeContacts)

	row := db.Pool.QueryRow(context.Background(),
		`INSERT INTO claims_v2
			(id, store, type, other_type, severity, date, description, responsible_area,
			 tenant_notified, responsible_notified, employee_name, employee_contact,
			 status, files, irregular_policy, audit_trail, responsibility, employee_contacts)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'Em análise',$13,$14,$15,$16,$17)
		 RETURNING `+claimColumns,
		id, body.Store, body.Type, body.OtherType, body.Severity, body.Date, body.Description,
		body.ResponsibleArea, body.TenantNotified, body.ResponsibleNotified,
		body.EmployeeName, body.EmployeeContact, filesJSON, body.IrregularPolicy,
		auditJSON, body.Responsibility, empContactsJSON,
	)

	c, err := scanClaimRow(row)
	if err != nil {
		jsonError(w, "Erro ao criar sinistro: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// ── Salvar relacionamento sinistro ↔ lojas ─────────────────────────
	for _, sid := range body.StoreIDs {
		db.Pool.Exec(context.Background(),
			`INSERT INTO claim_stores (claim_id, store_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			id, sid)
	}

	// Notificação automática
	priority := "normal"
	if body.Severity == "Alta" {
		priority = "alta"
	} else if body.Severity == "Média" {
		priority = "media"
	}
	db.Pool.Exec(context.Background(),
		`INSERT INTO notifications (title, message, type, priority, claim_id) VALUES ($1,$2,'sinistro',$3,$4)`,
		fmt.Sprintf("Novo sinistro: %s", id),
		fmt.Sprintf("Sinistro registrado para %s — %s (%s)", body.Store, body.Type, body.Severity),
		priority, id,
	)

	jsonResponse(w, http.StatusCreated, c)
}

// PUT /api/claims/{id}
func UpdateClaim(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var body struct {
		Status              *string              `json:"status"`
		Severity            *string              `json:"severity"`
		Description         *string              `json:"description"`
		ResponsibleArea     *string              `json:"responsibleArea"`
		TenantNotified      *bool                `json:"tenantNotified"`
		ResponsibleNotified *bool                `json:"responsibleNotified"`
		EmployeeName        *string              `json:"employeeName"`
		EmployeeContact     *string              `json:"employeeContact"`
		CompensationAmount  *float64             `json:"compensationAmount"`
		Responsibility      *string              `json:"responsibility"`
		IrregularPolicy     *bool                `json:"irregularPolicy"`
		AuditTrail          *[]models.AuditEntry `json:"auditTrail"`
		Files               *[]string            `json:"files"`
		ResolvedAt          *string              `json:"resolvedAt"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON inválido.", http.StatusBadRequest)
		return
	}

	// Determina resolved_at
	var resolvedAt *string
	if body.ResolvedAt != nil {
		resolvedAt = body.ResolvedAt
	} else if body.Status != nil && (*body.Status == "Concluído" || *body.Status == "Pago") {
		t := time.Now().Format(time.RFC3339)
		resolvedAt = &t
	}

	var auditJSON *[]byte
	if body.AuditTrail != nil {
		b, _ := json.Marshal(body.AuditTrail)
		auditJSON = &b
	}
	var filesJSON *[]byte
	if body.Files != nil {
		b, _ := json.Marshal(body.Files)
		filesJSON = &b
	}

	row := db.Pool.QueryRow(context.Background(),
		`UPDATE claims_v2 SET
			status               = COALESCE($1, status),
			severity             = COALESCE($2, severity),
			description          = COALESCE($3, description),
			responsible_area     = COALESCE($4, responsible_area),
			tenant_notified      = COALESCE($5, tenant_notified),
			responsible_notified = COALESCE($6, responsible_notified),
			employee_name        = COALESCE($7, employee_name),
			employee_contact     = COALESCE($8, employee_contact),
			compensation_amount  = COALESCE($9, compensation_amount),
			responsibility       = COALESCE($10, responsibility),
			irregular_policy     = COALESCE($11, irregular_policy),
			audit_trail          = COALESCE($12::jsonb, audit_trail),
			files                = COALESCE($13::jsonb, files),
			resolved_at          = COALESCE($14::timestamptz, resolved_at)
		WHERE id = $15
		RETURNING `+claimColumns,
		body.Status, body.Severity, body.Description, body.ResponsibleArea,
		body.TenantNotified, body.ResponsibleNotified, body.EmployeeName, body.EmployeeContact,
		body.CompensationAmount, body.Responsibility, body.IrregularPolicy,
		auditJSONBytes(auditJSON), auditJSONBytes(filesJSON), resolvedAt,
		id,
	)

	c, err := scanClaimRow(row)
	if err != nil {
		jsonError(w, "Sinistro não encontrado.", http.StatusNotFound)
		return
	}
	jsonResponse(w, http.StatusOK, c)
}

// POST /api/claims/{id}/audit
func AddAuditEntry(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var entry models.AuditEntry
	if err := json.NewDecoder(r.Body).Decode(&entry); err != nil {
		jsonError(w, "JSON inválido.", http.StatusBadRequest)
		return
	}
	// Sempre usa o usuário autenticado — nunca aceita dados do frontend
	entry.User, entry.UserInitials, entry.UserRole = claimsUser(r)
	entry.ID = uuid.New().String()
	entry.Timestamp = time.Now().Format(time.RFC3339)

	var auditJSON []byte
	db.Pool.QueryRow(context.Background(), "SELECT audit_trail FROM claims_v2 WHERE id = $1", id).Scan(&auditJSON)

	var trail []models.AuditEntry
	_ = json.Unmarshal(auditJSON, &trail)
	trail = append(trail, entry)

	updated, _ := json.Marshal(trail)
	_, err := db.Pool.Exec(context.Background(),
		"UPDATE claims_v2 SET audit_trail = $1::jsonb WHERE id = $2", updated, id)
	if err != nil {
		jsonError(w, "Erro ao registrar auditoria.", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, http.StatusOK, entry)
}

// POST /api/claims/{id}/files
func UploadClaimFiles(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize*20)

	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		jsonError(w, "Erro ao processar upload.", http.StatusBadRequest)
		return
	}

	var existingJSON []byte
	if err := db.Pool.QueryRow(context.Background(), "SELECT files FROM claims_v2 WHERE id = $1", id).Scan(&existingJSON); err != nil {
		jsonError(w, "Sinistro não encontrado.", http.StatusNotFound)
		return
	}

	var existing []string
	_ = json.Unmarshal(existingJSON, &existing)

	newFiles := saveUploadedFiles(r)
	if len(newFiles) == 0 {
		jsonError(w, "Nenhum arquivo válido foi enviado.", http.StatusBadRequest)
		return
	}
	all := append(existing, newFiles...)
	allJSON, _ := json.Marshal(all)

	if _, err := db.Pool.Exec(context.Background(), "UPDATE claims_v2 SET files = $1::jsonb WHERE id = $2", allJSON, id); err != nil {
		jsonError(w, "Erro ao salvar evidências.", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, http.StatusOK, map[string]any{"files": all})
}

// DELETE /api/claims/{id}
func DeleteClaim(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	tag, err := db.Pool.Exec(context.Background(), "DELETE FROM claims_v2 WHERE id = $1", id)
	if err != nil || tag.RowsAffected() == 0 {
		jsonError(w, "Sinistro não encontrado.", http.StatusNotFound)
		return
	}
	jsonResponse(w, http.StatusOK, map[string]string{"deleted": id})
}

// ── helpers internos ────────────────────────────────────────────────────────

const claimColumns = `id, store, type, other_type, severity, date, description,
	responsible_area, tenant_notified, responsible_notified, employee_name, employee_contact,
	status, files, irregular_policy, audit_trail, created_at, responsibility,
	compensation_amount, resolved_at, employee_contacts`

func auditJSONBytes(b *[]byte) any {
	if b == nil {
		return nil
	}
	return *b
}

func saveUploadedFiles(r *http.Request) []string {
	os.MkdirAll(uploadDir, 0755)
	var saved []string
	if r.MultipartForm == nil {
		return saved
	}
	for _, fHeaders := range r.MultipartForm.File {
		for _, fh := range fHeaders {
			ext := strings.ToLower(filepath.Ext(fh.Filename))
			if !allowedExts[ext] {
				continue
			}
			src, err := fh.Open()
			if err != nil {
				continue
			}
			defer src.Close()

			fname := fmt.Sprintf("%d-%s%s", time.Now().UnixNano(), uuid.New().String()[:8], ext)
			dst, err := os.Create(filepath.Join(uploadDir, fname))
			if err != nil {
				continue
			}
			defer dst.Close()
			io.Copy(dst, src)
			saved = append(saved, fname)
		}
	}
	return saved
}
