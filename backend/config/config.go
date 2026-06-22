package config

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	JWTSecret      string
	DSN            string
	DBName         string
	AllowedOrigins []string
	SMTP           SMTPConfig
}

type SMTPConfig struct {
	Enabled  bool
	Host     string
	Port     string
	User     string
	Password string
	From     string
}

func Load() *Config {
	// Carrega backend/.env (execute sempre a partir da pasta backend/).
	if err := godotenv.Overload(".env"); err == nil {
		log.Println("[config] .env carregado de: backend/.env")
	} else {
		log.Println("[config] AVISO: backend/.env não encontrado; usando variáveis de ambiente do sistema")
	}

	host := getenv("DB_HOST", "localhost")
	port := getenv("DB_PORT", "5432")
	user := getenv("DB_USER", "postgres")
	pass := getenv("DB_PASSWORD", "")
	name := getenv("DB_NAME", "jp_mall")
	sslmode := getenv("DB_SSLMODE", "disable")

	// DATABASE_URL tem prioridade (formato URL do Render/Supabase/Heroku)
	var dsn string
	if dbURL := os.Getenv("DATABASE_URL"); dbURL != "" {
		dsn = dbURL
		log.Println("[config] DATABASE_URL detectado — usando URL direta")
	} else {
		log.Printf("[config] DB_HOST=%s  DB_PORT=%s  DB_USER=%s  DB_NAME=%s  DB_SSLMODE=%s",
			host, port, user, name, sslmode)
		dsn = fmt.Sprintf(
			"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
			host, port, user, pass, name, sslmode,
		)
	}

	// ALLOWED_ORIGINS: lista separada por vírgula para CORS em produção
	rawOrigins := getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
	allowedOrigins := strings.Split(rawOrigins, ",")

	smtpEnabled := getenv("SMTP_ENABLED", "false") == "true"

	// Render injeta PORT automaticamente; BACKEND_PORT é fallback para dev local
	serverPort := os.Getenv("PORT")
	if serverPort == "" {
		serverPort = getenv("BACKEND_PORT", "3001")
	}

	return &Config{
		Port:           serverPort,
		JWTSecret:      getenv("JWT_SECRET", "dev_secret"),
		DSN:            dsn,
		DBName:         name,
		AllowedOrigins: allowedOrigins,
		SMTP: SMTPConfig{
			Enabled:  smtpEnabled,
			Host:     getenv("SMTP_HOST", ""),
			Port:     getenv("SMTP_PORT", "587"),
			User:     getenv("SMTP_USER", ""),
			Password: getenv("SMTP_PASSWORD", ""),
			From:     getenv("SMTP_FROM", "noreply@flamboyant.com.br"),
		},
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
