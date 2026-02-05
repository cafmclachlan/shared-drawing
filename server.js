import express from "express";
import http from "http";
import { Server } from "socket.io";
import Database from "better-sqlite3";
import path from "path";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const DATA_DIR = process.env.DATA_DIR || (process.env.RENDER ? "/data" : ".");
const DB_PATH = path.join(DATA_DIR, "draw.db");

const db = new Database(DB_PATH);

// ✅ ONE-TIME RESET (NUKES ALL SAVED DRAWINGS)
// Leave this in for ONE deploy, then remove it and redeploy again.
db.exec(`DROP TABLE IF EXISTS segments;`);

db.exec(`
  CREATE TABLE IF NOT EXISTS segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    x1 REAL, y1 REAL,
    x2 REAL, y2 REAL,
    nx1 REAL, ny1 REAL,
    nx2 REAL, ny2 REAL,
    color TEXT,
    w REAL,
    t INTEGER
  );
`);

const insertSeg = db.prepare(`
  INSERT INTO segments (x1,y1,x2,y2,nx1,ny1,nx2,ny2,color,w,t)
  VALUES (@x1,@y1,@x2,@y2,@nx1,@ny1,@nx2,@ny2,@color,@w,@t)
`);

const getAll = db.prepare(`
  SELECT x1,y1,x2,y2,nx1,ny1,nx2,ny2,color,w,t
  FROM segments
  ORDER BY id ASC
`);

io.on("connection", (socket) => {
  socket.emit("history", getAll.all());

  socket.on("segment", (seg) => {
    insertSeg.run({
      x1: seg.x1 ?? null,
      y1: seg.y1 ?? null,
      x2: seg.x2 ?? null,
      y2: seg.y2 ?? null,
      nx1: seg.nx1 ?? null,
      ny1: seg.ny1 ?? null,
      nx2: seg.nx2 ?? null,
      ny2: seg.ny2 ?? null,
      color: seg.color,
      w: seg.w,
      t: Date.now(),
    });

    socket.broadcast.emit("segment", seg);
  });
});

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

server.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
});
