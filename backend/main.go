package main

import (
	"log"
	"net/http"
	"path/filepath"
	"time"

	"jpmall/backend/config"
	"jpmall/backend/db"
	"jpmall/backend/handlers"
	"jpmall/backend/middleware"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	cfg := config.Load()
	db.Connect(cfg.DSN)

	r := chi.NewRouter()

	// ── Middlewares globais ────────────────────────────────────────────────
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	authH := &handlers.AuthHandler{JWTSecret: cfg.JWTSecret}
	claimNotifH := &handlers.ClaimNotificationsHandler{}
	auth := middleware.RequireAuth(cfg.JWTSecret)

	// ── Arquivos de upload (evidências) ───────────────────────────────────
	uploadPath, _ := filepath.Abs("./uploads")
	r.Handle("/uploads/*", http.StripPrefix("/uploads/",
		http.FileServer(http.Dir(uploadPath))))

	// ── Rotas da API ──────────────────────────────────────────────────────
	r.Route("/api", func(r chi.Router) {

		// Health check — público
		r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
			handlers.JSONResponse(w, http.StatusOK, map[string]any{
				"status":    "ok",
				"database":  cfg.DBName,
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
		})

		// Auth — login público, /me protegido
		r.Post("/auth/login", authH.Login)
		r.With(auth).Get("/auth/me", authH.Me)

		// Claims
		r.Route("/claims", func(r chi.Router) {
			r.Get("/", handlers.ListClaims)
			r.With(auth).Post("/", handlers.CreateClaim)
			// Rotas literais antes de /{id} para evitar conflito de parâmetro
			r.Get("/history", handlers.ListClaimsHistory)
			r.Get("/history/export", handlers.ExportClaimsHistory)
			r.Get("/{id}", handlers.GetClaim)
			r.With(auth).Put("/{id}", handlers.UpdateClaim)
			r.With(auth).Delete("/{id}", handlers.DeleteClaim)
			r.With(auth).Post("/{id}/audit", handlers.AddAuditEntry)
			r.With(auth).Post("/{id}/files", handlers.UploadClaimFiles)
			r.Get("/{id}/notification-data", claimNotifH.GetNotificationData)
			r.Get("/{id}/whatsapp-link", claimNotifH.GetWhatsAppLink)
			r.Get("/{id}/notifications", claimNotifH.GetClaimNotifications)
		})

		// Stores
		r.Route("/stores", func(r chi.Router) {
			r.Get("/", handlers.ListStores)
			r.Get("/meta/segments", handlers.ListSegments)
			r.Get("/{id}", handlers.GetStore)
			r.Put("/{id}/contact", handlers.UpdateStoreContact)
		})

		// Notifications
		r.Route("/notifications", func(r chi.Router) {
			r.Get("/", handlers.ListNotifications)
			r.Post("/", handlers.CreateNotification)
			r.Put("/read-all", handlers.MarkAllNotificationsRead)
			r.Put("/{id}/read", handlers.MarkNotificationRead)
		})

		// Dashboard
		r.Route("/dashboard", func(r chi.Router) {
			r.Get("/stats", handlers.DashboardStats)
			r.Get("/recent", handlers.DashboardRecent)
			r.Get("/summary", handlers.DashboardSummary)
			r.Get("/monthly-claims", handlers.DashboardMonthlyClaims)
			r.Get("/monthly-sinistrality", handlers.DashboardMonthlySinistrality)
			r.Get("/recent-activities", handlers.DashboardRecentActivities)
		})

		// Reports
		r.Route("/reports", func(r chi.Router) {
			r.Get("/claims", handlers.GetReportsClaims)
			r.Get("/claims/pdf", handlers.GetReportsClaimsPDF)
			r.Get("/claims/excel", handlers.GetReportsClaimsExcel)
			r.Get("/final/pdf", handlers.GetReportsFinalPDF)
			r.Get("/final/excel", handlers.GetReportsFinalExcel)
		})
	})

	addr := ":" + cfg.Port
	log.Printf("\n🏢 JP Mall Backend (Go) rodando na porta %s", cfg.Port)
	log.Printf("   Base de dados: %s", cfg.DBName)
	log.Printf("   Health check: http://localhost%s/api/health\n", addr)
	log.Fatal(http.ListenAndServe(addr, r))
}
