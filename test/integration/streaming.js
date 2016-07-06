describe('Steraming tests', function() {
  var janusConnection;
  var janusSession;
  var streamingPlugin;

  var mountpointOptions = {
    type: 'live',
    description: 'test create stream',
    file: '/usr/share/janus/streams/radio.alaw',
    audio: true,
    video: false
  };

  function randomMountpointId() {
    return Math.floor(Math.random() * 1000 + 1);
  }

  before(function(done) {
    $('#mocha').append('<video id="video" autoplay></video>');

    jQuery.getJSON('./config.json')
      .then(function(config) {
        var janus = new Janus.Client(config.url, config);
        return janus.createConnection('client');
      })
      .then(function(connection) {
        janusConnection = connection;
        return connection.createSession();
      })
      .then(function(session) {
        janusSession = session;
        done();
      });
  });

  after(function(done) {
    janusSession.destroy()
      .then(function() {
        return janusConnection.close();
      })
      .then(done);
  });

  beforeEach(function(done) {
    janusSession.attachPlugin(Janus.StreamingPlugin.NAME)
      .then(function(plugin) {
        streamingPlugin = plugin;
        done();
      });
  });

  afterEach(function(done) {
    streamingPlugin.detach().then(done);
  });

  it('creates, lists and destroys', function(done) {
    var mountpointId = randomMountpointId();
    streamingPlugin.create(mountpointId, mountpointOptions)
      .then(function(response) {
        assert.equal(response.getData()['stream']['id'], mountpointId);
        return streamingPlugin.list();
      })
      .then(function(response) {
        var list = response.getData()['list'];
        var createdMountpoint = jQuery.grep(list, function(mountpoint) {
          return mountpoint.id == mountpointId;
        });
        assert.equal(createdMountpoint.length, 1);
        return streamingPlugin.destroy(mountpointId);
      })
      .then(function(response) {
        assert.equal(response.getData()['destroyed'], mountpointId);
        done();
      });
  });

  it('streams video', function(done) {
    this.timeout(20000);
    var video = document.getElementById('video');
    video.addEventListener('playing', function() {
      done();
    });
    streamingPlugin.on('pc:addstream', function(event) {
      assert(event.stream);
      Janus.webrtc.browserShim.attachMediaStream(video, event.stream);
    });

    var mountpointId = randomMountpointId();
    streamingPlugin.create(mountpointId, mountpointOptions)
      .then(function() {
        return streamingPlugin.connect(mountpointId);
      })
      .then(function() {
        return streamingPlugin.start();
      });
  });

  it('pauses, starts, stops and destroys', function(done) {
    this.timeout(5000);
    var mountpointId = randomMountpointId();
    streamingPlugin.create(mountpointId, mountpointOptions)
      .then(function() {
        return streamingPlugin.connect(mountpointId);
      })
      .delay(300)
      .then(function() {
        return streamingPlugin.pause();
      })
      .delay(300)
      .then(function() {
        return streamingPlugin.start();
      })
      .delay(300)
      .then(function() {
        return streamingPlugin.stop();
      })
      .then(function() {
        done();
      });
  });

});
