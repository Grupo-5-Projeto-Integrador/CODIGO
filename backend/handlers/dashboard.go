package handlers

import (
	"context"
	"encoding/json"
	"math"
	"net/http"
	"strings"
	"time"

	"jpmall/backend/db"
	"jpmall/backend/models"
)

var ptMonths = [12]string{"Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"}

type monthSlot struct {
	Y, M  int
	Label string
}

func lastNMonths(n int) []monthSlot {
	now := time.Now()
	out := make([]monthSlot, n)
	for i := 0; i < n; i++ {
		d := now.AddDate(0, -(n - 1 - i), 0)
		d = time.Date(d.Year(), d.Month(), 1, 0, 0, 0, 0, time.UTC)
		out[i] = monthSlot{d.Year(), int(d.Month()), ptMonths[d.Month()-1]}
	}
	return out
}

// GET /api/dashboard/stats
func DashboardStats(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	stats := &models.DashboardStats{}

	// Ativos
	db.Pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM claims_v2 WHERE status NOT IN ('Concluído','Cancelado','Pago')").
		Scan(&stats.Active)

	// Últimos 12 meses
	db.Pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM claims_v2 WHERE created_at >= NOW() - INTERVAL '12 months'").
		Scan(&stats.Last12Months)

	// Total de lojas
	db.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM stores").Scan(&stats.TotalStores)
	if stats.TotalStores == 0 {
		stats.TotalStores = 1
	}

	// Volume mensal — últimos 6 meses
	rows, _ := db.Pool.Query(ctx, `
		SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS mes,
		       COUNT(*) AS sinistros
		FROM claims_v2
		WHERE created_at >= NOW() - INTERVAL '6 months'
		GROUP BY DATE_TRUNC('month', created_at)
		ORDER BY DATE_TRUNC('month', created_at) ASC`)
	if rows != nil {
		for rows.Next() {
			var mc models.MonthCount
			rows.Scan(&mc.Mes, &mc.Sinistros)
			stats.VolumeMensal = append(stats.VolumeMensal, mc)
		}
		rows.Close()
	}
	if stats.VolumeMensal == nil {
		stats.VolumeMensal = []models.MonthCount{}
	}

	// Índice de sinistralidade mensal
	rows, _ = db.Pool.Query(ctx, `
		SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS mes,
		       COUNT(DISTINCT store) AS lojas
		FROM claims_v2
		WHERE created_at >= NOW() - INTERVAL '6 months'
		GROUP BY DATE_TRUNC('month', created_at)
		ORDER BY DATE_TRUNC('month', created_at) ASC`)
	if rows != nil {
		for rows.Next() {
			var mes string
			var lojas int64
			rows.Scan(&mes, &lojas)
			indice := math.Round((float64(lojas)/float64(stats.TotalStores))*1000) / 10
			stats.IndiceMensal = append(stats.IndiceMensal, models.MonthRate{Mes: mes, Indice: indice})
		}
		rows.Close()
	}
	if stats.IndiceMensal == nil {
		stats.IndiceMensal = []models.MonthRate{}
	}

	// Por status
	rows, _ = db.Pool.Query(ctx, "SELECT status, COUNT(*) FROM claims_v2 GROUP BY status ORDER BY COUNT(*) DESC")
	if rows != nil {
		for rows.Next() {
			var sc models.StatusCount
			rows.Scan(&sc.Status, &sc.Total)
			stats.ByStatus = append(stats.ByStatus, sc)
		}
		rows.Close()
	}
	if stats.ByStatus == nil {
		stats.ByStatus = []models.StatusCount{}
	}

	// Por severidade
	rows, _ = db.Pool.Query(ctx, "SELECT severity, COUNT(*) FROM claims_v2 GROUP BY severity ORDER BY COUNT(*) DESC")
	if rows != nil {
		for rows.Next() {
			var sc models.SeverityCount
			rows.Scan(&sc.Severity, &sc.Total)
			stats.BySeverity = append(stats.BySeverity, sc)
		}
		rows.Close()
	}
	if stats.BySeverity == nil {
		stats.BySeverity = []models.SeverityCount{}
	}

	// Por tipo
	rows, _ = db.Pool.Query(ctx, "SELECT type, COUNT(*) FROM claims_v2 GROUP BY type ORDER BY COUNT(*) DESC")
	if rows != nil {
		for rows.Next() {
			var tc models.TypeCount
			rows.Scan(&tc.Type, &tc.Total)
			stats.ByType = append(stats.ByType, tc)
		}
		rows.Close()
	}
	if stats.ByType == nil {
		stats.ByType = []models.TypeCount{}
	}

	// Top lojas
	rows, _ = db.Pool.Query(ctx,
		"SELECT store, COUNT(*) FROM claims_v2 GROUP BY store ORDER BY COUNT(*) DESC LIMIT 10")
	if rows != nil {
		for rows.Next() {
			var sc models.StoreCount
			rows.Scan(&sc.Store, &sc.Total)
			stats.TopStores = append(stats.TopStores, sc)
		}
		rows.Close()
	}
	if stats.TopStores == nil {
		stats.TopStores = []models.StoreCount{}
	}

	jsonResponse(w, http.StatusOK, stats)
}

