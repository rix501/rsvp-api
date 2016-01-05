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
    const rows = rsvps.map(({rsvped, invitados, invitadosGoing, invitedToBeach, goingToBeach}) => {
      const going = rsvped && invitadosGoing.length;
      const notGoing = rsvped && !invitadosGoing.length;
      let className = '';
      if (going) {
        className = 'going';
      } else if (notGoing) {
        className = 'not-going';
      }

      const beachClass = invitedToBeach ? 'beach' : 'no-beach';
      return `
        <tr class="${className}">
          <td>${invitados.join(', ')}</td>
          <td>${invitadosGoing.join(', ')}</td>
          <td class="${beachClass}">${invitedToBeach ? goingToBeach : ''}</td>
        </tr>
      `;
    });

    const totals = rsvps.reduce((all, next) => {
      const {rsvped, invitados, invitadosGoing, isGoingToBeach } = next;
      const { total, going, notGoing, goingToBeach } = all;
      const invitadosL = invitados.length;
      const invitadosGoingL = rsvped ? invitadosGoing.length : 0;
      const invitadosNotGoingL = rsvped ? invitadosL - invitadosGoing.length : 0;

      return Object.assign(all, {
        total: total + invitadosL,
        going: going + invitadosGoingL,
        notGoing: notGoing + invitadosNotGoingL,
        goingToBeach: isGoingToBeach ? (goingToBeach + invitadosGoingL) : goingToBeach
      });
    }, { total: 0, going: 0, notGoing: 0, goingToBeach: 0 });

    res.send(`
        <style>
          table {
            border-collapse: collapse;
          }

          td, th {
            border: 1px solid black;
            text-align: center;
          }

          .no-beach {
            border: 0;
            width: 100px;
          }

          .going {
            background-color: #12DA12;
          }

          .not-going {
            background-color: #FD3D3D;
          }
        </style>
        <table>
        <tr>
        <th>Invitados</th>
        <th>Invitados Going</th>
        <th>Going to beach?</th>
        </tr>
        ${rows.join('')}
        </table>

        <h1>Totales:</h1>
        <h2>Invitados going: ${totals.going}</h2>
        <h2>Invitados not going: ${totals.notGoing}</h2>
        <h2>Invitados going to beach: ${totals.goingToBeach}</h2>
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
