package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strings"
	"time"

	"jpmall/backend/db"
	"jpmall/backend/models"

	"github.com/go-pdf/fpdf"
	"github.com/xuri/excelize/v2"
)

// ── tipos locais ──────────────────────────────────────────────────────────────

type storeInfo struct {
	Code    string
	Name    string
	Segment string
}

type groupVal struct {
	Name  string
	Count int
}

// ── helpers internos ──────────────────────────────────────────────────────────

func getStoresMap() map[string]storeInfo {
	m := make(map[string]storeInfo)
	rows, err := db.Pool.Query(context.Background(),
		`SELECT COALESCE(code,''), COALESCE(name,''), COALESCE(segment,'') FROM stores`)
	if err != nil {
		log.Printf("[reports] stores map error: %v", err)
		return m
	}
	defer rows.Close()
	for rows.Next() {
		var code, name, segment string
		if err := rows.Scan(&code, &name, &segment); err == nil {
			s := storeInfo{Code: code, Name: name, Segment: segment}
			m[strings.ToLower(name)] = s
			if code != "" {
				m[strings.ToLower(code)] = s
			}
		}
	}
	return m
}

func getStoreDetails(storeStr string, storesMap map[string]storeInfo) (name, luc, segment string) {
	parts := strings.Split(storeStr, " - ")
	name = parts[0]
	if len(parts) > 1 {
		luc = strings.Replace(parts[1], "LUC ", "", 1)
	}
	if s, ok := storesMap[strings.ToLower(name)]; ok {
		if luc == "" {
			luc = s.Code
		}
		segment = s.Segment
	}
	if luc == "" && strings.Contains(storeStr, "LUC ") {
		idx := strings.Index(storeStr, "LUC ")
		luc = storeStr[idx+4:]
	}
	if segment == "" {
		segment = "Geral"
	}
	return
}

