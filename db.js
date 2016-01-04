import mongoose from 'mongoose';
import _ from 'lodash';
import invitadosJSON from './invitados.json';
import gruposJSON from './grupos.json';

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGOHQ_URL || 'mongodb://localhost/test');
const { Schema } = mongoose;

const Invitado = mongoose.model('Invitado', new Schema({
  nombreCompleto: String,
  primerNombreDefault: String,
  primerNombre: { type: [String], index: true },
  apellidoDefault: String,
  apellido: { type: [String], index: true },
  grupo: { type: Number, index: true }
}, { autoIndex: false }));

const Grupo = mongoose.model('Grupo', new Schema({
  id: { type: Number, index: true },
  plusOnes: Number,
  beach: Boolean
}, { autoIndex: false }));

const RSVP = mongoose.model('RSVP', new Schema({
  id: { type: Number, index: true },
  beach: Boolean,
  invitados: [String],
}, { autoIndex: false }));

export function createDB() {
  return Promise.all([
    Invitado.remove().exec().then(() => Invitado.create(invitadosJSON).exec()),
    Grupo.remove().exec().then(() => Grupo.create(gruposJSON).exec())
  ]);
}

export function getGrupo(id) {
  return Promise.all([
    Grupo.findOne({id}).exec(),
    Invitado.find({grupo: id}).select('-__v -grupo').exec()
  ])
  .then((result) => {
    const [grupo, invitados] = result;
    return _.assign({}, _.pick(grupo, ['id', 'plusOnes', 'beach']), { invitados });
  })
  .catch(() => Promise.reject('Not Found'));
}

export function searchPrimerNombre(primerNombre) {
  return Invitado
  .find()
  .select('primerNombre')
  .exec()
  .then((invitados) => {
    const allNombres = _.uniq(_.flatten(_.map(invitados, (invitado) => _.get(invitado, 'primerNombre'))));
    const nombreTest = new RegExp(`^${primerNombre}`, 'i');
    return _.filter(allNombres, nombreTest.test.bind(nombreTest));
  })
  .catch(() => Promise.reject('Not Found'));
}

export function searchApellido(apellido) {
  return Invitado
  .find()
  .select('apellido')
  .exec()
  .then((invitados) => {
    const allApellidos = _.uniq(_.flatten(_.map(invitados, (invitado) => _.get(invitado, 'apellido'))));
    const apellidoTest = new RegExp(`^${apellido}`, 'i');
    return _.filter(allApellidos, apellidoTest.test.bind(apellidoTest));
  })
  .catch(() => Promise.reject('Not Found'));
}

export function getInvitadoByNombreAndApellido(primerNombre, apellido) {
  return Invitado
  .findOne({
    primerNombre: { $in: [primerNombre] },
    apellido: { $in: [apellido] },
  })
  .select('-__v')
  .exec()
  .then((invitado) => invitado)
  .catch(() => Promise.reject('Not Found'));
}

export function getGroupoByNombreAndApellido(primerNombre, apellido) {
  return getInvitadoByNombreAndApellido(primerNombre, apellido)
  .then((invitado) => getGrupo(invitado.grupo))
  .catch(() => Promise.reject('Not Found'));
}

export function search(query = {}, grupoSearch = false) {
  const { primerNombre, apellido } = query;

  if ( grupoSearch && (!primerNombre || !apellido) ) {
    // group search needs both
    return Promise.reject('Not Found');
  }

  if (!!primerNombre && !!apellido) {
    return grupoSearch ?
      getGroupoByNombreAndApellido(primerNombre, apellido) :
      getInvitadoByNombreAndApellido(primerNombre, apellido);
  } else if (!!primerNombre) {
    return searchPrimerNombre(primerNombre);
  } else if (!!apellido) {
    return searchApellido(apellido);
  }

  return Promise.reject('Not Found');
}

export function getRsvps() {
  return Promise.all([
    Grupo.find().exec(),
    Invitado.find().exec(),
    RSVP.find().exec()
  ])
  .then((result) => {
    const [grupos, invitados, rsvps] = result;

    return grupos.map((grupo) => {
      const rsvpForGrupo = rsvps.find((r) => r.id === grupo.id) || {};
      const invitadosInGrupo = invitados
        .filter((invitado) => invitado.grupo === grupo.id)
        .map((invitado) => invitado.nombreCompleto)
        .join(', ');

      return {
        invitados: invitadosInGrupo,
        invitadosGoing: rsvpForGrupo.invitados || '',
        invitedToBeach: grupo.beach ? 'Yes' : 'No',
        goingToBeach: rsvpForGrupo.beach ? 'Yes' : 'No'
      };
    });
  });
}

export function rsvp(grupoId, ids, plusOnes = 0, beach = false) {
  const promises = ids.map((id) => Invitado.findOne({ _id: id }).exec());

  return Promise.all(promises)
  .then((invitados) => invitados.map((invitado) => invitado.nombreCompleto))
  .then((invitados) => {
    return RSVP
      .update({
        id: grupoId
      }, {
        id: grupoId,
        invitados,
        beach
      }, {
        upsert: true
      })
      .then(() => ({ message: 'sucess' }), () => ({ message: 'error' }));
  });
}
