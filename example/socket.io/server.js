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

app = app
  .use(connect.static(__dirname))
  .use(browserify({entry: __dirname+'/client.js', cache: true}))

io = io.listen(app.listen(3000, function () {
  console.log('BrowserStream example running on port 3000')
}))

io.on('connection', function (sock) {
  var bs = _bs(sock)
  bs.on('connection', function (stream) {
    stream.pipe(es.stringify()).pipe(es.log())
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