func fetchFilteredClaims(r *http.Request) ([]models.Claim, error) {
	q := r.URL.Query()
	startDate := q.Get("start_date")
	endDate := q.Get("end_date")
	storeID := q.Get("store_id")
	storeCode := q.Get("store_code")
	store := q.Get("store")
	search := q.Get("search")
	status := q.Get("status")
	severity := q.Get("severity")
	category := q.Get("category")
	if category == "" {
		category = q.Get("type")
	}
	respAreas := q["responsible_area"]
	if area := q.Get("area"); area != "" {
		respAreas = append(respAreas, area)
	}
	responsibility := q.Get("responsibility")

	var finalAreas []string
	for _, area := range respAreas {
		if area == "" || area == "Todos" || area == "Todas" {
			continue
		}
		if strings.Contains(area, ",") {
			for _, part := range strings.Split(area, ",") {
				if p := strings.TrimSpace(part); p != "" {
					finalAreas = append(finalAreas, p)
				}
			}
		} else {
			finalAreas = append(finalAreas, area)
		}
	}

	query := claimSelect + " WHERE 1=1"
	var args []any
	i := 1

	if startDate != "" {
		query += fmt.Sprintf(" AND date >= $%d", i)
		args = append(args, startDate)
		i++
	}
	if endDate != "" {
		query += fmt.Sprintf(" AND date <= $%d", i)
		args = append(args, endDate)
		i++
	}
	if status != "" && status != "Todos" {
		query += fmt.Sprintf(" AND status = $%d", i)
		args = append(args, status)
		i++
	}
	if severity != "" && severity != "Todas" {
		query += fmt.Sprintf(" AND severity = $%d", i)
		args = append(args, severity)
		i++
	}
	if len(finalAreas) > 0 {
		query += fmt.Sprintf(" AND responsible_area = ANY($%d)", i)
		args = append(args, finalAreas)
		i++
	}
	if responsibility != "" && responsibility != "Todos" {
		query += fmt.Sprintf(" AND responsibility = $%d", i)
		args = append(args, responsibility)
		i++
	}
	if category != "" && category != "todos" {
		query += fmt.Sprintf(" AND (type ILIKE $%d OR other_type ILIKE $%d)", i, i)
		args = append(args, "%"+category+"%")
		i++
	}
	if search != "" {
		query += fmt.Sprintf(" AND (id ILIKE $%d OR store ILIKE $%d OR description ILIKE $%d OR employee_name ILIKE $%d OR type ILIKE $%d)", i, i, i, i, i)
		args = append(args, "%"+search+"%")
		i++
	}
	if storeCode != "" {
		query += fmt.Sprintf(" AND store ILIKE $%d", i)
		args = append(args, "%"+storeCode+"%")
		i++
	}
	if store != "" {
		query += fmt.Sprintf(" AND store ILIKE $%d", i)
		args = append(args, "%"+store+"%")
		i++
	}
	if storeID != "" {
		var code, name string
		err := db.Pool.QueryRow(context.Background(),
			`SELECT COALESCE(code,''), COALESCE(name,'') FROM stores WHERE id = $1`, storeID).Scan(&code, &name)
		if err == nil {
			query += fmt.Sprintf(" AND (store ILIKE $%d OR store ILIKE $%d)", i, i+1)
			args = append(args, "%"+code+"%", "%"+name+"%")
			i += 2
		}
	}
	// Multiple store names (e.g. from multi-select dropdown)
	if storeNamesList := r.URL.Query()["store_name"]; len(storeNamesList) > 0 {
		var parts []string
		for _, sn := range storeNamesList {
			if sn != "" {
				parts = append(parts, fmt.Sprintf("store ILIKE $%d", i))
				args = append(args, "%"+sn+"%")
				i++
			}
		}
		if len(parts) > 0 {
			query += " AND (" + strings.Join(parts, " OR ") + ")"
		}
	}
	query += " ORDER BY date DESC, id DESC"

	rows, err := db.Pool.Query(context.Background(), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.Claim
	for rows.Next() {
		c, err := scanClaim(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *c)
	}
	if list == nil {
		list = []models.Claim{}
	}
	return list, nil
}

func safeArea(c models.Claim) string {
	if c.ResponsibleArea != nil {
		return *c.ResponsibleArea
	}
	return ""
}

func parseBrazilianDate(dateStr string) string {
	parts := strings.Split(dateStr, "-")
	if len(parts) == 3 {
		return fmt.Sprintf("%s/%s/%s", parts[2], parts[1], parts[0])
	}
	return dateStr
}

// ── 1. GET /api/reports/claims ────────────────────────────────────────────────

func GetReportsClaims(w http.ResponseWriter, r *http.Request) {
	list, err := fetchFilteredClaims(r)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonResponse(w, http.StatusOK, list)
}

// ── 2. GET /api/reports/claims/pdf ───────────────────────────────────────────

func GetReportsClaimsPDF(w http.ResponseWriter, r *http.Request) {
	list, err := fetchFilteredClaims(r)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	buildClaimsReportPDFResponse(w, r, list, "relatorio-gerencial-sinistros-flamboyant.pdf")
}

// ── 3. GET /api/reports/claims/excel ─────────────────────────────────────────

func GetReportsClaimsExcel(w http.ResponseWriter, r *http.Request) {
	list, err := fetchFilteredClaims(r)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	f := excelize.NewFile()
	defer f.Close()

	sheet := "Sinistros"
	f.SetSheetName("Sheet1", sheet)

	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Color: "8B1A1A", Size: 14},
	})
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF", Size: 11},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"8B1A1A"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border: []excelize.Border{
			{Type: "left", Color: "D4C5B3", Style: 1},
			{Type: "right", Color: "D4C5B3", Style: 1},
			{Type: "top", Color: "D4C5B3", Style: 1},
			{Type: "bottom", Color: "D4C5B3", Style: 1},
		},
	})
	rowStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Size: 10},
		Border: []excelize.Border{
			{Type: "left", Color: "E8DCCB", Style: 1},
			{Type: "right", Color: "E8DCCB", Style: 1},
			{Type: "top", Color: "E8DCCB", Style: 1},
			{Type: "bottom", Color: "E8DCCB", Style: 1},
		},
	})

	f.SetCellValue(sheet, "A1", "Flamboyant Shopping Center - Relatório de Sinistros")
	f.MergeCell(sheet, "A1", "H1")
	f.SetCellStyle(sheet, "A1", "H1", titleStyle)
	f.SetCellValue(sheet, "A2", fmt.Sprintf("Gerado em: %s", time.Now().Format("02/01/2006 15:04")))
	f.SetCellValue(sheet, "A3", fmt.Sprintf("Filtro Período: %s a %s",
		queryParamDefault(r, "start_date", "Todos"), queryParamDefault(r, "end_date", "Todos")))
	f.SetCellValue(sheet, "A4", fmt.Sprintf("Total de Ocorrências: %d", len(list)))

	hdrs := []string{"Nº", "Data", "Loja / LUC", "Tipo de Ocorrência", "Gravidade", "Área Responsável", "Responsabilidade", "Status"}
	for i, h := range hdrs {
		cell, _ := excelize.CoordinatesToCellName(i+1, 6)
		f.SetCellValue(sheet, cell, h)
	}
	f.SetCellStyle(sheet, "A6", "H6", headerStyle)

	for idx, claim := range list {
		row := idx + 7
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), claim.ID)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), parseBrazilianDate(claim.Date))
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), claim.Store)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), claim.Type)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), claim.Severity)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), safeArea(claim))
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), claim.Responsibility)
		f.SetCellValue(sheet, fmt.Sprintf("H%d", row), claim.Status)
		f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("H%d", row), rowStyle)
	}

	for col := 1; col <= 8; col++ {
		colName, _ := excelize.ColumnNumberToName(col)
		_ = f.SetColWidth(sheet, colName, colName, 22)
	}
	_ = f.SetColWidth(sheet, "C", "C", 28)
	_ = f.SetColWidth(sheet, "D", "D", 32)

	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", `attachment; filename="relatorio-sinistros.xlsx"`)
	_ = f.Write(w)
}

