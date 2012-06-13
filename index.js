
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

  var streams = {}
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
    var s = new Stream(), ended = false
    //if either w or r is false, def will be false
    var def = !opts.writable && !opts.readable 
    s.readable = opts.readable || def
    s.writable = opts.writable || def
    if(opts.opts || opts.options)
      s.options  = opts.opts || opts.options
    s.name = opts.name
    //if(streams[opts.name])
      //throw new Error('stream with name "'+opts.name + '" already exists')
    streams[opts.name] = true
    
    s._id      = opts._id || count ++

    function onPause () {
      s.paused = true
    }

    function onResume () {
      s.paused = false
      s.emit('drain')
    }

    function cleanup () {
      s.writable = s.readable = false
      delete streams[s.name]
      sock.removeListener(PAUSE + id, onPause)
      sock.removeListener(RESUME + id, onResume)
      sock.removeListener(DATA + id, onData)
      sock.removeListener(END + id, onEnd)
      sock.removeListener('disconnect', onDisconnect)
    }

    function onDisconnect () {
      if(!ended) {
        s.emit('error', new Error('unexpected disconnection (call end() first)'))
        cleanup() 
      }
      ended = true
    }

    sock.on('disconnect', onDisconnect)

    function onData(data) {
      s.emit('data', data)
    }

    function onEnd () {
      if(!ended) {
        s.emit('end')
        cleanup()
      }
    }

    s.destroy = function () {
      ended = true
      cleanup()
      s.emit('close')
    }

    if(s.writable) {
      var id = s._id
       s.write = function (data) {
        if(ended) throw new Error('write to ended stream')
        sock.emit(DATA + id, data)
        return !s.paused
      }

      s.end = function (data) {
        if(data != null) this.write(data)
        if(!ended) sock.emit(END + id)
        s.destroy()
      }

      sock.on(PAUSE + id, onPause)
      sock.on(RESUME + id, onResume)

     //TODO but remember, some errors are circular.
      //sock.on(ERROR + id, function (error) {
      //  s.emit('error', error)
      //}

    }

    if(s.readable) {
      var id = s._id
      s.readable = true
      sock.on(DATA + id, onData)
      sock.on(END + id, onEnd)

      s.pause = function () {
        s.paused = true
        if(ended) return
        sock.emit(PAUSE + id)
      }

      s.resume = function () {
        s.paused = false
        if(ended) return
        sock.emit(RESUME + id)
      }
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

    var s = _createStream(settings) //defaults to readable and writable 
    var _opts = {name: name, _id: s._id}
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
  
  sock.on('CREATE_STREAM', function (settings) {
    var s = _createStream(settings)
    e.emit('connection', s, settings.options)
  })

  return e
} 
