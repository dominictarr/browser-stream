
var Stream = require('stream').Stream
var EventEmitter = require('events').EventEmitter

module.exports = function (sock) {
  var e = new EventEmitter ()

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
    var def = !opts.writable && !opts.readable 
    s.readable = opts.readable || def
    s.writeable = opts.writeable || def
    s.name = opts.name
    if(s.writable)
      _writeStream(s)
    else
      _readStream(s)
    return s
  }

  e.createWriteStream = function (name) {
    return this.createStream(name, {writeable: true})
  }
 
  e.createReadStream = function (name) {
    return this.createStream(name, {writeable: true})
  }

  e.createStream = function (name, opts) {
    opts.name = name
    var _opts = {name: name}
    var s = _createStream(opts)
     if(s.readable)
      _opts.writable = true
    else if(s.writable)
      _opts.readable = true
    sock.emit('CREATE_STREAM', opts)
    return s
  }
  
  sock.on('CREATE_STREAM', function (opts) {
    var s = new Stream()
    s.name = opts.name
    for(var k in opts)
      s[k] = opts[k]
    if(s.writeable) {
      _writeStream(s, sock)
    }

    e.emit('open', s)
  })

  return e

} 
