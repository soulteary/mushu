package exchange

import (
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
)

func Exchange(c *gin.Context) {
	var bodyBytes []byte
	if c.Request.Body != nil {
		bodyBytes, _ = io.ReadAll(c.Request.Body)
		fmt.Println("payload", string(bodyBytes))
	}
	c.JSON(http.StatusOK, "ok")
}
