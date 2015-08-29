import r from 'rethinkdb';
import invitadosJSON from './invitados.json';
import gruposJSON from './grupos.json';

/**
  Invitado structure

 {
  "id": "6d11713b-4988-410e-8b16-4024bd561a57",
  "nombreCompleto": 'Ricardo J. Vázquez',
  "primerNombreDefault": "Ricardo",
  "primerNombre": [
    "Ricardo"
  ],
  "apellidoDefault": "Vázquez",
  "apellido": [
    "Vázquez",
    "Vazquez"
  ],
  "grupo": "6d11713b-4988-410e-8b16-4024bd561a57"
 }
*/

/**
  Grupo structure

 {
  "id": "6d11713b-4988-410e-8b16-4024bd561a57",
  "plusOnes": 1
 }
*/

/**
  RSVP structure

 {
  "id": "6d11713b-4988-410e-8b16-4024bd561a57", // same as grupo id
  "invitados": [
    "6d11713b-4988-410e-8b16-4024bd561a57"
  ]
  "plusOnes": 0
 }
*/

export const connectionInfo = {
  host: process.env.RETHINKDB_HOST || 'localhost',
  port: process.env.RETHINKDB_PORT || 28015,
  db: 'la_gente'
};

export function createDB() {
  let conn = null;
  const createConnectionInfo = {
    host: 'localhost',
    port: 28015
  };

  return r.connect(createConnectionInfo)
  .then((c) => conn = c)
  .then(() => r.dbCreate('la_gente').run(conn))
  .catch((err) => {
    if (err.name !== 'ReqlOpFailedError') {
      return Promise.reject(err);
    }
  })
  .then(() => {
    const invitados = r
      .db('la_gente')
      .tableCreate('invitados')
      .run(conn)
      .then(() => r.db('la_gente').table('invitados').indexCreate('grupo').run(conn))
      .catch((err) => {
        if (err.name === 'ReqlOpFailedError') {
          return r.db('la_gente').table('invitados').delete().run(conn);
        }
        return Promise.reject(err);
      });

    const grupos = r
      .db('la_gente')
      .tableCreate('grupos')
      .run(conn)
      .catch((err) => {
        if (err.name === 'ReqlOpFailedError') {
          return r.db('la_gente').table('grupos').delete().run(conn);
        }
        return Promise.reject(err);
      });

    const rsvps = r
      .db('la_gente')
      .tableCreate('rsvps')
      .run(conn)
      .catch((err) => {
        if (err.name !== 'ReqlOpFailedError') {
          return Promise.reject(err);
        }
      });

    return Promise.all([ invitados, grupos, rsvps ]);
  })
  .then(() => {
    return Promise.all([
      r.db('la_gente').table('grupos').insert(gruposJSON).run(conn),
      r.db('la_gente').table('invitados').insert(invitadosJSON).run(conn)
    ]);
  })
  .then((...args) => console.log(...args))
  .catch((...args) => console.error(...args))
  .then(() => conn.close());
}

export function getGrupo(id) {
  let conn;
  return r.connect(connectionInfo)
  .then((c) => conn = c)
  .then(() => {
    return r.table('grupos')
    .get(id)
    .merge((grupo) => {
      return {
        invitados: r.table('invitados')
          .getAll(grupo('id'), { index: 'grupo' })
          .coerceTo('array')
      };
    })
    .run(conn);
  })
  .catch(() => ({}))
  .then((result) => {
    conn.close();
    return result;
  });
}

export function searchPrimerNombre(primerNombre) {
  let conn;
  return r.connect(connectionInfo)
  .then((c) => conn = c)
  .then(() => {
    return r.table('invitados')
    .concatMap((invitado) => invitado('primerNombre'))
    .distinct()
    .filter((nombre) => nombre.match(`(?i)^${primerNombre}`))
    .run(conn);
  })
  .catch(() => [])
  .then((result) => {
    conn.close();
    return result;
  });
}

export function searchApellido(apellido) {
  let conn;
  return r.connect(connectionInfo)
  .then((c) => conn = c)
  .then(() => {
    return r.table('invitados')
    .concatMap((invitado) => invitado('apellido'))
    .distinct()
    .filter((nombre) => nombre.match(`(?i)^${apellido}`))
    .run(conn);
  })
  .catch(() => [])
  .then((result) => {
    conn.close();
    return result;
  });
}

export function getInvitadoByNombreAndApellido(primerNombre, apellido) {
  let conn;
  return r.connect(connectionInfo)
  .then((c) => conn = c)
  .then(() => {
    return r.table('invitados')
    .filter((invitado) => {
      return invitado('primerNombre')
        .contains(primerNombre)
        .and(
          invitado('apellido')
          .contains(apellido)
        );
    })
    .run(conn);
  })
  .then((invitadosCursor) => invitadosCursor.next())
  .catch(() => ({}))
  .then((result) => {
    conn.close();
    return result;
  });
}

export function getGroupoByNombreAndApellido(primerNombre, apellido) {
  let conn;
  return r.connect(connectionInfo)
  .then((c) => conn = c)
  .then(() => {
    return r.table('invitados')
    .filter((invitado) => {
      return invitado('primerNombre')
        .contains(primerNombre)
        .and(
          invitado('apellido')
          .contains(apellido)
        );
    })
    .run(conn);
  })
  .then((invitadosCursor) => invitadosCursor.next())
  .then((invitado) => {
    return r.table('grupos')
    .get(invitado.grupo)
    .merge((grupo) => {
      return {
        invitados: r.table('invitados')
          .getAll(grupo('id'), { index: 'grupo' })
          .coerceTo('array')
      };
    })
    .run(conn);
  })
  .catch(() => ({}))
  .then((result) => {
    conn.close();
    return result;
  });
}

export function search(query = {}, grupoSearch = false) {
  const { primerNombre, apellido } = query;

  if (!!primerNombre && !!apellido) {
    return grupoSearch ?
      getGroupoByNombreAndApellido(primerNombre, apellido) :
      getInvitadoByNombreAndApellido(primerNombre, apellido);
  } else if (!!primerNombre) {
    return searchPrimerNombre(primerNombre);
  } else if (!!apellido) {
    return searchApellido(apellido);
  }
}

export function rsvp(grupoId, invitados, plusOnes = 0) {
  let conn;
  return r.connect(connectionInfo)
  .then((c) => conn = c)
  .then(() => {
    return r.table('rsvps')
    .insert({
      id: grupoId,
      invitados,
      plusOnes
    }, {
      conflict: 'replace'
    })
    .run(conn);
  })
  .then(() => ({ message: 'sucess' }))
  .catch(() => ({ message: 'error' }))
  .then((result) => {
    conn.close();
    return result;
  });
}
