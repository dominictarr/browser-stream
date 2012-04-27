var io = require('socket.io')
var connect = require('connect')
var app = connect.createServer()
var http = require('http')
var io = require('socket.io')
var _bs = require('browser-stream')
var assert = require('assert')
var browserify = require('browserify')
var es = require('event-stream')
var fs = require('fs')
//TODO: allow both _bs(io) and _bs(connection)

/*var app = http.createServer(function (req, res) {

    fs.createReadStream(__dirname + req.url).pipe(res)

})*/

app = app
//  .use(function (req, res) {
//    res.end('HELLO')
//  })
  .use(connect.static(__dirname))
  .use(browserify(__dirname+'/client.js'))

io = io.listen(app.listen(3000))

//io = io.listen(app)

console.log(io)

io.on('connection', function (sock) {
  var bs = _bs(sock)

  bs.on('connection', function (stream) {
    stream.pipe(es.stringify()).pipe(es.log())
    console.log('OPEN', stream, stream.__proto__)
    var i = 0
    var t
    t = setInterval(function () {
      stream.write({item: ++i})
      if(i < 21)
        return
      stream.end()
      clearInterval(t, 200)
    }) 
  })
})


