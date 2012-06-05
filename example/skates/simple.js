//am having trouble getting socket.io to work.


var sio = require('socket.io')
var http = require('http')
var server = http.createServer(function (req, res) {

  res.end('HELLO')
})
sio.listen(server)
server.listen(3000)

