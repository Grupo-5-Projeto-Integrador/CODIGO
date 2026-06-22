package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"jpmall/backend/db"
	"jpmall/backend/middleware"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	JWTSecret string
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Email == "" || body.Password == "" {
		jsonError(w, "E-mail e senha são obrigatórios.", http.StatusBadRequest)
		return
	}

	row := db.Pool.QueryRow(
		context.Background(),
		"SELECT id, email, password_hash, role, name FROM users WHERE email = $1",
		body.Email,
	)

	var id int
	var email, passwordHash, role, name string
	if err := row.Scan(&id, &email, &passwordHash, &role, &name); err != nil {
		jsonError(w, "Credenciais inválidas.", http.StatusUnauthorized)
		return
	}

	// Bcrypt hash começa com $2a$, $2b$ ou $2y$. Texto puro é suportado
	// temporariamente — migrar com: go run cmd/hashpw/main.go <senha>
	var valid bool
	if strings.HasPrefix(passwordHash, "$2") {
		valid = bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(body.Password)) == nil
	} else {
		valid = passwordHash == body.Password
	}

	if !valid {
		jsonError(w, "Credenciais inválidas.", http.StatusUnauthorized)
		return
	}

	claims := middleware.UserClaims{
		ID:    float64(id),
		Email: email,
		Role:  role,
		Name:  name,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(8 * time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(h.JWTSecret))
	if err != nil {
		jsonError(w, "Erro ao gerar token.", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"token": signed,
		"user":  map[string]any{"id": id, "email": email, "name": name, "role": role},
	})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(middleware.UserClaimsKey).(*middleware.UserClaims)
	if !ok {
		jsonError(w, "Não autenticado.", http.StatusUnauthorized)
		return
	}

	row := db.Pool.QueryRow(
		context.Background(),
		"SELECT id, email, name, role FROM users WHERE id = $1",
		int(claims.ID),
	)
	var id int
	var email, name, role string
	if err := row.Scan(&id, &email, &name, &role); err != nil {
		jsonError(w, "Usuário não encontrado.", http.StatusNotFound)
		return
	}
	jsonResponse(w, http.StatusOK, map[string]any{"id": id, "email": email, "name": name, "role": role})
}
