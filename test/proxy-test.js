var fs = require('fs'),
    vows = require('vows'),
    assert = require('assert'),
    path = require('path'),
    express = require('express'),
    request = require('request'),
    ioClient = require('socket.io-client'),
    createLiveStyleTestServer = require('./createLiveStyleTestServer');

function getRandomColor() {
    return '#' + (0x100000 + Math.floor(0xefffff * Math.random())).toString(16);
}

vows.describe('foo').addBatch({
    'create a livestyle server in pure proxy mode and an upstream server, then request an HTML file': {
        topic: function () {
            var callback = this.callback,
                documentRoot = path.resolve(__dirname, 'proxy'),
                upstreamServer = express.createServer()
                    .use(express['static'](documentRoot));

            upstreamServer.listen(0);

            var upstreamServerUrl = 'http://127.0.0.1:' + upstreamServer.address().port + '/',
                appInfo = createLiveStyleTestServer({
                    proxy: upstreamServerUrl
                });

            // Wait a couple of seconds for the servers to become available
            setTimeout(function () {
                request({method: 'GET', url: 'http://127.0.0.1:' + appInfo.port + '/'}, callback);
            }, 2000);
        },
        'the HTML file should be patched with the bootstrapper right before </head>': function (err, response, body) {
            assert.isNull(err);
            assert.matches(body, /<\/script><\/head>/);
        }
    },
    'create a livestyle server in pure proxy mode and an upstream server, then request an HTML file with no </head>': {
        topic: function () {
            var callback = this.callback,
                documentRoot = path.resolve(__dirname, 'proxy'),
                upstreamServer = express.createServer()
                    .use(express['static'](documentRoot));

            upstreamServer.listen(0);

            var upstreamServerUrl = 'http://127.0.0.1:' + upstreamServer.address().port + '/',
                appInfo = createLiveStyleTestServer({
                    proxy: upstreamServerUrl
                });

            // Wait a couple of seconds for the servers to become available
            setTimeout(function () {
                request({method: 'GET', url: 'http://127.0.0.1:' + appInfo.port + '/nohead.html'}, callback);
            }, 2000);
        },
        'the HTML file should be patched with the bootstrapper right before </html>': function (err, response, body) {
            assert.isNull(err);
            assert.matches(body, /<\/script><\/html>/);
        }
    },
    'create a livestyle server in pure proxy mode and an upstream server, then request an HTML file with no </head> and no </html>': {
        topic: function () {
            var callback = this.callback,
                documentRoot = path.resolve(__dirname, 'proxy'),
                upstreamServer = express.createServer()
                    .use(express['static'](documentRoot));

            upstreamServer.listen(0);

            var upstreamServerUrl = 'http://127.0.0.1:' + upstreamServer.address().port + '/',
                appInfo = createLiveStyleTestServer({
                    proxy: upstreamServerUrl
                });

            // Wait a couple of seconds for the servers to become available
            setTimeout(function () {
                request({method: 'GET', url: 'http://127.0.0.1:' + appInfo.port + '/noheadnoendhtml.html'}, callback);
            }, 2000);
        },
        'the HTML file should be patched with the bootstrapper at the end': function (err, response, body) {
            assert.isNull(err);
            assert.matches(body, /<\/script>$/);
        }
    },
    'create a livestyle server in pure proxy mode and an upstream server that redirects /subdir to /subdir/, then request a directory': {
        topic: function () {
            var callback = this.callback,
                documentRoot = path.resolve(__dirname, 'proxy'),
                upstreamServerUrl,
                upstreamServer = express.createServer()
                    .use(function (req, res, next) {
                        if (req.url === '/subdir') {
                            res.writeHead(301, {
                                location: upstreamServerUrl + 'subdir/'
                            });
                            res.end('The upstream server at ' + upstreamServerUrl + ' says redirect!');
                        } else {
                            res.send(400);
                        }
                    });

            upstreamServer.listen(0);

            upstreamServerUrl = 'http://127.0.0.1:' + upstreamServer.address().port + '/';

            var appInfo = createLiveStyleTestServer({proxy: upstreamServerUrl});

            // Wait a couple of seconds for the servers to become available
            setTimeout(function () {
                request({method: 'GET', followRedirect: false, url: 'http://127.0.0.1:' + appInfo.port + '/subdir'}, function (err, response, body) {
                    callback(err, response, body, appInfo);
                });
            }, 2000);
        },
        'the response should be an 301 pointing at /subdir/ on the LiveStyle server': function (err, response, body, appInfo) {
            assert.isNull(err);
            assert.equal(response.statusCode, 301);
            // Accept both and absolute and a relative Location header:
            assert.matches(response.headers.location, /^(?:http:\/\/127\.0\.0\.1:' + appInfo.port + ')?\/subdir\//);
        }
    },
    'create a livestyle server with a mapping from /foo/ to /bar/ along with an upstream server, then request /foo/hello.txt': {
        topic: function () {
            var callback = this.callback,
                documentRoot = path.resolve(__dirname, 'proxy'),
                upstreamServer = express.createServer()
                    .use(express['static'](documentRoot));

            upstreamServer.listen(0);

            var upstreamServerUrl = 'http://127.0.0.1:' + upstreamServer.address().port + '/',
                appInfo = createLiveStyleTestServer({
                    proxy: upstreamServerUrl,
                    mappings: {
                        '/foo/': '/bar/'
                    }
                });

            // Wait a couple of seconds for the servers to become available
            setTimeout(function () {
                request('http://127.0.0.1:' + appInfo.port + '/foo/hello.txt', callback);
            }, 2000);
        },
        'the contents of /bar/hello.txt should be served': function (err, response, body) {
            assert.isNull(err);
            assert.equal(body, 'The contents of /bar/hello.txt\n');
        }
    }
})['export'](module);
