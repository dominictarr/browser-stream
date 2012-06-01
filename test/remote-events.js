
var EventEmitter = require('events').EventEmitter

module.exports = RemoteEventEmitter

function RemoteEventEmitter (other) {
  if(other) {
    this.other = other
    other.other = this
  }
  EventEmitter.call(this)
  this.buffer = []
  //XXX RemoteEventEmitters start off disconnected!
  //THIS IS MORE REALISTIC
  //REMEMBER to call connect() !
  this.connected = false
}
var ree = RemoteEventEmitter.prototype = new EventEmitter ()
ree.connect = function () {
  if(this.connected) return
  this.connected = true
  this.localEmit('connect')
  this.other.connect()
  while(this.buffer.length)
    this.emit.apply(this, this.buffer.shift())
}
ree.disconnect = function () {
  if(!this.connected) return
  this.connected = false
  this.other.disconnect()
  this.localEmit('disconnect')
}

ree.emit = function () {
  var args = [].slice.call(arguments)
  if(this.connected)
    return this.other.localEmit.apply(this.other, arguments)
  else
    this.buffer.push(args)
}

/*
  sometimes you need to access this, so I'm not using
  _emit ... that means this is a part of the API.
  
*/
ree.localEmit = function () {
  var args = [].slice.call(arguments)
  return EventEmitter.prototype.emit.apply(this, args)
}
