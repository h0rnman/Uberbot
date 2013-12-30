var plugLogin = require('..')

var creds = require('./creds')

plugLogin(creds, function(err, cookie) {
  if (err) {console.error(err)}
  console.log('cookie', cookie);
})