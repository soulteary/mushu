package config

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Response struct {
	Code int `json:"code"`
	Data any `json:"data"`
}
type RemoteConfig struct {
	Job      string `json:"job"`
	Backend  string `json:"server"`
	Report   string `json:"report"`
	BaseTime int64  `json:"base"`
	MinTime  int64  `json:"min"`
	MaxTime  int64  `json:"max"`
}

const JOB_URL = "http://localhost:8080/test.html"
const BACKENT_SERVER = "ws://localhost:8080/ws"
const REPORT_URL = "http://localhost:8080/exchange"

func Config(c *gin.Context) {
	c.JSON(http.StatusOK, Response{
		Code: http.StatusOK,
		Data: RemoteConfig{
			Job:      JOB_URL,
			Backend:  BACKENT_SERVER,
			Report:   REPORT_URL,
			BaseTime: 10,
			MinTime:  3,
			MaxTime:  30,
		},
	})
}