// ── 4. GET /api/reports/final/pdf ────────────────────────────────────────────

func GetReportsFinalPDF(w http.ResponseWriter, r *http.Request) {
	list, err := fetchFilteredClaims(r)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	storesMap := getStoresMap()

	var active, resolved, pending int
	var compTotal, totalDays float64
	var countResolved int
	bySeverity := make(map[string]int)
	byStatus := make(map[string]int)
	byArea := make(map[string]int)
	byType := make(map[string]int)
	byStore := make(map[string]int)

	for _, claim := range list {
		compTotal += claim.CompensationAmount
		bySeverity[claim.Severity]++
		byStatus[claim.Status]++

		if claim.Status == "Concluído" || claim.Status == "Pago" {
			resolved++
			if claim.ResolvedAt != nil {
				t1, e1 := time.Parse("2006-01-02", claim.Date)
				if e1 == nil {
					diff := claim.ResolvedAt.Sub(t1).Hours() / 24
					if diff >= 0 {
						totalDays += diff
						countResolved++
					}
				}
			}
		} else if claim.Status != "Cancelado" {
			if claim.Status == "Em análise" {
				active++
			} else {
				pending++
			}
		}

		area := safeArea(claim)
		if area == "" {
			area = "Não definida"
		}
		byArea[area]++
		byType[claim.Type]++
		storeName, _, _ := getStoreDetails(claim.Store, storesMap)
		byStore[storeName]++
	}

	topStore, topStoreCount := topEntry(byStore)
	topType, topTypeCount := topEntry(byType)
	topArea, topAreaCount := topEntry(byArea)

	sinistralidade := 0.0
	if len(storesMap) > 0 {
		sinistralidade = (float64(len(list)) / 290.0) * 100.0
	}
	avgResolutionText := "dados insuficientes"
	if countResolved > 0 {
		avgResolutionText = fmt.Sprintf("%.1f dias", totalDays/float64(countResolved))
	}

	pdf := SetupFlamboyantPDF("P")

	pdf.AddPage()
	pdf.SetFont("Roboto", "", 8.5)
	pdf.SetTextColor(100, 100, 100)
	pdf.Cell(95, 5, fmt.Sprintf("Filtro Período: %s a %s",
		queryParamDefault(r, "start_date", "Todos"), queryParamDefault(r, "end_date", "Todos")))
	pdf.CellFormat(95, 5, fmt.Sprintf("Data Geração: %s", time.Now().Format("02/01/2006 15:04")), "", 1, "R", false, 0, "")
	pdf.Ln(4)

	// Seção 1: Resumo Executivo
	sectionTitle(pdf, "Seção 1: Resumo Executivo")
	pdf.SetFillColor(250, 247, 242)
	pdf.SetDrawColor(232, 220, 203)
	pdf.SetLineWidth(0.4)
	pdf.Rect(10, pdf.GetY(), 190, 42, "DF")
	pdf.SetFont("Roboto", "", 9)
	pdf.SetTextColor(80, 80, 80)
	pdf.SetY(pdf.GetY() + 3)

	pdf.SetX(15)
	pdf.Cell(90, 5, fmt.Sprintf("Total de sinistros no período: %d", len(list)))
	pdf.SetX(110)
	pdf.Cell(90, 5, fmt.Sprintf("Loja/LUC com mais ocorrências: %s (%d)", topStore, topStoreCount))
	pdf.Ln(6)
	pdf.SetX(15)
	pdf.Cell(90, 5, fmt.Sprintf("Gravidade: Alta (%d) | Média (%d) | Baixa (%d)",
		bySeverity["Alta"], bySeverity["Média"], bySeverity["Baixa"]))
	pdf.SetX(110)
	pdf.Cell(90, 5, fmt.Sprintf("Principal tipo de ocorrência: %s (%d)", topType, topTypeCount))
	pdf.Ln(6)
	pdf.SetX(15)
	pdf.Cell(90, 5, fmt.Sprintf("Status: Em análise (%d) | Concluído (%d) | Pago (%d)",
		byStatus["Em análise"], byStatus["Concluído"], byStatus["Pago"]))
	pdf.SetX(110)
	pdf.Cell(90, 5, fmt.Sprintf("Total de indenizações: R$ %.2f", compTotal))
	pdf.Ln(6)
	pdf.SetX(15)
	pdf.Cell(180, 5, fmt.Sprintf("Área responsável mais demandada: %s (%d ocorrências)", topArea, topAreaCount))
	pdf.Ln(10)

	// Seção 2: Indicadores
	sectionTitle(pdf, "Seção 2: Indicadores de Performance")
	pdf.Rect(10, pdf.GetY(), 190, 24, "DF")
	pdf.SetFont("Roboto", "", 9)
	pdf.SetTextColor(80, 80, 80)
	pdf.SetY(pdf.GetY() + 3)
	pdf.SetX(15)
	pdf.Cell(90, 5, fmt.Sprintf("Sinistros Ativos: %d", active))
	pdf.SetX(110)
	pdf.Cell(90, 5, fmt.Sprintf("Índice de Sinistralidade: %.2f%%", sinistralidade))
	pdf.Ln(6)
	pdf.SetX(15)
	pdf.Cell(90, 5, fmt.Sprintf("Sinistros Concluídos/Resolvidos: %d", resolved))
	pdf.SetX(110)
	pdf.Cell(90, 5, fmt.Sprintf("Tempo Médio de Resolução: %s", avgResolutionText))
	pdf.Ln(6)
	pdf.SetX(15)
	pdf.Cell(90, 5, fmt.Sprintf("Sinistros Pendentes (Aguardo): %d", pending))
	pdf.Ln(9)

	// Seção 3: Tabela Analítica
	sectionTitle(pdf, "Seção 3: Tabela Analítica de Sinistros")
	tblHeaders := []string{"Nº", "Data", "Loja", "LUC", "Tipo", "Grav.", "Área Resp.", "Respons.", "Status", "Valor Ind."}
	tblWidths := []float64{22, 16, 28, 12, 26, 14, 22, 14, 18, 18}

	pdf.SetFillColor(139, 26, 26)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Roboto", "B", 7)
	for i, h := range tblHeaders {
		pdf.CellFormat(tblWidths[i], 6, h, "1", 0, "C", true, 0, "")
	}
	pdf.Ln(6)
	pdf.SetTextColor(60, 60, 60)
	pdf.SetFont("Roboto", "", 6.5)

	for idx, claim := range list {
		if pdf.GetY() > 250 {
			pdf.AddPage()
			pdf.SetFillColor(139, 26, 26)
			pdf.SetTextColor(255, 255, 255)
			pdf.SetFont("Roboto", "B", 7)
			for i, h := range tblHeaders {
				pdf.CellFormat(tblWidths[i], 6, h, "1", 0, "C", true, 0, "")
			}
			pdf.Ln(6)
			pdf.SetTextColor(60, 60, 60)
			pdf.SetFont("Roboto", "", 6.5)
		}
		fill := idx%2 == 1
		pdf.SetFillColor(253, 251, 248)
		storeName, storeLUC, _ := getStoreDetails(claim.Store, storesMap)
		pdf.CellFormat(tblWidths[0], 5.5, claim.ID, "1", 0, "C", fill, 0, "")
		pdf.CellFormat(tblWidths[1], 5.5, parseBrazilianDate(claim.Date), "1", 0, "C", fill, 0, "")
		pdf.CellFormat(tblWidths[2], 5.5, storeName, "1", 0, "L", fill, 0, "")
		pdf.CellFormat(tblWidths[3], 5.5, storeLUC, "1", 0, "C", fill, 0, "")
		pdf.CellFormat(tblWidths[4], 5.5, claim.Type, "1", 0, "L", fill, 0, "")
		pdf.CellFormat(tblWidths[5], 5.5, claim.Severity, "1", 0, "C", fill, 0, "")
		pdf.CellFormat(tblWidths[6], 5.5, safeArea(claim), "1", 0, "L", fill, 0, "")
		pdf.CellFormat(tblWidths[7], 5.5, claim.Responsibility, "1", 0, "C", fill, 0, "")
		pdf.CellFormat(tblWidths[8], 5.5, claim.Status, "1", 0, "C", fill, 0, "")
		pdf.CellFormat(tblWidths[9], 5.5, fmt.Sprintf("R$ %.2f", claim.CompensationAmount), "1", 1, "R", fill, 0, "")
	}
	pdf.Ln(6)

	// Seção 4: Análise Estatística
	if pdf.GetY() > 220 {
		pdf.AddPage()
	}
	sectionTitle(pdf, "Seção 4: Análise Estatística por Categoria")
	pdf.SetFont("Roboto", "", 8.5)
	pdf.SetTextColor(80, 80, 80)
	pdf.SetFillColor(250, 247, 242)
	pdf.Rect(10, pdf.GetY(), 190, 36, "DF")
	pdf.SetY(pdf.GetY() + 2)

	typesList := sortedGroupVals(byType)
	areasList := sortedGroupVals(byArea)

	pdf.SetX(15)
	pdf.SetFont("Roboto", "B", 8)
	pdf.Cell(90, 4, "Principais Tipos:")
	pdf.SetX(110)
	pdf.Cell(90, 4, "Demandas por Área Responsável:")
	pdf.Ln(4.5)
	pdf.SetFont("Roboto", "", 7.5)
	for i := 0; i < 4; i++ {
		pdf.SetX(15)
		if i < len(typesList) {
			pdf.Cell(90, 4, fmt.Sprintf("- %s: %d", typesList[i].Name, typesList[i].Count))
		} else {
			pdf.Cell(90, 4, "")
		}
		pdf.SetX(110)
		if i < len(areasList) {
			pdf.Cell(90, 4, fmt.Sprintf("- %s: %d", areasList[i].Name, areasList[i].Count))
		} else {
			pdf.Cell(90, 4, "")
		}
		pdf.Ln(4)
	}
	pdf.Ln(6)

	// Seção 5: Recomendações
	if pdf.GetY() > 220 {
		pdf.AddPage()
	}
	sectionTitle(pdf, "Seção 5: Observações e Recomendações Técnicas")

	var recs []string
	if byArea["Manutenção"] > 0 {
		recs = append(recs, "* Identificado volume de sinistros alocado a Manutenção. Recomenda-se realizar inspeção preventiva nas instalações hidráulicas e elétricas.")
	}
	if byArea["Segurança / CFTV"] > 0 || byArea["Segurança"] > 0 {
		recs = append(recs, "* Foco de ocorrências de segurança. Recomenda-se revisar o monitoramento e posicionamento de câmeras de CFTV nas áreas comuns.")
	}
	for t := range byType {
		if strings.Contains(strings.ToLower(t), "dano") || strings.Contains(strings.ToLower(t), "vandalismo") {
			recs = append(recs, "* Presença de danos físicos ou vandalismo. Recomenda-se o reforço imediato de rondas preventivas.")
			break
		}
	}
	if len(recs) == 0 {
		recs = append(recs, "Não há volume suficiente de ocorrências críticas para gerar recomendações preventivas automáticas.")
	}

	pdf.SetFillColor(250, 247, 242)
	pdf.SetDrawColor(139, 26, 26)
	pdf.SetLineWidth(1.0)
	pdf.Rect(10, pdf.GetY(), 190, float64(12*len(recs)+6), "DF")
	pdf.SetFont("Roboto", "", 8)
	pdf.SetTextColor(50, 50, 50)
	pdf.SetY(pdf.GetY() + 3)
	for _, rec := range recs {
		pdf.SetX(15)
		pdf.MultiCell(180, 4, rec, "", "L", false)
		pdf.Ln(2)
	}

	// Assinatura
	pdf.Ln(10)
	if pdf.GetY() > 225 {
		pdf.AddPage()
		pdf.Ln(10)
	}
	pdf.SetFont("Roboto", "", 9)
	pdf.SetTextColor(80, 80, 80)
	pdf.SetX(65)
	pdf.CellFormat(80, 0.5, "", "T", 1, "C", false, 0, "")
	pdf.Ln(1)
	pdf.SetFont("Roboto", "B", 9)
	pdf.SetTextColor(50, 50, 50)
	pdf.CellFormat(0, 4, "Gerente de Operações - Flamboyant Shopping", "", 1, "C", false, 0, "")
	pdf.SetFont("Roboto", "I", 8)
	pdf.SetTextColor(100, 100, 100)
	pdf.CellFormat(0, 4, "Assinatura Digital / Autorização Técnica", "", 1, "C", false, 0, "")
	pdf.CellFormat(0, 4, fmt.Sprintf("Data de Emissão: %s", time.Now().Format("02/01/2006")), "", 1, "C", false, 0, "")

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", `attachment; filename="relatorio-final.pdf"`)
	_ = pdf.Output(w)
}

