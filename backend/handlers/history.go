package handlers

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"jpmall/backend/db"
	"jpmall/backend/models"

	"github.com/xuri/excelize/v2"
)

// buildHistoryWhere monta WHERE clause e args a partir dos query params.
func buildHistoryWhere(r *http.Request) (string, []any, int) {
	q := r.URL.Query()
	search := q.Get("search")
	status := q.Get("status")
	severity := q.Get("severity")
	area := q.Get("area")
	responsibility := q.Get("responsibility")
	startDate := q.Get("start_date")
	endDate := q.Get("end_date")

	var conds []string
	var args []any
	i := 1

	if search != "" {
		conds = append(conds, fmt.Sprintf(
			"(store ILIKE $%d OR description ILIKE $%d OR id ILIKE $%d OR COALESCE(responsible_area,'') ILIKE $%d)",
			i, i, i, i))
		args = append(args, "%"+search+"%")
		i++
	}
	if status != "" {
		conds = append(conds, fmt.Sprintf("status = $%d", i))
		args = append(args, status)
		i++
	}
	if severity != "" {
		conds = append(conds, fmt.Sprintf("severity = $%d", i))
		args = append(args, severity)
		i++
	}
	if area != "" {
		conds = append(conds, fmt.Sprintf("COALESCE(responsible_area,'') ILIKE $%d", i))
		args = append(args, "%"+area+"%")
		i++
	}
	if responsibility != "" {
		conds = append(conds, fmt.Sprintf("responsibility = $%d", i))
		args = append(args, responsibility)
		i++
	}
	if startDate != "" {
		conds = append(conds, fmt.Sprintf("date >= $%d", i))
		args = append(args, startDate)
		i++
	}
	if endDate != "" {
		conds = append(conds, fmt.Sprintf("date <= $%d", i))
		args = append(args, endDate)
		i++
	}

	where := ""
	if len(conds) > 0 {
		where = " WHERE " + strings.Join(conds, " AND ")
	}
	return where, args, i
}

// GET /api/claims/history
func ListClaimsHistory(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 10
	}
	offset := (page - 1) * limit

	where, args, i := buildHistoryWhere(r)

	var total int64
	countArgs := append([]any{}, args...)
	db.Pool.QueryRow(context.Background(), "SELECT COUNT(*) FROM claims_v2"+where, countArgs...).Scan(&total)

	totalPages := int((total + int64(limit) - 1) / int64(limit))
	if totalPages < 1 {
		totalPages = 1
	}

	qArgs := append(append([]any{}, args...), limit, offset)
	query := fmt.Sprintf("%s%s ORDER BY created_at DESC LIMIT $%d OFFSET $%d",
		claimSelect, where, i, i+1)

	rows, err := db.Pool.Query(context.Background(), query, qArgs...)
	if err != nil {
		jsonError(w, "Erro ao buscar histórico.", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	items := []*models.Claim{}
	for rows.Next() {
		c, err := scanClaim(rows)
		if err == nil {
			items = append(items, c)
		}
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"items":       items,
		"page":        page,
		"limit":       limit,
		"total":       total,
		"total_pages": totalPages,
	})
}

