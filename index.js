
var Stream = require('stream').Stream
var EventEmitter = require('events').EventEmitter

/*
Although sockjs and browserchannel are consistent on the client
they are different on the server, while socket.io are consistent on the client and the server...

I wrote a module that wraps sockjs (could easily adapt to wrap any WebSocket Compatibility Layer)
in an interface that is like an two remote event emitters,
except that A.on('event',listener) is triggered by B.emit('event')

(see the tests)



*/

module.exports = function (sock) {

/*
  socket.io is a bad pattern. it's a single lib,
  but it _should_ be a small ecosystem of tools.

  when you call createStream() it should return a stream immediately.
  thats how it is everywhere else in node.
  
  but, if there is a disconnection, all the streams should emit 'end'.
  then emit 'error' if you try to write to them after?

  my problem wasn't in socket.io... it was in browser-stream.
*/

  var e = new EventEmitter ()
  var count = 1
  var DATA   = ''
    , END    = '.'
    , PAUSE  = '?'
    , RESUME = '*'
    , ERROR  = '!'

  function _createStream(opts) {
    var s = new Stream()
    //if either w or r is false, def will be false
    var def = !opts.writable && !opts.readable 
    s.readable = opts.readable || def
    s.writable = opts.writable || def
    if(opts.opts || opts.options)
      s.options  = opts.opts || opts.options
    s.name = opts.name
    s._id      = opts._id || count ++

    if(s.writable) {
      var id = s._id
       s.write = function (data) {
        sock.emit(DATA + id, data)
        return !s.paused
      }

      s.end = function (data) {
        if(data != null) this.write(data)
        sock.emit(END + id)
        cleanup()
      }
      function onPause () {
        s.paused = true
      }
      function onResume () {
        s.paused = false
        s.emit('drain')
      }
      function onDisconnect () {
        console.log('DISCONNECT!!!!')
        s.emit('close')
        cleanup() 
      }

      sock.on(PAUSE + id, onPause)
      sock.on(RESUME + id, onResume)
      sock.on('disconnect', onDisconnect)

      function cleanup () {
        sock.removeListener(PAUSE + id, onPause)
        sock.removeListener(RESUME + id, onResume)
        sock.removeListener('disconnect', onDisconnect)
      }
      //TODO but remember, some errors are circular.
      //sock.on(ERROR + id, function (error) {
      //  s.emit('error', error)
      //}

    }
    if(s.readable){
      var id = s._id
      s.readable = true
      function onData(data) {
        s.emit('data', data)
      }
      function onEnd () {
        s.emit('end')
        sock.removeListener(DATA + id, onData)
        sock.removeListener(END + id, onEnd)
        sock.removeListener('disconnect', onEnd)
        //OH, I didn't understand about close.
        //that means you can't write anymore.
      }
      sock.on(DATA + id, onData)
      sock.on(END + id, onEnd)
      sock.on('disconnect', onEnd)

      s.pause = function () {
        s.paused = true
        sock.emit(PAUSE + id)
      }
      s.resume = function () {
        s.paused = false
        sock.emit(RESUME + id)
      }
      //s.on('error', function (error) {
      //})

    } //end of setting up readable stream

    return s
  }
  e.createWriteStream = function (name, opts) { 
    return this.createStream(name, opts, {writable: true})
  }
 
  e.createReadStream = function (name, opts) {
    return this.createStream(name, opts, {readable: true})
  }

  e.createStream = function (name, opts, settings) {
    settings = settings || {}
    settings.name = name
    settings.options = opts

    var _opts = {name: name}
    var s = _createStream(settings) //defaults to readable and writable 
    if(opts) {
      _opts.options = opts
      s.options = opts
    }
    if(s.readable)
      _opts.writable = true
    if(s.writable)
      _opts.readable = true
    sock.emit('CREATE_STREAM', _opts)
    return s
  }
  
  sock.on('CREATE_STREAM', function (opts) {
    var s = _createStream(opts)
    e.emit('connection', s, opts.opts)
    e.emit('open', s, opts.opts) //legacy interface
  })

  return e
} 
