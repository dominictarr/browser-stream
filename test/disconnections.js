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
  var count = 0, dCount = 1
  server.on('connection', function (stream) {
    a.equal(stream.name, 'disconnect1')
    stream
      .on('error', function () {
        console.log('<< ERROR')
      })
     .pipe(slave)
      .pipe(es.log('<<'))//.pipe(stream)
      .on('data', function () {
        dCount ++
      })
     .on('end', function () {
        a.equal(count, dCount, 'each stream should see the same items')
        console.log('<< END')
      })
  })
  var rns = randomNumberStream()
  rns
    .on('data', function (data) {
      if(++ count < 12) return
      if(_client.connected) {
        _client.disconnect()
        console.log('DISCONNECT')
      }
      console.log('DATA', data, count)
    })
    .pipe(master)
    .pipe(es.log('>>'))
    .pipe(client.createWriteStream('disconnect1')
      .on('error', function () {rns.destroy(); console.log('>> ERROR')})
      .on('end', function () {
        //END should always be EMITTED
        //RIGHT?
        a.equal(count, dCount, 'each stream should see the same items')
        console.log('>> END')
      //not all the events are emitted, 
      //but since the streams are destroyed,
      //and piping stops then they end up with 
      //the same data through them.
        slave.validate()
      }))
  /*
  THERE are some problems with streams that close.
  or rather, SHOULD close.   
  */ 
 
  _client.connect() //connects the server too
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
  _client.on('disconnect', function () {
    console.log('CLIENT DISCONNECT')
  })
  _server.on('disconnect', function () {
    console.log('SERVER DISCONNECT')
  })
  var client = bs(_client)
  var server = bs(_server)
  _client.connect() //connects the server too

  var randoms = []
  function rand() {
    var r
    randoms.push(r = Math.random())
    return r
  }
  var clientErr = false, serverErr = false
  process.on('exit', function () {
    a.ok(clientErr, 'expected client to emit an error')
    a.ok(serverErr, 'expected server to emit an error')
    console.log('end point emitted errors correctly')
  })

  var streams = 0, ended = 0
  server.on('connection', function (stream) {
    streams ++
    stream
      .on('data', function (data) {
        var r 
        a.equal(data, r = randoms.shift())
        console.log('data', r)
      })
      .on('error', function () {
        //I'm expecting this
        serverErr = true
        a.equal(streams, 1)
        console.log('error!')
      })
    var r = Math.random()
    var _ended = false
    stream.on('end', function () {
      a.ok(!_ended, 'end MUST only be emitted once')
      _ended = true
      a.equal(streams, ++ ended)
      console.log('end!')
    })
  })

  var c = client.createWriteStream('A')
  c.on('error', function () {
    //expecting this!
    clientErr = true
    console.log('error')
  })

  c.write(rand())
  c.write(rand())
  c.write(rand())
  c.write(rand())
  _client.disconnect()

  if(c.writable)
    c.write(rand())
  a.throws(function () { c.write(rand()) })

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
    a.throws(function () { s.write(Math.random()) })//this should be ignored
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
