package main

import (
	"github.com/gin-gonic/gin"
	"github.com/soulteary/mushu/internal/api/exchange"
	"github.com/soulteary/mushu/internal/define"
	"github.com/soulteary/mushu/internal/server"
)

func main() {
	hub := server.NewHub()
	go hub.Run()
	r := gin.Default()
	r.GET("/", server.Home)
	r.GET("/ws", server.WS(hub))
	r.Any("/exchange", exchange.Exchange)
	r.GET("/test", server.Test)
	r.Run(define.APP_PORT)
}
