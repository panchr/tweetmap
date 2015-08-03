// Rushy Panchal
// tweetmap/server.js

// Install all dependencies
var TwitterAPI = require('twitter'),
	express = require('express'),
	http = require('http'),
	socketIO = require('socket.io');

function main() {
	// Application factory
	var app = express(),
		server = http.createServer(app),
		io = socketIO.listen(server);

	var twitter = new TwitterAPI({ // credentials loaded from environment variables
		consumer_key: process.env.TWITTER_CONSUMER_KEY,
		consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
		access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
		access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
		});

	server.listen(process.env.PORT || 8000);

	// Routing
	app.use(express.static(__dirname + "/public"));
	app.get("/click_location", function (req, res) {
		http.get("http://dev.virtualearth.net/REST/v1/Locations/" + req.query.lat +"," + req.query.lng + "?o=json&key=AlSMj9XqxPE-RE093Giz35PK-ryTSeZ8xDcqcdS2DeDYvE215ibf-u5VqKq7e_Xn", function (bing_response) {
				var location_data = "";
				bing_response.on("data", function (location_datum) {
					location_data += location_datum;
					});
			response.on("end", function() {
				var parsed = JSON.parse(body),
					location = parsed.resourceSets[0];
				if (location.estimatedTotal > 0) {
					var locationName = location.resources[0].name,
						locationURL = "https://www.bing.com/search?q=" + encodeURIComponent(locationName);
					http.get(locationURL, function (bing_query) {
						var bing_query_data = "";
						bing_query.on("data", function (query_data) {
							bing_query_data += query_data;
							});
						bing_query.on("end", function() {
							res.send(bing_query_data);
							});
						});
					}
				else {
					return res.send("Location not found.");
					}
				});
			});
		});

	// SocketIO connection
	io.sockets.on("connection", function (socket) {
		socket.on("start tweets", function () {
			// Connect to twitter stream passing in filter for entire world
			twitter.stream('statuses/filter', {'locations':'-180,-90,180,90'}, function(stream) {
					stream.on('data', function(data) {
						// If the JSON data has coordinates
						if (data.coordinates && data.coordinates !== null) {
							var outputPoint = {"lat": data.coordinates.coordinates[0],"lng": data.coordinates.coordinates[1]};

							socket.broadcast.emit("twitter-stream", outputPoint);
							}
						else if (data.place && data.place.bounding_box == "Polygon") {
							// Calculate the center of the bounding box for the tweet
							var coord, _i, _len,
								centerLat = 0,
								centerLng = 0;

							for (_i = 0, _len = coords.length; _i < _len; _i++) {
								coord = coords[_i];
								centerLat += coord[0];
								centerLng += coord[1];
								}

							centerLat = centerLat / coords.length;
							centerLng = centerLng / coords.length;

							// Build JSON object and broadcast it
							var outputPoint = {"lat": centerLat,"lng": centerLng};
							socket.broadcast.emit("twitter-stream", outputPoint);
							}
						});
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
		socket.emit("connected");
		});

	return app;
	}

module.exports = main;
