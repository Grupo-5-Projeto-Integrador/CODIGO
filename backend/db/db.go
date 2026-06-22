package db

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

var Pool *pgxpool.Pool

func Connect(dsn string) {
	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		log.Fatalf("Erro ao conectar ao PostgreSQL: %v", err)
	}
	if err := pool.Ping(context.Background()); err != nil {
		log.Fatalf("Banco não respondeu ao ping: %v", err)
	}
	Pool = pool
	log.Println("PostgreSQL conectado com sucesso")
}
