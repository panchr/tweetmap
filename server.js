//Setup web server and socket
var twitter = require('twitter'),
	express = require('express'),
	app = express(),
	http = require('http'),
	server = http.createServer(app),
	io = require('socket.io').listen(server);

//Setup twitter stream api
var twit = new twitter({
  consumer_key:'ZGZKuKWNPNeZQidrMcE8XtxPZ',
  consumer_secret:"ZyMKVCABTsxHJ9Nsc4ZAS2QhucAVsS977Ra5C7UGlAbOeviKVZ",
  access_token_key:"316001815-XrSog9nVPsEQSqTfiavpPaJneNcZL4FqdlMesntt",
  access_token_secret:"GPCRnwktNk1t05po8JQhyjYL8eb8zZpyCpkErVPeBLNoi"
}),
stream = null;

//Use the default port (for beanstalk) or default to 8081 locally
server.listen(process.env.PORT || 8081);

console.log("here");
console.log(process.env.PORT + "here is the port");

//Setup rotuing for app
app.use(express.static(__dirname + '/public'));
app.get("/click_location", function (req, res) {
	http.get("http://dev.virtualearth.net/REST/v1/Locations/" + req.query.lat +"," + req.query.lng + "?o=json&key=AlSMj9XqxPE-RE093Giz35PK-ryTSeZ8xDcqcdS2DeDYvE215ibf-u5VqKq7e_Xn", function (response) {
			var body = '';
			response.on('data', function(d) {
			  body += d;
			});
			response.on('end', function() {
			  var parsed = JSON.parse(body);
			  location = parsed.resourceSets[0];
			  if (location.estimatedTotal > 0) {
				var locationName = location.resources[0].name;
				 locationURL = "https://www.bing.com/search?q=" + encodeURIComponent(locationName);
				 http.get(locationURL, function (response2) {
				  var body2 = '';
					response2.on('data', function(d) {
					  body2 += d;
					});
					response2.on('end', function() {
					  res.send(body2);
					});
				  });
			  }
			  else {
				return res.send("Location not found.");
			  }
			});
	});
  });
app.get("/location_data", function (req, res) {

});

//Create web sockets connection.
io.sockets.on('connection', function (socket) {

  socket.on("start tweets", function() {

	if(stream === null) {
	  //Connect to twitter stream passing in filter for entire world.
	  twit.stream('statuses/filter', {'locations':'-180,-90,180,90'}, function(stream) {
		  stream.on('data', function(data) {
			  // Does the JSON result have coordinates
			  if (data.coordinates){
				if (data.coordinates !== null){
				  //If so then build up some nice json and send out to web sockets
				  var outputPoint = {"lat": data.coordinates.coordinates[0],"lng": data.coordinates.coordinates[1]};

				  socket.broadcast.emit("twitter-stream", outputPoint);

				  //Send out to web sockets channel.
				  socket.emit('twitter-stream', outputPoint);
				}
				else if(data.place){
				  if(data.place.bounding_box === 'Polygon'){
					// Calculate the center of the bounding box for the tweet
					var coord, _i, _len;
					var centerLat = 0;
					var centerLng = 0;

					for (_i = 0, _len = coords.length; _i < _len; _i++) {
					  coord = coords[_i];
					  centerLat += coord[0];
					  centerLng += coord[1];
					}
					centerLat = centerLat / coords.length;
					centerLng = centerLng / coords.length;

					// Build json object and broadcast it
					var outputPoint = {"lat": centerLat,"lng": centerLng};
					socket.broadcast.emit("twitter-stream", outputPoint);

				  }
				}
			  }
			  stream.on('limit', function(limitMessage) {
				return console.log(limitMessage + "limit");
			  });

			  stream.on('warning', function(warning) {
				return console.log(warning + "warning");
			  });

			  stream.on('disconnect', function(disconnectMessage) {
				return console.log(disconnectMessage + "disconnect");
			  });
		  });
	  });
	}
  });

	// Emits signal to the client telling them that the
	// they are connected and can start receiving Tweets
	socket.emit("connected");
});

