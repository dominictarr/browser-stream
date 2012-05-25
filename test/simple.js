
var a = require('assertions')
var EventEmitter = require('events').EventEmitter
var es = require('event-stream')
var _bs = require('..')
/*
  socket.io behaves like two linked EventEmitters.
  calling emit on one, triggers listeners on the other.

test that two streams match.
i.e.

*/
/*
  create a master stream and slave streams,
  assert that every chunk written to the master
  is eventually written to the slave.
*/

function consistent(test) {
  test = test || a.deepEqual
  var stream = es.through()
  var chunks = 0
  stream.on('data', function () {
    chunks ++
  })
  stream.createSlave = function () {
    var expected = [], count = 0, ended = false
    stream.on('data', function (data) {
      expected.push(data)
    })
    var slave = es.through()
    slave.on('data', function (data) {
      a.greaterThan(expected.length, 0, 'slave stream did not expect write')
      a.equal(ended, false, 'slave expected stream not to have ended') 
      var next = expected.shift()
      count ++
      test(next, data)
    })
    //it's okay to pass data to end(data)
    //but never emit('end', data)
    slave.on('end', function () {
      ended = true
      a.equal(expected.length, 0, 'slave stream expected 0 more writes')
    })
    slave.validate = function (message) {
      a.equal(count, chunks, 'slave must recieve same number of chunks as master')
    }
    return slave
  }
  return stream
}

function pair(f) {
  var a = new EventEmitter()
  var b = new EventEmitter()
  a.emit = function () {
//    console.log.apply(null, ['emit:a'].concat([].slice.call(arguments)))
    EventEmitter.prototype.emit.apply(b, arguments); return a
  }
  b.emit = function () {
  //  console.log.apply(null, ['emit:b'].concat([].slice.call(arguments)))
    EventEmitter.prototype.emit.apply(a, arguments); return b
  }
  return [a, b]
}

function randomNumberStream (max, count) {
  count = count || 20
  max   = max   || 10
  return es.readable(function (i, cb) {
    this.emit('data', Math.random() * max)
    if(i > count)
    this.emit('end')
    cb()
  })
}


;(function simple () {

  var p = pair()
  var server = _bs(p.pop())
  var client = _bs(p.pop())

  var master = consistent()
  var slave  = master.createSlave()

  server.on('connection', function (stream) {
    a.equal(stream.name, 'simple')
    stream
      .pipe(slave)
  })

  randomNumberStream()
    .pipe(master)
    .pipe(client.createWriteStream('simple'))

  process.on('exit', slave.validate)

})();

//return
;(function through () {

  var p = pair()
  var server = _bs(p.shift())
  var client = _bs(p.shift())

  var master = consistent()
  var slave1  = master.createSlave()
  var slave2  = master.createSlave()

  server.on('connection', function (stream) {
    a.equal(stream.name, 'through')
    stream.pipe(slave1).pipe(stream) //ECHO
  })

  randomNumberStream()
    .pipe(master)
    .pipe(client.createStream('through'))
    .pipe(slave2)
    .on('end', function () {
      slave1.validate()
      slave2.validate()
      console.log('slave 1,2 valid')
    })

})();


//  names do not have to be unique.
//  should create two seperate streams.


;(function double () {
  var p = pair()
  var server = _bs(p.shift())
  var client = _bs(p.shift())

  var master1 = consistent()
  var slave1  = master1.createSlave()
  var master2 = consistent()
  var slave2  = master2.createSlave()

  server.on('connection', function (stream) {
    a.equal(stream.name, 'through')
    stream.pipe(stream) //ECHO
  })

  randomNumberStream()
    .pipe(master1)
    .pipe(client.createStream('through'))
    .pipe(slave1)
    .on('end', function () {
      slave1.validate()
      console.log('slave1 valid')
    })

  //okay! this is breaking
  randomNumberStream()
    .pipe(master2)
    .pipe(client.createStream('through'))
    .pipe(slave2)
    .on('end', function () {
      slave2.validate()
      console.log('slave2 valid')
    })
})();

/*
  since I'm here, I may as well implement pausing
  etc.

  pass through pause, so that it can be used
  to control stuff like scrolling.
*/

/*
if a function respects pause, that means that on pause(),
the next write should return false.

then, on resume() the next write should return true

actually, this is weird enough that itr doesn't make sense
in general, just for cases like this...
*/

;(function passesPauseThrough(stream) {
  var p = pair()
  var server = _bs(p.pop())
  var client = _bs(p.pop())

  server.on('connection', function (stream) {
    a.equal(stream.name, 'paused')
    stream
    var i = 0
    stream.on('data', function () {
      if(i++ % 2)
        stream.pause()
      else //if (stream.paused)
        stream.resume()
    })
  })

  master = (client.createWriteStream('paused'))


  a.equal(master.write('hello'), true, 'should be free')
  a.equal(master.write('paused now'), false, 'should be paused')
  a.equal(master.write('hello'), true, 'should be free2')
  a.equal(master.write('paused now'), false, 'should be paused')

  master.end() 
  console.log('pause is correct')
})();
/*
  assert that after returning false
  a stream will eventually emit drain

  I think this may be too tight.
  I think the contract is just that
  
*/

/*function eventuallyEmitsDrain (stream) {
  var _write = stream.write
    , paused = false
    , expectPause = false

  stream.write = function () {
    var args = [].slice.call(arguments)
    var returned = _write.apply(stream, args)
    if(returned === false) {
      if(!paused) {
        stream.once('drain', function () {
          paused = false
        })
        paused = true
      }
    }
    if(expectPause)
      a.equal(returned, false, 'expected write to return false') 
  }
  var _pause = stream.pause
  stream.pause = function () {
    expectPause = true
  }
}*/
