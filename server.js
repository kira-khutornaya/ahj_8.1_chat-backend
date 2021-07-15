const http = require('http');
const Koa = require('koa');
const cors = require('koa2-cors');
const WS = require('ws');

const app = new Koa();
app.use(cors({
  origin: '*',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

const port = process.env.PORT || 7000;
const server = http.createServer(app.callback());
const wsServer = new WS.Server({ server });
const users = [];

wsServer.on('connection', (ws) => {
  ws.on('message', msg => {
    const request = JSON.parse(msg);

    if (request.event === 'login') {
      const curNickname = users.findIndex((user) => user.nickname.toLowerCase() === request.message.toLowerCase());

      if (request.message && curNickname === -1) {
        ws.nickname = request.message;
        ws.send(JSON.stringify({
          event: 'connect',
          message: users.map((user) => user.nickname)
        }));
        users.push(ws);

        users.forEach(user => {
          const chatEvent = JSON.stringify({
            event: 'system',
            message: {
              action: 'login',
              nickname: ws.nickname
            }
          });

          user.send(chatEvent);
        })
      } else {
        ws.close(1000, 'Этот никнейм уже занят. Выберите другое имя');
      }
    }

    if (request.event === 'dialogue') {
      users.forEach(user => {
        const chatEvent = JSON.stringify({
          event: 'dialogue',
          message: {
            nickname: ws.nickname,
            date: Date.now(),
            text: request.message
          }
        });

        user.send(chatEvent);
      });
    }
  });

  ws.on('close', () => {
    const curNickname = users.findIndex((user) => user.nickname === ws.nickname);

    if (curNickname !== -1) {
      users.splice(curNickname, 1);

      users.forEach(user => {
        const chatEvent = JSON.stringify({
          event: 'system',
          message: {
            action: 'logout',
            nickname: ws.nickname
          }
        });

        user.send(chatEvent);
      });
    }
  });
});

server.listen(port, () => console.log(`Server has been started on ${port}...`));
