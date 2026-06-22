package handlers

import (
	"fmt"
	"os"

	"github.com/go-pdf/fpdf"
)

// SetupFlamboyantPDF creates an A4 PDF with Flamboyant institutional letterhead.
func SetupFlamboyantPDF(orientation string) *fpdf.Fpdf {
	pdf := fpdf.New(orientation, "mm", "A4", "")

	pdf.AddUTF8Font("Roboto", "", "assets/fonts/Roboto-Regular.ttf")
	pdf.AddUTF8Font("Roboto", "B", "assets/fonts/Roboto-Bold.ttf")

	pdf.SetMargins(18, 20, 18)
	pdf.SetAutoPageBreak(true, 46)
	pdf.AliasNbPages("{nb}")

	softR, softG, softB := 217, 140, 149
	logoPath := "assets/logo-flamboyant.png"

	pdf.SetHeaderFunc(func() {
		pageWidth, _ := pdf.GetPageSize()

		// Logo (if file exists)
		if _, err := os.Stat(logoPath); err == nil {
			pdf.Image(logoPath, 18, 8, 16, 16, false, "PNG", 0, "")
		}

		pdf.SetFont("Roboto", "B", 19)
		pdf.SetTextColor(softR, softG, softB)
		pdf.SetXY(37, 12)
		pdf.CellFormat(59, 9, "FLAMBOYANT", "", 0, "L", false, 0, "")

		pdf.SetFont("Roboto", "", 8)
		pdf.SetTextColor(softR, softG, softB)
		pdf.SetXY(pageWidth-112, 14)
		pdf.CellFormat(94, 6, "Shopping • Urbanismo • Instituto • Agropecuária", "", 0, "R", false, 0, "")

		pdf.SetDrawColor(softR, softG, softB)
		pdf.SetLineWidth(0.2)
		pdf.Line(18, 27, pageWidth-18, 27)

		pdf.SetY(34)
	})

	pdf.SetFooterFunc(func() {
		pageWidth, pageHeight := pdf.GetPageSize()

		pdf.SetFillColor(softR, softG, softB)
		pdf.Rect(0, pageHeight-8, pageWidth, 8, "F")

		pdf.SetFont("Roboto", "", 7.5)
		pdf.SetTextColor(80, 80, 80)
		pdf.SetY(-36)
		pdf.SetX(18)
		pdf.CellFormat(130, 4.2, "Av. Jamel Cecílio, 3.300 • Jardim Goiás • Goiânia/GO", "", 0, "L", false, 0, "")
		pdf.SetX(pageWidth - 58)
		pdf.CellFormat(40, 4.2, fmt.Sprintf("Página %d de {nb}", pdf.PageNo()), "", 1, "R", false, 0, "")

		pdf.SetX(18)
		pdf.CellFormat(130, 4.2, "CEP: 74810-970 • Tel.: 55 (62) 3546-2000", "", 1, "L", false, 0, "")

		pdf.SetX(18)
		pdf.SetFont("Roboto", "", 6)
		pdf.SetTextColor(150, 150, 150)
		pdf.CellFormat(174, 4, "Documento gerado automaticamente pelo Sistema de Gestão de Sinistros do Flamboyant Shopping  •  Uso interno  •  Confidencial", "", 1, "L", false, 0, "")
	})

	return pdf
}
