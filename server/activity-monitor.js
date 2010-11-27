var sys = require('sys')
  , http = require("http")
  , ws = require('./node-websocket-server/lib/ws/server.js');

var iostat = require('child_process').spawn("iostat", ["-w 1", "disk0"]);

var httpServer = http.createServer();

var server = ws.createServer({
  debug: true
}, httpServer);

function format(data) {
  var output_data = data.toString();
  sys.log(output_data);
  header = 'disk0       cpu     load average'
  
  if (output_data.match(header)) {
    sys.log("ignore header")
  } else {
    // disk0 cpu load
    // average kbt tps kbs us sy id 1m 5m 15m
    var output_array = output_data.replace(/^\s+|\s+$/g,"").split(/\s+/);
    
    if (output_array) {    
      for (var i=0; i < output_array.length; i++) {
        output_array[i] = parseFloat(output_array[i]);
      };
      
      var array_len = output_array.length;
      
      output_hash = {
        date: new Date(),
        disk0: {
          kbt: output_array[array_len-9],
          tps: output_array[array_len-8],
          mbs: output_array[array_len-7],
        },
        cpu: {
          us: output_array[array_len-6],
          sy: output_array[array_len-5],
          id: output_array[array_len-4],
        },
        load_average: {
          m1: output_array[array_len-3],
          m5: output_array[array_len-2],
          m15: output_array[array_len-1],
        }
      }
      
      return JSON.stringify(output_hash);
    }
  }
}

// Handle WebSocket Requests
server.addListener("connection", function(conn) {
  sys.log("Opened connection: " + conn.id);
  server.send(conn.id, "Connected as: " + conn.id);
  
  if (iostat.pid) {
    sys.log('Process pid: ' + iostat.pid)
  
    iostat.stdout.on('data', function(data) {
      //sys.log('Process stdout: ' + data);
      sys.log('Formatted stdout: ' + format(data));
      server.send(conn.id, format(data));
    });
  } else {
    sys.log("Process failed to spawn")
  }
  
  server.send(conn.id, "Connected as: " + conn.id);
});

server.addListener("close", function(conn) {
  sys.log("Closed connection: " + conn.id);
  conn.broadcast("<" + conn.id + "> disconnected");
});

server.listen(8000);