// fetchAllHistory busca todos os sinistros matching filtros (sem paginação, cap 2000).
func fetchAllHistory(r *http.Request) ([]*models.Claim, error) {
	where, args, i := buildHistoryWhere(r)
	args = append(args, 2000)
	query := fmt.Sprintf("%s%s ORDER BY created_at DESC LIMIT $%d", claimSelect, where, i)

	rows, err := db.Pool.Query(context.Background(), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*models.Claim
	for rows.Next() {
		c, err := scanClaim(rows)
		if err == nil {
			items = append(items, c)
		}
	}
	return items, nil
}

// GET /api/claims/history/export
func ExportClaimsHistory(w http.ResponseWriter, r *http.Request) {
	format := r.URL.Query().Get("format")
	if format == "" {
		format = "pdf"
	}

	claims, err := fetchAllHistory(r)
	if err != nil {
		jsonError(w, "Erro ao buscar dados para exportação.", http.StatusInternalServerError)
		return
	}

	switch format {
	case "excel":
		exportHistoryExcel(w, r, claims)
	case "csv":
		exportHistoryCSV(w, claims)
	default:
		exportHistoryPDF(w, r, claims)
	}
}

func historyFilterSummary(r *http.Request) string {
	q := r.URL.Query()
	var parts []string
	if v := q.Get("search"); v != "" {
		parts = append(parts, "Busca: "+v)
	}
	if v := q.Get("status"); v != "" {
		parts = append(parts, "Status: "+v)
	}
	if v := q.Get("severity"); v != "" {
		parts = append(parts, "Gravidade: "+v)
	}
	if v := q.Get("area"); v != "" {
		parts = append(parts, "Area: "+v)
	}
	if v := q.Get("responsibility"); v != "" {
		parts = append(parts, "Responsabilidade: "+v)
	}
	if v := q.Get("start_date"); v != "" {
		parts = append(parts, "De: "+v)
	}
	if v := q.Get("end_date"); v != "" {
		parts = append(parts, "Ate: "+v)
	}
	if len(parts) == 0 {
		return "Sem filtros (todos os registros)"
	}
	return strings.Join(parts, " | ")
}

func exportHistoryPDF(w http.ResponseWriter, r *http.Request, claims []*models.Claim) {
	list := make([]models.Claim, 0, len(claims))
	for _, claim := range claims {
		if claim != nil {
			list = append(list, *claim)
		}
	}
	buildClaimsReportPDFResponse(w, r, list, "relatorio-gerencial-sinistros-flamboyant.pdf")
}

func exportHistoryExcel(w http.ResponseWriter, r *http.Request, claims []*models.Claim) {
	xl := excelize.NewFile()
	defer xl.Close()
	sheet := "Historico"
	xl.SetSheetName("Sheet1", sheet)

	xl.SetCellValue(sheet, "A1", "Relatório de Sinistros - Flamboyant Shopping")
	xl.SetCellValue(sheet, "A2", "Gerado em: "+time.Now().Format("02/01/2006 15:04"))
	xl.SetCellValue(sheet, "A3", "Filtros: "+historyFilterSummary(r))
	xl.SetCellValue(sheet, "A4", fmt.Sprintf("Total de registros: %d", len(claims)))

	headers := []string{"Data", "Codigo", "Loja", "Area Responsavel", "Gravidade", "Status", "Descricao"}
	for j, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(j+1, 6)
		xl.SetCellValue(sheet, cell, h)
	}

	for idx, c := range claims {
		rowNum := idx + 7
		area := ""
		if c.ResponsibleArea != nil {
			area = *c.ResponsibleArea
		}
		vals := []interface{}{c.Date, c.ID, c.Store, area, c.Severity, c.Status, c.Description}
		for j, v := range vals {
			cell, _ := excelize.CoordinatesToCellName(j+1, rowNum)
			xl.SetCellValue(sheet, cell, v)
		}
	}

	var buf bytes.Buffer
	if err := xl.Write(&buf); err != nil {
		jsonError(w, "Erro ao gerar Excel.", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", `attachment; filename="relatorio-sinistros.xlsx"`)
	w.Write(buf.Bytes())
}

func exportHistoryCSV(w http.ResponseWriter, claims []*models.Claim) {
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="relatorio-sinistros.csv"`)
	w.Write([]byte("\xef\xbb\xbf")) // BOM para compatibilidade com Excel

	cw := csv.NewWriter(w)
	cw.Write([]string{"Data", "Codigo", "Loja", "Area Responsavel", "Gravidade", "Status", "Descricao"})
	for _, c := range claims {
		area := ""
		if c.ResponsibleArea != nil {
			area = *c.ResponsibleArea
		}
		cw.Write([]string{c.Date, c.ID, c.Store, area, c.Severity, c.Status, c.Description})
	}
	cw.Flush()
}
