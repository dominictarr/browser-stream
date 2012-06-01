/*

  connect two streams.

  on a disconnect, both streams should emit 'close'

*/

var a = require('assertions')
var RemoteEventEmitter = require('./remote-events')
var consistent = require('./consistent')
var bs = require('..')
var es = require('event-stream')

function randomNumberStream (max, count) {
  count = count || 20
  max   = max   || 10
  return es.readable(function (i, cb) {
    this.emit('data', Math.random() * max)
    if(i > count)
    this.emit('end')
    cb()
  })
}

;(function () {

  var master = consistent()
  var slave = master.createSlave()

  var _client, _server = 
    new RemoteEventEmitter(
      _client = new RemoteEventEmitter()
    )

  var client = bs(_client)
  var server = bs(_server)

  server.on('connection', function (stream) {
    a.equal(stream.name, 'disconnect1')
    stream
      .pipe(slave)
      .pipe(es.log('<<'))//.pipe(stream)
      .on('end', function () {
        console.log('<< END')
      })
      .on('close', function () {
        console.log('<< CLOSE')
      })
  })
  var count = 0
  randomNumberStream()
    .on('data', function () {
      if(count ++ < 12) return
      console.log('DISCONNECT')
      if(_client.connected)
        _client.disconnect()
    })
    .pipe(master)
    .pipe(es.log('>>'))
    .pipe(client.createWriteStream('disconnect1'))
    .on('end', function () {
      //END should always be EMITTED
      //RIGHT?
      console.log('>> END')
      a.throws(function () { slave.validate() })
    })
    .on('close', function () {
      console.log('>> CLOSE')
    })
  
  _client.connect() //connects the server too
  console.log('ms')
})();

;(function simple () {

  var _client, _server = 
    new RemoteEventEmitter(
      _client = new RemoteEventEmitter()
    )

  var client = bs(_client)
  var server = bs(_server)
  _client.connect() //connects the server too


  var r1 = Math.random()
  server.on('connection', function (stream) {
    stream.on('data', function (data) {
      a.equal(data, r1)
      console.log('data')
    })
    stream.on('end', function () {
      console.log('end')
    })
  })

  c = client.createWriteStream()
  c.write(r1)
  c.end()

})();

;(function disconnect () {

  var _client, _server = 
    new RemoteEventEmitter(
      _client = new RemoteEventEmitter()
    )

  var client = bs(_client)
  var server = bs(_server)
  _client.connect() //connects the server too

  var randoms = []
  function rand() {
    var r
    randoms.push(r = Math.random())
    return r
  }
  var streams = 0, ended = 0
  server.on('connection', function (stream) {
    streams ++
    stream.on('data', function (data) {
      var r 
      a.equal(data, r = randoms.shift())
      console.log('data', r)
    })
    stream.on('close', function () {
      a.equal(streams, 1)
      console.log('close')
    })
    stream.on('end', function () {
      a.equal(streams, ++ ended)
      console.log('end')
    })
  })

  c = client.createWriteStream()
  c.on('close', function () {
    console.log('close')
  })
  c.write(rand())
  c.write(rand())
  c.write(rand())
  c.write(rand())

  _client.disconnect()
  c2 = client.createWriteStream()
  c.write(rand())
  c.write(rand())
  c.write(rand())
  c.write(rand())
  _client.connect()
  c.end()
 
})();


;(function disconnect2 () {
console.log('disconnect2')
  var _client, _server = 
    new RemoteEventEmitter(
      _client = new RemoteEventEmitter()
    )

  var client = bs(_client)
  var server = bs(_server)

  var randoms = []
  function rand() {
    var r
    randoms.push(r = Math.random())
    return r
  }
  var streams = 0
  server.on('connection', function (s) {
    s.write(rand())
    s.write(rand())
    s.write(rand())
    s.write(rand())
    s.end()
    s.write(Math.random())//this should be ignored
  })

  c = client.createReadStream()
  c.on('data', function (data) {
    var r 
    a.equal(data, r = randoms.shift())
    console.log('data', r)
  })
  .on('end', function () {
    console.log('end')
  })
  _client.connect() //co nnects the server too

})();
