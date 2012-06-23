//var io = require('socket.io')
skates = require('skates')()
var bs = require('browser-stream')(skates)

ping = function () {
  skates.emit('ping')  
}

skates.on('pong', function () {
  console.log('pong')
})

skates.on('flow', function (s, r) {
  if(s || r)
    console.log('flow', s, r)
})
console.log('MODULE')
require('domready')(function () {
  console.log('DOMREADY')
  function sync () {
    console.log('SYNC!')
    //remember, you have to recreate your streams after they have closed
    var domnode = require('domnode')('#body', '<span>{{item}}</span> ')
    rs = bs.createReadStream('whatever', 
      {options: true, random: Math.random()})

    rs.pipe(domnode)
    rs.on('end', function () {
      rs.removeAllListeners()
      sync()
    })
  }
  sync()

})
