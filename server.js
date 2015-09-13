import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createDB, getGrupo, search, rsvp } from './db';

const app = express();

app.use(cors({
  origin: 'http://paolayricardo.com'
}));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

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
