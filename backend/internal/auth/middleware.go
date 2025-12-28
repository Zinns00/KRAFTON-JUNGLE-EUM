package auth

import (
	"crypto/rand"
	"encoding/hex"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// GenerateCSRFToken CSRF 토큰 생성
func GenerateCSRFToken() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// AuthMiddleware JWT 인증 미들웨어
func AuthMiddleware(jwtManager *JWTManager) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 쿠키에서 토큰 우선 확인 (HTTP-only 쿠키 보안)
		token := c.Cookies("access_token")

		// 쿠키에 없으면 Authorization 헤더 확인 (API 클라이언트용)
		if token == "" {
			authHeader := c.Get("Authorization")
			if authHeader == "" {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "missing authorization token",
				})
			}
			// Bearer 토큰 파싱
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "invalid authorization header format",
				})
			}
			token = parts[1]
		}

		// 토큰 검증
		claims, err := jwtManager.ValidateAccessToken(token)
		if err != nil {
			if err == ErrExpiredToken {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "token expired",
					"code":  "TOKEN_EXPIRED",
				})
			}
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid token",
			})
		}

		// 사용자 정보를 컨텍스트에 저장
		c.Locals("userID", claims.UserID)
		c.Locals("email", claims.Email)
		c.Locals("nickname", claims.Nickname)
		c.Locals("claims", claims)

		return c.Next()
	}
}

// OptionalAuthMiddleware 선택적 인증 미들웨어 (인증 실패해도 계속 진행)
func OptionalAuthMiddleware(jwtManager *JWTManager) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			authHeader = c.Cookies("access_token")
		}

		if authHeader != "" {
			// Bearer 토큰 파싱
			if strings.HasPrefix(authHeader, "Bearer ") {
				authHeader = strings.TrimPrefix(authHeader, "Bearer ")
			}

			claims, err := jwtManager.ValidateAccessToken(authHeader)
			if err == nil {
				c.Locals("userID", claims.UserID)
				c.Locals("email", claims.Email)
				c.Locals("nickname", claims.Nickname)
				c.Locals("claims", claims)
			}
		}

		return c.Next()
	}
}
