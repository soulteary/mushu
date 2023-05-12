package server

import "github.com/gorilla/websocket"

type Hub struct {
	Clients    map[*Client]bool
	Broadcast  chan []byte
	Register   chan *Client
	Unregister chan *Client
}

type Client struct {
	Hub  *Hub
	Conn *websocket.Conn
	Send chan []byte
}
