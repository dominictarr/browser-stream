//var io = require('socket.io')
var bs = require('browser-stream')(io.connect('http://localhost:3000'))

var dominode = require('dominode.js')('#body', '<div id="item"></div>')

rs = bs.createReadStream('whatever')

rs.pipe(dominode)
rs.on('data', function(d) {
  console.log(d)
})


