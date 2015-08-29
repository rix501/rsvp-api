import express from 'express';
import bodyParser from 'body-parser';
import r from 'rethinkdb';
import { createDB, getGrupo, search, rsvp } from './db';

const app = express();

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.get('/invitados', (req, res) => {
  let conn;
  r.connect(connectionInfo)
  .then((c) => conn = c)
  .then(() => r.table('invitados').run(conn))
  .then((invitadosCursor) => invitadosCursor.toArray())
  .then(res.json.bind(res));
});

app.get('/search', (req, res) => {
  search(req.query).then(res.json.bind(res));
});

app.get('/search/grupo', (req, res) => {
  search(req.query, true).then(res.json.bind(res));
});

app.get('/grupos/:id', (req, res) => {
  const grupoID = parseInt(req.params.id, 10);
  getGrupo(grupoID).then(res.json.bind(res));
});

app.post('/rsvp', (req, res) => {
  const { groupo, invitados, plusOnes } = req.body;
  rsvp(groupo, invitados, plusOnes).then(res.json.bind(res));
});

const server = app.listen(process.env.PORT || 3000, () => {
  const host = server.address().address;
  const port = server.address().port;

  console.log('RSVP app listening at http://%s:%s', host, port);

  createDB();
});
