package main

import (
	"log"
	"net/http"

	"github.com/soulteary/mushu/internal/define"
	"github.com/soulteary/mushu/internal/server"
)

func main() {
	inst := server.NewHub()
	go inst.Run()
	http.HandleFunc("/", server.Home)
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		server.Ws(inst, w, r)
	})
	err := http.ListenAndServe(define.APP_PORT, nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
