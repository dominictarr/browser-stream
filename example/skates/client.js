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
require('domready')(function () {

  function sync () {
    console.log('SYNC!!!')
    //remember, you have to recreate your streams after they have closed
    var dominode = require('dominode.js')('#body', '<span id="item"></span> ')
    rs = bs.createReadStream('whatever', 
      {options: true, random: Math.random()})

    rs.pipe(dominode)
    rs.on('data', function(d) {
      console.log('>>>', d, d.item)
    })
    rs.on('end', function () {
      rs.removeAllListeners()
      sync()
    })
  }
  sync()

})
