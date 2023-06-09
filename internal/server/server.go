package server

import (
	"fmt"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024 * 1000,
	WriteBufferSize: 1024 * 1000,
	CheckOrigin: func(r *http.Request) bool {
		fmt.Println(r.Header.Get("Origin"))
		return true
	},
}

func WS(hub *Hub) func(c *gin.Context) {
	return func(c *gin.Context) {
		ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			fmt.Println(err)
			return
		}
		defer ws.Close()

		client := &Client{Hub: hub, Conn: ws, Send: make(chan []byte, 256)}
		client.Hub.Register <- client

		go client.Write()
		client.Read()
	}
}

func Home(c *gin.Context) {
	buf, _ := os.ReadFile("templates/home.html")
	c.Data(http.StatusOK, "text/html", buf)
}

func Console(c *gin.Context) {
	buf, _ := os.ReadFile("templates/console.html")
	c.Data(http.StatusOK, "text/html", buf)
}

func Usage(c *gin.Context) {
	buf, _ := os.ReadFile("templates/usage.html")
	c.Data(http.StatusOK, "text/html", buf)
}

func Test(c *gin.Context) {
	buf, _ := os.ReadFile("templates/test.html")
	c.Data(http.StatusOK, "text/html", buf)
}
