var skates = require('skates')
var connect = require('connect')
var _bs = require('browser-stream')
var assert = require('assert')
var es = require('event-stream')

var app = skates()
  .use(connect.static(__dirname))
  .on('connection', function (sock) {
    sock.on('ping', function () {
      console.log('ping')
      sock.emit('pong')
    })
    var bs = _bs(sock)
    bs.on('connection', function (stream) {
      console.log('STREAM OPTIONS', stream)
      //stream.pipe(es.stringify()).pipe(es.log())
      var i = 0
      var t
      t = setInterval(function () {
        stream.write({item: ++i})
        console.log(i)
/*        if(i < 21)
          return
        stream.end()*/
//        clearInterval(t, 200)
      }, 500) 
      stream.on('close', function (){
        clearInterval(t)
      })
      stream.on('error', function () {})
    })
  })
  .listen(3000, function () {
    console.log('BrowserStream example running on port 3000')
  })
