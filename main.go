package main

import (
	"github.com/gin-gonic/gin"
	"github.com/soulteary/mushu/internal/api/config"
	"github.com/soulteary/mushu/internal/api/exchange"
	"github.com/soulteary/mushu/internal/api/kv"
	"github.com/soulteary/mushu/internal/define"
	"github.com/soulteary/mushu/internal/server"
)

func main() {
	hub := server.NewHub()
	go hub.Run()
	r := gin.Default()
	r.GET("/", server.Home)
	r.GET("/test.html", server.Test)
	r.GET("/page/console.html", server.Console)
	r.GET("/page/usage.html", server.Usage)
	r.GET("/ws", server.WS(hub))
	r.Any("/exchange", exchange.Exchange)
	r.POST("/config", config.Config)
	r.GET("/kv/:id", kv.GetCache)
	r.POST("/kv/:id", kv.SetCache)
	r.Run(define.APP_PORT)
}
