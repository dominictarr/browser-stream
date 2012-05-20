
var Stream = require('stream').Stream
var EventEmitter = require('events').EventEmitter

module.exports = function (sock) {
  var e = new EventEmitter ()

  //id use socket.io namespaces here, but they are really arwkward in this usecase.
  function _writeStream (s) {
      var DATA = s.name
      var END = 'END_'+s.name
       s.write = function (data) {
        sock.emit(DATA, data)
        return true
      }
      s.end = function (data) {
        if(data != null) this.write(data)
        sock.emit(END)
      }
      //sock.on('PAUSE_'+name, ...
      //sock.on('DRAIN_'+name, ... 
  }

  function _readStream (s) {
    var DATA = s.name
      , END = 'END_'+s.name
    s.readable = true
    function onData(data) {
      s.emit('data', data)
    }
    function onEnd () {
      s.emit('end')
      sock.removeListener(DATA, onData)
      sock.removeListener(END, onEnd)
    }
    sock.on(DATA, onData)
    sock.on(END, onEnd) 
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
