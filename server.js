import express from "express";
import http from "http";
import { Server } from "socket.io";
import Database from "better-sqlite3";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

import path from "path";

const DATA_DIR = process.env.DATA_DIR || (process.env.RENDER ? "/data" : ".");
const DB_PATH = path.join(DATA_DIR, "draw.db");

const db = new Database(DB_PATH);


db.exec(`
  CREATE TABLE IF NOT EXISTS segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    x1 REAL, y1 REAL,
    x2 REAL, y2 REAL,
    color TEXT,
    w REAL,
    t INTEGER
  );
`);

const insertSeg = db.prepare(`
  INSERT INTO segments (x1,y1,x2,y2,color,w,t)
  VALUES (@x1,@y1,@x2,@y2,@color,@w,@t)
`);

const getAll = db.prepare(`
  SELECT x1,y1,x2,y2,color,w,t FROM segments ORDER BY id ASC
`);

io.on("connection", (socket) => {
  socket.emit("history", getAll.all());

  socket.on("segment", (seg) => {
    insertSeg.run({ ...seg, t: Date.now() });
    socket.broadcast.emit("segment", seg);
  });
});

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

server.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
});
