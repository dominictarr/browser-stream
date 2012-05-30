
var Stream = require('stream').Stream

/*
Although sockjs and browserchannel are consistent on the client
they are different on the server, while socket.io are consistent on the client and the server...

I think I gotta fit in the reconnector some place different...
also, it's only the client side that should reconnect.
the server shouldn't.
*/
//so I probably want to pass this a reconnector
//that replicates the EventEmitter interface,
//and emits 'disconnect', and then 'connect' when reconnected.
//it buffers emitted events if not connected,
//but all streams should end on disconnect.
//feels like this shoud be a seperate module

module.exports = function (sock) {

/*
  socket.io is a bad pattern. it's a single lib,
  but it _should_ be a small ecosystem of tools.

  gonna replace this with something that the other stream-fallback modules.
  sockjs, and BrowserChannel. they are both pretty much the same...

  when you call creatStream() it should return a stream immediately.
  thats how it is everywhere else in node.
  
  but, if there is a disconnection, all the streams should emit 'end'.
  then emit 'error' if you try to write to them after?

  hmm, I think I want to wrap the stream in a EventEmitter interface.
  and then turn that into the multiplexed stream.
*/

  var e = new EventEmitter ()
  var count = 1
  var DATA   = ''
    , END    = '.'
    , PAUSE  = '?'
    , RESUME = '*'
    , ERROR  = '!'

  function _writeStream (s) {
    var id = s._id
     s.write = function (data) {
      sock.emit(DATA + id, data)
      return !s.paused
    }
    s.end = function (data) {
      if(data != null) this.write(data)
      sock.emit(END + id)
    }
    sock.on(PAUSE + id,function () {
      s.paused = true
    })
    sock.on(RESUME + id, function () {
      s.paused = false
      s.emit('drain')
    })
    //TODO but remember, some errors are circular.
    //sock.on(ERROR + id, function (error) {
    //  s.emit('error', error)
    //}
  }

  function _readStream (s) {
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
  }

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
    if(s.writable)
      _writeStream(s)
    if(s.readable)
      _readStream(s)
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
