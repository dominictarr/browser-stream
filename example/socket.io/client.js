//var io = require('socket.io')
var bs = require('browser-stream')(io.connect('http://localhost:3000'))

var domnode = require('domnode')('#body', '<div>{{item}}</div>')

rs = bs.createStream('whatever', 
  {options: true, random: Math.random()})

rs.pipe(domnode)

rs.on('data', function(d) {
  console.log('>>>', d)
})

rs.write('hello')
rs.write('goodbye')
