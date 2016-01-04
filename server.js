import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createDB, getGrupo, search, rsvp, getRsvps } from './db';

const app = express();

app.use(cors());
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.get('/search', (req, res) => {
  search(req.query)
    .then(res.json.bind(res))
    .catch((err) => res.status(404).json({error: err}));
});

app.get('/search/grupo', (req, res) => {
  search(req.query, true)
    .then(res.json.bind(res))
    .catch((err) => res.status(404).json({error: err}));
});

app.get('/grupos/:id', (req, res) => {
  const grupoID = parseInt(req.params.id, 10);
  getGrupo(grupoID)
    .then(res.json.bind(res))
    .catch((err) => res.status(404).json({error: err}));
});

app.get('/rsvps', (req, res) => {
  getRsvps().then((rsvps) => {
    const rows = rsvps.map(({invitados, invitadosGoing, invitedToBeach, goingToBeach}) => {
      return `
        <tr>
          <td>${invitados}</td>
          <td>${invitadosGoing}</td>
          <td>${invitedToBeach}</td>
          <td>${goingToBeach}</td>
        </tr>
      `;
    });

    res.send(`
        <style>
          table {
            border-collapse: collapse;
          }

          td, th {
            border: 1px solid black;
          }
        </style>
        <table>
        <tr>
        <th>Invitados</th>
        <th>Invitados Going</th>
        <th>Invited to beach?</th>
        <th>Going to beach?</th>
        </tr>
        ${rows.join('')}
        </table>
    `);
  });
});

app.post('/rsvp', (req, res) => {
  const { grupo, invitados, plusOnes, beach } = req.body;
  rsvp(grupo, invitados, plusOnes, beach).then(res.json.bind(res));
});

const server = app.listen(process.env.PORT || 3000, () => {
  const host = server.address().address;
  const port = server.address().port;

  console.log('RSVP app listening at http://%s:%s', host, port);

  createDB();
});
