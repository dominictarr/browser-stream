
var Stream = require('stream').Stream
var EventEmitter = require('events').EventEmitter

module.exports = function (sock) {
  var e = new EventEmitter ()
  var count = 1
  //id use socket.io namespaces here, but they are really arwkward in this usecase.
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
    }
    sock.on(DATA + id, onData)
    sock.on(END + id, onEnd)

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
