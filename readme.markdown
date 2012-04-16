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

  //pipe the 'whatever' stream to the dom with dominode.
  bs.createReadStream('whatever').pipe(dominode('#list', '<li id="item"></li>'))

```

### server

``` js

io = io.listen(app) //see https://github.com/LearnBoost/socket.io
var _bs = require('browser-stream')

io.sockets.on('connection', function (sock) {

  var bs = _bs(sock) 

  var whatever = new Stream() // SOME KIND OF STREAM
  bs.on('open', function (stream, opts) {
    if(stream.name == 'whatever') 
      whatever.pipe(stream)
  })

}

```

this will connect `whatever` to the `Dominode` stream, rendering it, in the browser!

## API

### createReadStream (connection, name)

open a `ReadableStream` from the other side.
returns a `ReadableStream`.
the other side of connection will emit a writable stream that is connected to this stream.

### createWriteStream (connection, name)

open a `WritableStream` to the other side.
returns a `WritableStream`, the other side will emit a `ReadableStream` connected to this stream.

### createStream

open a `Stream` to the other side which is both readable and writable.
returns a `Stream`, the other side will emit a `Stream` connected to this stream.

> note to self, references to a class (`Stream`) should be capitalized, and in backticks.
> references to an instance should be lowercase, and not in backticks unless refuring to
> a specific variable in a code example.
