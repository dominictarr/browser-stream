# BrowserStream

## install

```
npm install browser-stream

```

## example

### client 

``` js
  var bs = require('browser-stream')(io.connect('http://localhost:3000'))
  var dominode = require('dominode') //see https://github.com/maxogden/dominode
  var opts = {options: 'pass an optional object with the createReadStream message. maybe useful!'})
  //pipe the 'whatever' stream to the dom with dominode.
  bs.createReadStream('whatever', options)
    .on('error', function (err) {
      //unexpected disconnect
      console.error(err)
    })
    .pipe(dominode('#list', '<li id="item"></li>'))

```

### server

``` js

io = io.listen(app) //see https://github.com/LearnBoost/socket.io
var _bs = require('browser-stream')

io.sockets.on('connection', function (sock) {

  var bs = _bs(sock) 

  var whatever = new Stream() // SOME KIND OF STREAM
  bs.on('connection', function (stream, opts) {
    if(stream.name == 'whatever') 
      whatever.pipe(stream)
    //stream.options -- will be the same as `opts` from the client side!
    stream.on('error', function (err) {
      //the client has unexpectedly disconnected. tidy up!
      console.error(err)
    })
  })

}

```

this will connect `whatever` to the `Dominode` stream, rendering it, in the browser!

## API

``` js

var _bs = require('browser-stream')

io.sockets.on('connection', function (sock) {
  var bs = _bs(sock)
  bs.on('connection', function (stream) {
    //stream is a pipable node.js `Stream` instance
  })
})

```

### createReadStream (name, options)



open a `ReadableStream` from the other side.
returns a `ReadableStream`.
the other side of connection will emit a writable stream that is connected to this stream.

### createWriteStream (name, options)

open a `WritableStream` to the other side.
returns a `WritableStream`, the other side will emit a `ReadableStream` connected to this stream.

### createStream (name, options)

open a `Stream` to the other side which is both readable and writable.
returns a `Stream`, the other side will emit a `Stream` connected to this stream.

> note to self, references to a class (`Stream`) should be capitalized, and in backticks.
> references to an instance should be lowercase, and not in backticks unless refuring to
> a specific variable in a code example.
