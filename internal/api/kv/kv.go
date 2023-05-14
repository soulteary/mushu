package kv

import (
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
)

var Cache = make(map[string]string)

func SetCache(c *gin.Context) {
	var bodyBytes []byte
	if c.Request.Body != nil {
		bodyBytes, _ = io.ReadAll(c.Request.Body)
		fmt.Println("payload", string(bodyBytes))

		id := c.Param("id")
		Cache[id] = string(bodyBytes)
		c.JSON(http.StatusOK, id)
		return
	}
	c.JSON(http.StatusOK, 0)
}

func GetCache(c *gin.Context) {
	id := c.Param("id")
	data, ok := Cache[id]
	if ok {
		c.Data(http.StatusOK, "text/plain", []byte(data))
		Cache[id] = ""
	} else {
		c.Data(http.StatusOK, "text/plain", []byte(""))
	}
}