// ── 5. GET /api/reports/final/excel ──────────────────────────────────────────

func GetReportsFinalExcel(w http.ResponseWriter, r *http.Request) {
	list, err := fetchFilteredClaims(r)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	storesMap := getStoresMap()
	f := excelize.NewFile()
	defer f.Close()

	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Color: "8B1A1A", Size: 15},
	})
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF", Size: 11},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"8B1A1A"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border: []excelize.Border{
			{Type: "left", Color: "D4C5B3", Style: 1},
			{Type: "right", Color: "D4C5B3", Style: 1},
			{Type: "top", Color: "D4C5B3", Style: 1},
			{Type: "bottom", Color: "D4C5B3", Style: 1},
		},
	})
	rowStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Size: 10},
		Border: []excelize.Border{
			{Type: "left", Color: "E8DCCB", Style: 1},
			{Type: "right", Color: "E8DCCB", Style: 1},
			{Type: "top", Color: "E8DCCB", Style: 1},
			{Type: "bottom", Color: "E8DCCB", Style: 1},
		},
	})

	// ── Aba Resumo ────────────────────────────────────────────────────────────
	sheetResumo := "Resumo"
	f.SetSheetName("Sheet1", sheetResumo)

	var active, resolved, pending int
	var compTotal float64
	bySeverity := make(map[string]int)
	byStatus := make(map[string]int)
	byArea := make(map[string]int)
	byStore := make(map[string]int)

	for _, claim := range list {
		compTotal += claim.CompensationAmount
		bySeverity[claim.Severity]++
		byStatus[claim.Status]++
		if claim.Status == "Concluído" || claim.Status == "Pago" {
			resolved++
		} else if claim.Status != "Cancelado" {
			if claim.Status == "Em análise" {
				active++
			} else {
				pending++
			}
		}
		area := safeArea(claim)
		if area == "" {
			area = "Não definida"
		}
		byArea[area]++
		storeName, _, _ := getStoreDetails(claim.Store, storesMap)
		byStore[storeName]++
	}

	topStore, topStoreCount := topEntry(byStore)

	f.SetCellValue(sheetResumo, "A1", "Flamboyant Shopping - Relatório Executivo de Ocorrências")
	f.MergeCell(sheetResumo, "A1", "D1")
	f.SetCellStyle(sheetResumo, "A1", "D1", titleStyle)

	f.SetCellValue(sheetResumo, "A3", "Indicador Geral")
	f.SetCellValue(sheetResumo, "B3", "Valor")
	f.SetCellStyle(sheetResumo, "A3", "B3", headerStyle)

	indicators := [][]any{
		{"Total de Ocorrências no Período", len(list)},
		{"Ocorrências em Análise", active},
		{"Ocorrências Concluídas", resolved},
		{"Ocorrências Pendentes / Seguradora", pending},
		{"Volume Total de Indenizações", fmt.Sprintf("R$ %.2f", compTotal)},
		{"Loja com maior incidência", fmt.Sprintf("%s (%d)", topStore, topStoreCount)},
		{"Total de Lojas Cadastradas", len(storesMap) / 2},
	}
	for idx, ind := range indicators {
		row := idx + 4
		f.SetCellValue(sheetResumo, fmt.Sprintf("A%d", row), ind[0])
		f.SetCellValue(sheetResumo, fmt.Sprintf("B%d", row), ind[1])
		f.SetCellStyle(sheetResumo, fmt.Sprintf("A%d", row), fmt.Sprintf("B%d", row), rowStyle)
	}

	centerStyle, _ := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	boldCenterStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 10},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	italicCenterStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Italic: true, Size: 9},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})

	f.SetCellValue(sheetResumo, "A13", "__________________________________________________")
	f.MergeCell(sheetResumo, "A13", "B13")
	f.SetCellStyle(sheetResumo, "A13", "B13", centerStyle)
	f.SetCellValue(sheetResumo, "A14", "Gerente de Operações - Flamboyant Shopping")
	f.MergeCell(sheetResumo, "A14", "B14")
	f.SetCellStyle(sheetResumo, "A14", "B14", boldCenterStyle)
	f.SetCellValue(sheetResumo, "A15", "Assinatura Digital / Autorização Técnica")
	f.MergeCell(sheetResumo, "A15", "B15")
	f.SetCellStyle(sheetResumo, "A15", "B15", italicCenterStyle)
	f.SetCellValue(sheetResumo, "A16", fmt.Sprintf("Data de Emissão: %s", time.Now().Format("02/01/2006")))
	f.MergeCell(sheetResumo, "A16", "B16")
	f.SetCellStyle(sheetResumo, "A16", "B16", italicCenterStyle)
	f.SetColWidth(sheetResumo, "A", "A", 35)
	f.SetColWidth(sheetResumo, "B", "B", 20)

	// ── Aba Sinistros ─────────────────────────────────────────────────────────
	sheetClaims := "Sinistros"
	_, _ = f.NewSheet(sheetClaims)
	f.SetCellValue(sheetClaims, "A1", "Flamboyant Shopping - Tabela Analítica de Sinistros")
	f.MergeCell(sheetClaims, "A1", "J1")
	f.SetCellStyle(sheetClaims, "A1", "J1", titleStyle)

	claimsHdrs := []string{"Nº", "Data", "Loja", "LUC", "Tipo Ocorrência", "Gravidade", "Área Responsável", "Responsabilidade", "Status", "Indenização (R$)"}
	for i, h := range claimsHdrs {
		cell, _ := excelize.CoordinatesToCellName(i+1, 3)
		f.SetCellValue(sheetClaims, cell, h)
	}
	f.SetCellStyle(sheetClaims, "A3", "J3", headerStyle)

	for idx, claim := range list {
		row := idx + 4
		storeName, storeLUC, _ := getStoreDetails(claim.Store, storesMap)
		f.SetCellValue(sheetClaims, fmt.Sprintf("A%d", row), claim.ID)
		f.SetCellValue(sheetClaims, fmt.Sprintf("B%d", row), parseBrazilianDate(claim.Date))
		f.SetCellValue(sheetClaims, fmt.Sprintf("C%d", row), storeName)
		f.SetCellValue(sheetClaims, fmt.Sprintf("D%d", row), storeLUC)
		f.SetCellValue(sheetClaims, fmt.Sprintf("E%d", row), claim.Type)
		f.SetCellValue(sheetClaims, fmt.Sprintf("F%d", row), claim.Severity)
		f.SetCellValue(sheetClaims, fmt.Sprintf("G%d", row), safeArea(claim))
		f.SetCellValue(sheetClaims, fmt.Sprintf("H%d", row), claim.Responsibility)
		f.SetCellValue(sheetClaims, fmt.Sprintf("I%d", row), claim.Status)
		f.SetCellValue(sheetClaims, fmt.Sprintf("J%d", row), claim.CompensationAmount)
		f.SetCellStyle(sheetClaims, fmt.Sprintf("A%d", row), fmt.Sprintf("J%d", row), rowStyle)
	}
	for col := 1; col <= 10; col++ {
		colName, _ := excelize.ColumnNumberToName(col)
		_ = f.SetColWidth(sheetClaims, colName, colName, 18)
	}
	_ = f.SetColWidth(sheetClaims, "C", "C", 25)
	_ = f.SetColWidth(sheetClaims, "E", "E", 28)

	// ── Abas de agrupamento ───────────────────────────────────────────────────
	createGroupSheet := func(sheetName, title, colHeader string, countsMap map[string]int) {
		_, _ = f.NewSheet(sheetName)
		f.SetCellValue(sheetName, "A1", title)
		f.MergeCell(sheetName, "A1", "B1")
		f.SetCellStyle(sheetName, "A1", "B1", titleStyle)
		f.SetCellValue(sheetName, "A3", colHeader)
		f.SetCellValue(sheetName, "B3", "Quantidade Ocorrências")
		f.SetCellStyle(sheetName, "A3", "B3", headerStyle)
		sorted := sortedGroupVals(countsMap)
		for idx, item := range sorted {
			row := idx + 4
			f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), item.Name)
			f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), item.Count)
			f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("B%d", row), rowStyle)
		}
		f.SetColWidth(sheetName, "A", "A", 28)
		f.SetColWidth(sheetName, "B", "B", 24)
	}

	createGroupSheet("Por Gravidade", "Flamboyant Shopping - Sinistros por Gravidade", "Gravidade", bySeverity)
	createGroupSheet("Por Status", "Flamboyant Shopping - Sinistros por Status", "Status", byStatus)
	createGroupSheet("Por Área", "Flamboyant Shopping - Sinistros por Área Responsável", "Área Responsável", byArea)
	createGroupSheet("Por Loja", "Flamboyant Shopping - Ocorrências por Loja / LUC", "Loja / Estabelecimento", byStore)

	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", `attachment; filename="relatorio-final.xlsx"`)
	_ = f.Write(w)
}

// ── utilitários internos ──────────────────────────────────────────────────────

func sectionTitle(pdf *fpdf.Fpdf, title string) {
	pdf.SetFont("Roboto", "B", 11)
	pdf.SetTextColor(139, 26, 26)
	pdf.Cell(0, 6, title)
	pdf.Ln(5.5)
}

func topEntry(m map[string]int) (string, int) {
	top, count := "Nenhum registro", 0
	for k, v := range m {
		if v > count {
			count = v
			top = k
		}
	}
	return top, count
}

func sortedGroupVals(m map[string]int) []groupVal {
	var list []groupVal
	for k, v := range m {
		name := k
		if name == "" {
			name = "Não definida"
		}
		list = append(list, groupVal{name, v})
	}
	sort.Slice(list, func(i, j int) bool { return list[i].Count > list[j].Count })
	return list
}
