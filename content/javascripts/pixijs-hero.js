(function () {
  if (typeof PIXI === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var container = document.getElementById('hero-canvas');
  if (!container) return;

  var ICON_URLS = [
    '/images/hero/tractor.png',
    '/images/hero/tractor-alt.png',
    '/images/hero/wheat.png',
    '/images/hero/leaf.png',
    '/images/hero/seedling.png',
    '/images/hero/seed.png',
    '/images/hero/grape.png',
    '/images/hero/sunflower.png',
    '/images/hero/tree.png',
    '/images/hero/cow.png',
    '/images/hero/fruits.png',
    '/images/hero/hay-rake.png'
  ];
  var DUKE_URL = '/images/hero/duke.png';

  var app = new PIXI.Application();

  app.init({
    resizeTo: container,
    backgroundAlpha: 0,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2)
  }).then(function () {
    container.appendChild(app.canvas);

    var loads = ICON_URLS.map(function (u) {
      return PIXI.Assets.load(u).then(function (t) { return t; }, function () { return null; });
    });
    loads.push(PIXI.Assets.load(DUKE_URL).then(function (t) { return t; }, function () { return null; }));

    return Promise.all(loads).then(function (results) {
      var dukeTex = results.pop();
      var iconTextures = results.filter(Boolean);
      if (!dukeTex || !iconTextures.length) return;

      var width = function () { return container.offsetWidth || 1; };
      var height = function () { return container.offsetHeight || 1; };

      // Duke
      var duke = new PIXI.Sprite(dukeTex);
      duke.anchor.set(0.5, 1);
      duke.width = 72;
      duke.height = 72;
      duke.x = width() / 2;
      duke.y = height() - 6;
      duke.alpha = 0.95;
      app.stage.addChild(duke);

      // Pointer tracking on the whole jumbotron area
      var targetX = duke.x;
      var hasPointer = false;
      window.addEventListener('pointermove', function (e) {
        var r = container.getBoundingClientRect();
        if (e.clientY >= r.top && e.clientY <= r.bottom &&
            e.clientX >= r.left && e.clientX <= r.right) {
          targetX = e.clientX - r.left;
          hasPointer = true;
        } else {
          hasPointer = false;
        }
      }, { passive: true });
      window.addEventListener('blur', function () { hasPointer = false; });

      // Falling icons
      var items = [];
      var SPAWN_EVERY = 0.9; // seconds
      var nextSpawnAt = 0;
      var elapsed = 0;

      function spawn() {
        var tex = iconTextures[Math.floor(Math.random() * iconTextures.length)];
        var s = new PIXI.Sprite(tex);
        s.anchor.set(0.5);
        var size = 28 + Math.random() * 18;
        s.width = size;
        s.height = size;
        s.x = 40 + Math.random() * (width() - 80);
        s.y = -size;
        s.vy = 0.9 + Math.random() * 1.6;
        s.rotation = (Math.random() - 0.5) * 0.6;
        s.vr = (Math.random() - 0.5) * 0.035;
        s.alpha = 0.82;
        app.stage.addChild(s);
        items.push(s);
      }

      function findNearestX() {
        var best = null;
        var bestScore = Infinity;
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          if (it.y >= duke.y - 10) continue;
          var distToGround = duke.y - it.y;
          var score = distToGround + Math.abs(it.x - duke.x) * 0.3;
          if (score < bestScore) { bestScore = score; best = it; }
        }
        return best ? best.x : width() / 2;
      }

      // Catch effects
      var catches = [];
      function startCatch(sprite) {
        catches.push({ sprite: sprite, t: 0, sx: sprite.scale.x });
      }

      app.ticker.add(function (ticker) {
        var dt = ticker.deltaTime;
        var dtMS = ticker.deltaMS;
        var w = width();
        var h = height();
        elapsed += dtMS / 1000;

        // Spawn cadence
        if (elapsed >= nextSpawnAt) {
          spawn();
          nextSpawnAt = elapsed + SPAWN_EVERY * (0.7 + Math.random() * 0.6);
        }

        // Duke target
        var aim = hasPointer ? targetX : findNearestX();
        var dukeMargin = duke.width / 2 + 4;
        aim = Math.max(dukeMargin, Math.min(w - dukeMargin, aim));
        duke.x += (aim - duke.x) * Math.min(1, 0.14 * dt);
        duke.y = h - 6;

        // Catch hitbox = circle near top of Duke's head
        var dukeHeadX = duke.x;
        var dukeHeadY = duke.y - duke.height * 0.72;
        var catchR = duke.width * 0.45;
        var catchR2 = catchR * catchR;

        // Items
        for (var i = items.length - 1; i >= 0; i--) {
          var it = items[i];
          it.y += it.vy * dt;
          it.rotation += it.vr * dt;

          var dx = it.x - dukeHeadX;
          var dy = it.y - dukeHeadY;
          if (dx * dx + dy * dy < catchR2) {
            startCatch(it);
            items.splice(i, 1);
            continue;
          }
          if (it.y > h + 40) {
            app.stage.removeChild(it);
            items.splice(i, 1);
          }
        }

        // Catch animations: shrink + rise + fade
        for (var j = catches.length - 1; j >= 0; j--) {
          var c = catches[j];
          c.t += dtMS;
          var p = Math.min(1, c.t / 360);
          var sc = c.sx * (1 - p) + 0.05;
          c.sprite.scale.set(sc);
          c.sprite.alpha = 0.82 * (1 - p);
          c.sprite.y -= 0.9 * dt;
          if (p >= 1) {
            app.stage.removeChild(c.sprite);
            catches.splice(j, 1);
          }
        }
      });

      document.addEventListener('visibilitychange', function () {
        if (document.hidden) app.ticker.stop();
        else app.ticker.start();
      });
    });
  }).catch(function () {});
})();
