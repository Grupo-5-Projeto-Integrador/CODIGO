package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserClaimsKey contextKey = "userClaims"

type UserClaims struct {
	ID    float64 `json:"id"`
	Email string  `json:"email"`
	Role  string  `json:"role"`
	Name  string  `json:"name"`
	jwt.RegisteredClaims
}

func RequireAuth(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				http.Error(w, `{"error":"Token de autenticação não fornecido."}`, http.StatusUnauthorized)
				return
			}

			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
			token, err := jwt.ParseWithClaims(tokenStr, &UserClaims{}, func(t *jwt.Token) (any, error) {
				return []byte(secret), nil
			})
			if err != nil || !token.Valid {
				http.Error(w, `{"error":"Token inválido ou expirado."}`, http.StatusUnauthorized)
				return
			}

			claims, ok := token.Claims.(*UserClaims)
			if !ok {
				http.Error(w, `{"error":"Token malformado."}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
