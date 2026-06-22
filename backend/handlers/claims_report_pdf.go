package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"jpmall/backend/models"

	"github.com/go-pdf/fpdf"
)

const (
	claimsReportLeft          = 18.0
	claimsReportWidth         = 174.0
	claimsReportContentBottom = 248.0
)

type claimsReportStats struct {
	Total      int
	Alta       int
	Media      int
	Baixa      int
	EmAnalise  int
	Concluidos int
}

func buildClaimsReportPDFResponse(w http.ResponseWriter, r *http.Request, claims []models.Claim, filename string) {
	pdf := buildClaimsManagementPDF(r, claims)
	if pdf.Err() {
		jsonError(w, "Erro ao gerar PDF: "+pdf.Error().Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	if err := pdf.Output(w); err != nil {
		fmt.Printf("Erro ao escrever PDF: %v\n", err)
	}
}

func buildClaimsManagementPDF(r *http.Request, claims []models.Claim) *fpdf.Fpdf {
	now := time.Now()
	stats := summarizeClaimsForReport(claims)
	docCode := "FLB-SIN-REL-" + now.Format("20060102-1504")
	period := claimsReportPeriod(r)
	filters := claimsReportFilters(r)

	pdf := SetupFlamboyantPDF("P")
	pdf.AddPage()

	reportSectionTitle(pdf, "RELATÓRIO GERENCIAL DE SINISTROS", true)
	pdf.SetFont("Roboto", "", 10)
	pdf.SetTextColor(85, 85, 85)
	pdf.CellFormat(0, 5, "Flamboyant Shopping — Gestão de Sinistros", "", 1, "C", false, 0, "")
	pdf.Ln(6)

	drawClaimsIdentificationBlock(pdf, docCode, now, period, filters, len(claims))
	pdf.Ln(7)

	reportSectionTitle(pdf, "SUMÁRIO GERENCIAL", false)
	summary := fmt.Sprintf(
		"Este relatório apresenta os registros de sinistros do Flamboyant Shopping de acordo com os filtros aplicados no momento da emissão. No período analisado, foram identificadas %d ocorrências, sendo %d de alta gravidade, %d de média gravidade e %d de baixa gravidade. Entre os registros, %d encontram-se em análise e %d já foram concluídos/pagos.",
		stats.Total, stats.Alta, stats.Media, stats.Baixa, stats.EmAnalise, stats.Concluidos,
	)
	pdf.SetFont("Roboto", "", 9)
	pdf.SetTextColor(65, 65, 65)
	pdf.MultiCell(claimsReportWidth, 5, summary, "", "L", false)
	pdf.Ln(5)

	drawClaimsIndicators(pdf, stats)
	pdf.Ln(8)

	drawClaimsTable(pdf, claims)
	pdf.Ln(8)

	ensureClaimsReportSpace(pdf, 62)
	reportSectionTitle(pdf, "OBSERVAÇÕES E ENCERRAMENTO", false)
	pdf.SetFont("Roboto", "", 8.5)
	pdf.SetTextColor(70, 70, 70)
	pdf.MultiCell(claimsReportWidth, 5, "As informações apresentadas neste documento refletem os registros disponíveis no sistema de gestão de sinistros na data e horário de sua emissão. Este relatório possui caráter interno e destina-se ao acompanhamento administrativo e operacional.", "", "L", false)
	pdf.Ln(9)

	drawClaimsSignatures(pdf)
	return pdf
}

func drawClaimsIdentificationBlock(pdf *fpdf.Fpdf, docCode string, now time.Time, period, filters string, total int) {
	x, y := claimsReportLeft, pdf.GetY()
	w, h := claimsReportWidth, 37.0
	pdf.SetFillColor(250, 247, 242)
	pdf.SetDrawColor(217, 140, 149)
	pdf.SetLineWidth(0.35)
	pdf.Rect(x, y, w, h, "DF")

	leftLabelW := 29.0
	rightLabelW := 30.0
	rowH := 5.3
	pdf.SetY(y + 3)

	writePair := func(label, value string, valueW float64) {
		pdf.SetFont("Roboto", "B", 7.5)
		pdf.SetTextColor(70, 70, 70)
		pdf.CellFormat(leftLabelW, rowH, label, "", 0, "L", false, 0, "")
		pdf.SetFont("Roboto", "", 7.5)
		pdf.CellFormat(valueW, rowH, value, "", 0, "L", false, 0, "")
	}

	pdf.SetX(x + 4)
	writePair("Documento:", docCode, 63)
	pdf.SetFont("Roboto", "B", 7.5)
	pdf.CellFormat(rightLabelW, rowH, "Emitido em:", "", 0, "L", false, 0, "")
	pdf.SetFont("Roboto", "", 7.5)
	pdf.CellFormat(38, rowH, now.Format("02/01/2006 15:04"), "", 1, "L", false, 0, "")

	pdf.SetX(x + 4)
	writePair("Unidade:", "Flamboyant Shopping", 63)
	pdf.SetFont("Roboto", "B", 7.5)
	pdf.CellFormat(rightLabelW, rowH, "Total:", "", 0, "L", false, 0, "")
	pdf.SetFont("Roboto", "", 7.5)
	pdf.CellFormat(38, rowH, fmt.Sprintf("%d registros", total), "", 1, "L", false, 0, "")

	pdf.SetX(x + 4)
	writePair("Período:", period, 63)
	pdf.SetFont("Roboto", "B", 7.5)
	pdf.CellFormat(rightLabelW, rowH, "Usuário emissor:", "", 0, "L", false, 0, "")
	pdf.SetFont("Roboto", "", 7.5)
	pdf.CellFormat(38, rowH, "Sistema", "", 1, "L", false, 0, "")

	pdf.SetX(x + 4)
	pdf.SetFont("Roboto", "B", 7.5)
	pdf.CellFormat(leftLabelW, rowH, "Filtros aplicados:", "", 0, "L", false, 0, "")
	pdf.SetFont("Roboto", "", 7.2)
	pdf.MultiCell(139, 4, filters, "", "L", false)
	pdf.SetY(y + h + 1)
}

func drawClaimsIndicators(pdf *fpdf.Fpdf, stats claimsReportStats) {
	items := []struct {
		label string
		value int
	}{
		{"Total de sinistros", stats.Total},
		{"Alta gravidade", stats.Alta},
		{"Média gravidade", stats.Media},
		{"Baixa gravidade", stats.Baixa},
		{"Em análise", stats.EmAnalise},
		{"Concluídos/Pagos", stats.Concluidos},
	}

	cardW := claimsReportWidth / float64(len(items))
	y := pdf.GetY()
	for i, item := range items {
		x := claimsReportLeft + float64(i)*cardW
		pdf.SetFillColor(255, 255, 255)
		pdf.SetDrawColor(225, 218, 212)
		pdf.Rect(x, y, cardW-1.2, 16, "DF")

		pdf.SetFont("Roboto", "B", 12)
		pdf.SetTextColor(157, 20, 24)
		pdf.SetXY(x, y+1.4)
		pdf.CellFormat(cardW-1.2, 6, fmt.Sprintf("%d", item.value), "", 0, "C", false, 0, "")

		pdf.SetFont("Roboto", "", 6.4)
		pdf.SetTextColor(90, 90, 90)
		pdf.SetXY(x+1, y+9)
		pdf.MultiCell(cardW-3.2, 3, item.label, "", "C", false)
	}
	pdf.SetY(y + 18)
}

func drawClaimsTable(pdf *fpdf.Fpdf, claims []models.Claim) {
	reportSectionTitle(pdf, "TABELA DETALHADA", false)

	cols := []struct {
		label string
		w     float64
	}{
		{"Data", 16},
		{"Código", 24},
		{"Loja / LUC", 30},
		{"Tipo", 22},
		{"Área", 24},
		{"Grav.", 16},
		{"Status", 22},
		{"Atualização", 20},
	}

	drawHeader := func() {
		pdf.SetFillColor(139, 26, 26)
		pdf.SetDrawColor(139, 26, 26)
		pdf.SetTextColor(255, 255, 255)
		pdf.SetFont("Roboto", "B", 6.8)
		pdf.SetX(claimsReportLeft)
		for _, col := range cols {
			pdf.CellFormat(col.w, 7, col.label, "1", 0, "C", true, 0, "")
		}
		pdf.Ln(-1)
	}

	drawHeader()
	if len(claims) == 0 {
		pdf.SetFont("Roboto", "", 8)
		pdf.SetTextColor(90, 90, 90)
		pdf.SetX(claimsReportLeft)
		pdf.CellFormat(claimsReportWidth, 10, "Nenhum sinistro encontrado para os filtros selecionados.", "1", 1, "C", false, 0, "")
		return
	}

	for i, claim := range claims {
		mainRow := []string{
			parseBrazilianDate(claim.Date),
			claim.ID,
			compactSpaces(claim.Store),
			claimReportType(claim),
			safeArea(claim),
			claim.Severity,
			claim.Status,
			claimReportUpdateDate(claim),
		}
		description := "Descrição: " + compactSpaces(claim.Description)

		pdf.SetFont("Roboto", "", 6.8)
		lineH := 3.8
		mainH := 8.0
		descLines := pdf.SplitText(description, claimsReportWidth-4)
		descH := float64(len(descLines))*lineH + 3.4
		if descH < 8 {
			descH = 8
		}

		rowH := mainH + descH
		if pdf.GetY()+rowH > claimsReportContentBottom {
			pdf.AddPage()
			drawHeader()
		}

		fill := i%2 == 0
		if fill {
			pdf.SetFillColor(253, 248, 248)
		} else {
			pdf.SetFillColor(255, 255, 255)
		}
		pdf.SetDrawColor(225, 218, 212)
		pdf.SetTextColor(42, 42, 42)
		pdf.SetFont("Roboto", "", 6.8)

		x := claimsReportLeft
		y := pdf.GetY()
		for idx, value := range mainRow {
			drawFixedTableCell(pdf, x, y, cols[idx].w, mainH, value, fill, idx == 0 || idx == 5 || idx == 7)
			x += cols[idx].w
		}

		descY := y + mainH
		if fill {
			pdf.Rect(claimsReportLeft, descY, claimsReportWidth, descH, "FD")
		} else {
			pdf.Rect(claimsReportLeft, descY, claimsReportWidth, descH, "D")
		}
		pdf.SetXY(claimsReportLeft+2, descY+1.4)
		pdf.MultiCell(claimsReportWidth-4, lineH, description, "", "L", false)
		pdf.SetY(y + rowH)
	}
}

func drawFixedTableCell(pdf *fpdf.Fpdf, x, y, w, h float64, text string, fill bool, center bool) {
	align := "L"
	if center {
		align = "C"
	}
	if fill {
		pdf.Rect(x, y, w, h, "FD")
	} else {
		pdf.Rect(x, y, w, h, "D")
	}
	pdf.SetXY(x+1, y+1.8)
	pdf.CellFormat(w-2, h-3.6, fitPDFText(pdf, text, w-2), "", 0, align, false, 0, "")
	pdf.SetXY(x+w, y)
}

func fitPDFText(pdf *fpdf.Fpdf, text string, maxWidth float64) string {
	if pdf.GetStringWidth(text) <= maxWidth {
		return text
	}
	runes := []rune(text)
	for len(runes) > 1 {
		runes = runes[:len(runes)-1]
		candidate := string(runes) + "..."
		if pdf.GetStringWidth(candidate) <= maxWidth {
			return candidate
		}
	}
	return ""
}

func drawClaimsSignatures(pdf *fpdf.Fpdf) {
	ensureClaimsReportSpace(pdf, 48)
	reportSectionTitle(pdf, "ASSINATURAS", false)

	roles := []string{
		"Gerente de Operações",
		"Coordenador de Segurança",
		"Diretor Administrativo",
	}
	blockW := 50.0
	gap := (claimsReportWidth - 3*blockW) / 2.0
	y := pdf.GetY() + 12

	for i, role := range roles {
		x := claimsReportLeft + float64(i)*(blockW+gap)
		pdf.SetDrawColor(80, 80, 80)
		pdf.SetLineWidth(0.35)
		pdf.Line(x, y, x+blockW, y)

		pdf.SetFont("Roboto", "B", 7.5)
		pdf.SetTextColor(45, 45, 45)
		pdf.SetXY(x, y+2.5)
		pdf.CellFormat(blockW, 4, role, "", 1, "C", false, 0, "")

		pdf.SetFont("Roboto", "", 7)
		pdf.SetTextColor(70, 70, 70)
		pdf.SetXY(x, y+9)
		pdf.CellFormat(blockW, 4, "Assinatura: ______________________", "", 1, "L", false, 0, "")
		pdf.SetXY(x, y+14)
		pdf.CellFormat(blockW, 4, "Data: ____/____/________", "", 1, "L", false, 0, "")
	}
	pdf.SetY(y + 24)
}

func reportSectionTitle(pdf *fpdf.Fpdf, title string, centered bool) {
	pdf.SetFont("Roboto", "B", 11)
	pdf.SetTextColor(157, 20, 24)
	align := "L"
	if centered {
		align = "C"
		pdf.SetFont("Roboto", "B", 14)
	}
	pdf.CellFormat(0, 7, title, "", 1, align, false, 0, "")
}

func ensureClaimsReportSpace(pdf *fpdf.Fpdf, needed float64) {
	if pdf.GetY()+needed > claimsReportContentBottom {
		pdf.AddPage()
	}
}

func summarizeClaimsForReport(claims []models.Claim) claimsReportStats {
	stats := claimsReportStats{Total: len(claims)}
	for _, claim := range claims {
		switch normalizeReportText(claim.Severity) {
		case "alta":
			stats.Alta++
		case "media", "média":
			stats.Media++
		case "baixa":
			stats.Baixa++
		}

		switch normalizeReportText(claim.Status) {
		case "em analise", "em análise":
			stats.EmAnalise++
		case "concluido", "concluído", "pago":
			stats.Concluidos++
		}
	}
	return stats
}

func claimsReportPeriod(r *http.Request) string {
	q := r.URL.Query()
	startDate := q.Get("start_date")
	endDate := q.Get("end_date")
	if startDate != "" && endDate != "" {
		return parseBrazilianDate(startDate) + " a " + parseBrazilianDate(endDate)
	}
	if startDate != "" {
		return "A partir de " + parseBrazilianDate(startDate)
	}
	if endDate != "" {
		return "Até " + parseBrazilianDate(endDate)
	}
	return "Todos os registros"
}

func claimsReportFilters(r *http.Request) string {
	q := r.URL.Query()
	var parts []string
	add := func(label, value string) {
		if strings.TrimSpace(value) != "" && value != "Todos" && value != "Todas" && value != "todos" {
			parts = append(parts, label+": "+value)
		}
	}

	add("Busca textual", q.Get("search"))
	add("Status", q.Get("status"))
	add("Gravidade", q.Get("severity"))
	add("Área responsável", q.Get("area"))
	for _, area := range q["responsible_area"] {
		add("Área responsável", area)
	}
	add("Responsabilidade", q.Get("responsibility"))
	add("Tipo", firstNonEmpty(q.Get("category"), q.Get("type")))
	add("Loja", firstNonEmpty(q.Get("store"), q.Get("store_code"), q.Get("store_id")))
	add("Data inicial", parseBrazilianDate(q.Get("start_date")))
	add("Data final", parseBrazilianDate(q.Get("end_date")))

	if len(parts) == 0 {
		return "Todos os registros"
	}
	return strings.Join(parts, " | ")
}

func claimReportType(claim models.Claim) string {
	if claim.OtherType != nil && strings.TrimSpace(*claim.OtherType) != "" {
		return *claim.OtherType
	}
	return claim.Type
}

func claimReportUpdateDate(claim models.Claim) string {
	if claim.ResolvedAt != nil {
		return claim.ResolvedAt.Format("02/01/2006 15:04")
	}
	if !claim.CreatedAt.IsZero() {
		return claim.CreatedAt.Format("02/01/2006 15:04")
	}
	return ""
}

func compactSpaces(value string) string {
	return strings.Join(strings.Fields(value), " ")
}

func normalizeReportText(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