// GET /api/dashboard/recent
func DashboardRecent(w http.ResponseWriter, r *http.Request) {
	type RecentItem struct {
		ID              string    `json:"id"`
		Store           string    `json:"store"`
		Type            string    `json:"type"`
		Severity        string    `json:"severity"`
		Status          string    `json:"status"`
		Date            string    `json:"date"`
		TenantNotified  bool      `json:"tenantNotified"`
		IrregularPolicy bool      `json:"irregularPolicy"`
		CreatedAt       time.Time `json:"createdAt"`
	}

	rows, err := db.Pool.Query(context.Background(),
		`SELECT id, store, type, severity, status, date, tenant_notified, irregular_policy, created_at
		 FROM claims_v2 ORDER BY created_at DESC LIMIT 10`)
	if err != nil {
		jsonError(w, "Erro ao buscar atividades recentes.", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	items := []RecentItem{}
	for rows.Next() {
		var item RecentItem
		var filesRaw []byte
		_ = filesRaw
		if err := rows.Scan(&item.ID, &item.Store, &item.Type, &item.Severity,
			&item.Status, &item.Date, &item.TenantNotified, &item.IrregularPolicy, &item.CreatedAt); err == nil {
			items = append(items, item)
		}
	}

	// Serializa como array de maps para compatibilidade com o frontend
	out := make([]map[string]any, len(items))
	for i, item := range items {
		b, _ := json.Marshal(item)
		json.Unmarshal(b, &out[i])
	}
	jsonResponse(w, http.StatusOK, out)
}

// GET /api/dashboard/summary
func DashboardSummary(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	var totalStores int64
	db.Pool.QueryRow(ctx, `SELECT COALESCE(COUNT(*),0) FROM stores`).Scan(&totalStores)
	if totalStores == 0 {
		totalStores = 1
	}

	var activeClaims int64
	db.Pool.QueryRow(ctx,
		`SELECT COALESCE(COUNT(*),0) FROM claims_v2 WHERE status NOT IN ('Concluído','Cancelado','Pago')`).
		Scan(&activeClaims)

	var last12 int64
	db.Pool.QueryRow(ctx,
		`SELECT COALESCE(COUNT(*),0) FROM claims_v2 WHERE created_at >= NOW()-INTERVAL '12 months'`).
		Scan(&last12)

	var avgHours float64
	db.Pool.QueryRow(ctx,
		`SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600),0)
		 FROM claims_v2 WHERE resolved_at IS NOT NULL AND status IN ('Concluído','Pago')`).
		Scan(&avgHours)

	var highCount, medCount, lowCount int64
	db.Pool.QueryRow(ctx, `SELECT COALESCE(COUNT(*),0) FROM claims_v2 WHERE severity='Alta'`).Scan(&highCount)
	db.Pool.QueryRow(ctx, `SELECT COALESCE(COUNT(*),0) FROM claims_v2 WHERE severity='Média'`).Scan(&medCount)
	db.Pool.QueryRow(ctx, `SELECT COALESCE(COUNT(*),0) FROM claims_v2 WHERE severity='Baixa'`).Scan(&lowCount)

	var openCount, closedCount int64
	db.Pool.QueryRow(ctx,
		`SELECT COALESCE(COUNT(*),0) FROM claims_v2 WHERE status IN ('Em análise','Aguardando seguradora')`).
		Scan(&openCount)
	db.Pool.QueryRow(ctx,
		`SELECT COALESCE(COUNT(*),0) FROM claims_v2 WHERE status IN ('Concluído','Pago')`).
		Scan(&closedCount)

	var distinctStores int64
	db.Pool.QueryRow(ctx, `SELECT COALESCE(COUNT(DISTINCT store),0) FROM claims_v2`).Scan(&distinctStores)
	sinistralidade := math.Round(float64(distinctStores)/float64(totalStores)*1000) / 10

	jsonResponse(w, http.StatusOK, map[string]any{
		"active_claims":            activeClaims,
		"sinistrality_rate":        sinistralidade,
		"average_resolution_hours": math.Round(avgHours),
		"last_12_months_total":     last12,
		"high_count":               highCount,
		"medium_count":             medCount,
		"low_count":                lowCount,
		"open_count":               openCount,
		"closed_count":             closedCount,
	})
}

// GET /api/dashboard/monthly-claims
func DashboardMonthlyClaims(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	months := lastNMonths(6)
	cutoff := time.Date(months[0].Y, time.Month(months[0].M), 1, 0, 0, 0, 0, time.UTC)

	rows, _ := db.Pool.Query(ctx, `
		SELECT EXTRACT(YEAR FROM created_at)::int, EXTRACT(MONTH FROM created_at)::int, COUNT(*)
		FROM claims_v2
		WHERE created_at >= $1
		GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)`, cutoff)

	counts := map[[2]int]int64{}
	if rows != nil {
		for rows.Next() {
			var y, m int
			var cnt int64
			rows.Scan(&y, &m, &cnt)
			counts[[2]int{y, m}] = cnt
		}
		rows.Close()
	}

	result := make([]map[string]any, len(months))
	for i, ms := range months {
		result[i] = map[string]any{"month": ms.Label, "total": counts[[2]int{ms.Y, ms.M}]}
	}
	jsonResponse(w, http.StatusOK, result)
}

// GET /api/dashboard/monthly-sinistrality
func DashboardMonthlySinistrality(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	months := lastNMonths(6)
	cutoff := time.Date(months[0].Y, time.Month(months[0].M), 1, 0, 0, 0, 0, time.UTC)

	var totalStores int64
	db.Pool.QueryRow(ctx, `SELECT COALESCE(COUNT(*),0) FROM stores`).Scan(&totalStores)
	if totalStores == 0 {
		totalStores = 1
	}

	rows, _ := db.Pool.Query(ctx, `
		SELECT EXTRACT(YEAR FROM created_at)::int, EXTRACT(MONTH FROM created_at)::int, COUNT(DISTINCT store)
		FROM claims_v2
		WHERE created_at >= $1
		GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)`, cutoff)

	stores := map[[2]int]int64{}
	if rows != nil {
		for rows.Next() {
			var y, m int
			var cnt int64
			rows.Scan(&y, &m, &cnt)
			stores[[2]int{y, m}] = cnt
		}
		rows.Close()
	}

	result := make([]map[string]any, len(months))
	for i, ms := range months {
		rate := math.Round(float64(stores[[2]int{ms.Y, ms.M}])/float64(totalStores)*1000) / 10
		result[i] = map[string]any{"month": ms.Label, "rate": rate}
	}
	jsonResponse(w, http.StatusOK, result)
}

// GET /api/dashboard/recent-activities
func DashboardRecentActivities(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	rows, err := db.Pool.Query(ctx, `
		SELECT id, store, COALESCE(type,''), severity, status, date,
		       tenant_notified, irregular_policy, created_at,
		       COALESCE(responsible_area,''), COALESCE(description,'')
		FROM claims_v2
		ORDER BY created_at DESC
		LIMIT 10`)
	if err != nil {
		jsonError(w, "Erro ao buscar atividades recentes.", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type ActivityItem struct {
		ID              string    `json:"id"`
		Store           string    `json:"store"`
		StoreName       string    `json:"store_name"`
		LUC             string    `json:"luc"`
		ClaimType       string    `json:"claim_type"`
		Severity        string    `json:"severity"`
		Status          string    `json:"status"`
		Date            string    `json:"date"`
		TenantNotified  bool      `json:"tenant_notified"`
		IrregularPolicy bool      `json:"irregular_policy"`
		CreatedAt       time.Time `json:"created_at"`
		ResponsibleArea string    `json:"responsible_area"`
		Description     string    `json:"description"`
	}

	items := []ActivityItem{}
	for rows.Next() {
		var item ActivityItem
		var dateVal time.Time
		if err := rows.Scan(&item.ID, &item.Store, &item.ClaimType, &item.Severity,
			&item.Status, &dateVal, &item.TenantNotified, &item.IrregularPolicy,
			&item.CreatedAt, &item.ResponsibleArea, &item.Description); err == nil {
			item.Date = dateVal.Format("2006-01-02")
			parts := strings.SplitN(item.Store, " - ", 2)
			item.StoreName = parts[0]
			if len(parts) > 1 {
				item.LUC = strings.TrimPrefix(parts[1], "LUC ")
			}
			items = append(items, item)
		}
	}

	jsonResponse(w, http.StatusOK, items)
}
