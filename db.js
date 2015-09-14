import mongoose from 'mongoose';
import _ from 'lodash';
import invitadosJSON from './invitados.json';
import gruposJSON from './grupos.json';

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
  plusOnes: Number
}, { autoIndex: false }));

const RSVP = mongoose.model('RSVP', new Schema({
  id: { type: Number, index: true },
  plusOnes: Number,
  invitados: [Schema.Types.ObjectId]
}, { autoIndex: false }));

export function createDB() {
  return Promise.all([
    Invitado.remove().then(() => Invitado.create(invitadosJSON)),
    Grupo.remove().then(() => Grupo.create(gruposJSON))
  ]);
}

export function getGrupo(id) {
  return Promise.all([
    Grupo.findOne({id}),
    Invitado.find({grupo: id}).select('-__v -grupo')
  ])
  .then((result) => {
    const [grupo, invitados] = result;
    return _.assign({}, _.pick(grupo, ['id', 'plusOnes']), { invitados });
  })
  .catch(() => ({}));
}

export function searchPrimerNombre(primerNombre) {
  return Invitado
  .find()
  .select('primerNombre')
  .then((invitados) => {
    const allNombres = _.uniq(_.flatten(_.map(invitados, (invitado) => _.get(invitado, 'primerNombre'))));
    const nombreTest = new RegExp(`^${primerNombre}`, 'i');
    return _.filter(allNombres, nombreTest.test.bind(nombreTest));
  })
  .catch(() => []);
}

export function searchApellido(apellido) {
  return Invitado
  .find()
  .select('apellido')
  .then((invitados) => {
    const allApellidos = _.uniq(_.flatten(_.map(invitados, (invitado) => _.get(invitado, 'apellido'))));
    const apellidoTest = new RegExp(`^${apellido}`, 'i');
    return _.filter(allApellidos, apellidoTest.test.bind(apellidoTest));
  })
  .catch(() => []);
}

export function getInvitadoByNombreAndApellido(primerNombre, apellido) {
  return Invitado
  .findOne({
    primerNombre: { $in: [primerNombre] },
    apellido: { $in: [apellido] },
  })
  .select('-__v')
  .then((invitado) => invitado)
  .catch(() => ({}));
}

export function getGroupoByNombreAndApellido(primerNombre, apellido) {
  return getInvitadoByNombreAndApellido(primerNombre, apellido)
  .then((invitado) => {
    return getGrupo(invitado.grupo);
  })
  .catch(() => ({}));
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
  return RSVP
  .update({
    id: grupoId
  }, {
    id: grupoId,
    invitados,
    plusOnes
  }, {
    upsert: true
  })
  .then(() => ({ message: 'sucess' }))
  .catch(() => ({ message: 'error' }));
}
