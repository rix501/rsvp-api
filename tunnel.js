var tunnel = require('tunnel-ssh');

// aws-us-east-1-portal.3.dblayer.com

// 127.0.0.2:28015:10.47.56.2:28015

// 127.0.0.3:28015:10.47.56.3:28015

var config = {
  username: 'compose',
  port: 10511,
  host: 'aws-us-east-1-portal.3.dblayer.com',

  srcPort: 28015,
  srcHost: 'localhost',

  dstPort: 28015,
  dstHost: '10.47.56.3',

  localHost: 'localhost',
  localPort: 28015,

  privateKey: require('fs').readFileSync('/Users/rixvazquez/.ssh/id_rsa'),
  password:'secret'
};

var server = tunnel(config, function (error, result) {
  //you can start using your resources here. (mongodb, mysql, ....)
  if (error) {
    throw error;
  }

  console.log('connected');
});