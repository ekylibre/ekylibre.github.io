// Barre de progression d'installation : en haut des pages longues d'install.
// Detecte la section visible via IntersectionObserver sur les ancres
// correspondant a data-steps="rbenv,ruby,node,...".
(function () {
  if (typeof PIXI === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var container = document.getElementById('install-progress');
  if (!container) return;
  var stepsAttr = container.getAttribute('data-steps');
  if (!stepsAttr) return;

  var steps = stepsAttr.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  if (!steps.length) return;

  if (!container.style.minHeight) container.style.minHeight = '70px';

  var COLORS = {
    bg: 0xf7f9fb,
    track: 0xe1e7ec,
    filled: 0x2c5d8f,
    current: 0x4caf50,
    label: 0x556677,
    labelActive: 0x1a2a3a
  };

  var app = new PIXI.Application();

  app.init({
    resizeTo: container,
    backgroundColor: COLORS.bg,
    backgroundAlpha: 1,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2)
  }).then(function () {
    container.appendChild(app.canvas);
    container.removeAttribute('aria-hidden');

    var trackG = new PIXI.Graphics();
    var fillG = new PIXI.Graphics();
    var dotsLayer = new PIXI.Container();
    var labelsLayer = new PIXI.Container();
    app.stage.addChild(trackG);
    app.stage.addChild(fillG);
    app.stage.addChild(dotsLayer);
    app.stage.addChild(labelsLayer);

    var currentIndex = 0;

    function W() { return container.offsetWidth || 800; }
    function H() { return container.offsetHeight || 70; }
    function trackY() { return H() * 0.4; }
    function dotX(i) {
      var pad = 30;
      if (steps.length === 1) return W() / 2;
      return pad + (i / (steps.length - 1)) * (W() - pad * 2);
    }

    function draw() {
      trackG.clear();
      fillG.clear();
      dotsLayer.removeChildren();
      labelsLayer.removeChildren();

      var pad = 30;
      var y = trackY();
      var Wp = W();

      trackG.moveTo(pad, y);
      trackG.lineTo(Wp - pad, y);
      trackG.stroke({ color: COLORS.track, width: 4 });

      var xFill = dotX(currentIndex);
      fillG.moveTo(pad, y);
      fillG.lineTo(xFill, y);
      fillG.stroke({ color: COLORS.filled, width: 4 });

      steps.forEach(function (step, i) {
        var x = dotX(i);
        var isPast = i < currentIndex;
        var isCurrent = i === currentIndex;
        var radius = isCurrent ? 10 : (isPast ? 7 : 6);
        var color = isCurrent ? COLORS.current : (isPast ? COLORS.filled : COLORS.track);

        var dot = new PIXI.Graphics();
        dot.circle(x, y, radius);
        dot.fill({ color: color });
        dot.stroke({ color: 0xffffff, width: 2 });
        if (isCurrent) dot._pulse = true;
        dotsLayer.addChild(dot);

        var label = new PIXI.Text({
          text: String(i + 1) + '. ' + step,
          style: {
            fontFamily: 'Open Sans, Lato, Arial, sans-serif',
            fontSize: 11,
            fill: isCurrent ? COLORS.labelActive : COLORS.label,
            fontWeight: isCurrent ? 'bold' : 'normal',
            align: 'center'
          }
        });
        label.anchor.set(0.5, 0);
        label.x = x;
        label.y = y + 14;
        labelsLayer.addChild(label);
      });
    }

    function setCurrent(i) {
      if (i < 0) i = 0;
      if (i >= steps.length) i = steps.length - 1;
      if (i === currentIndex) return;
      currentIndex = i;
      draw();
    }

    draw();

    function setupObserver() {
      var observed = [];
      steps.forEach(function (step, i) {
        var el = document.getElementById(step);
        if (el) observed.push({ el: el, i: i });
      });
      if (!observed.length) return;

      var visibility = new Array(observed.length).fill(0);
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var idx = observed.findIndex(function (o) { return o.el === entry.target; });
          if (idx < 0) return;
          visibility[idx] = entry.intersectionRatio;
        });
        var best = 0;
        for (var i = visibility.length - 1; i >= 0; i--) {
          if (visibility[i] > 0.15) { best = i; break; }
        }
        setCurrent(observed[best].i);
      }, { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.15, 0.5] });
      observed.forEach(function (o) { io.observe(o.el); });
    }

    var pulseTime = 0;
    app.ticker.add(function (ticker) {
      pulseTime += ticker.deltaMS / 1000;
      dotsLayer.children.forEach(function (d) {
        if (d._pulse) d.scale.set(1 + 0.10 * Math.sin(pulseTime * 4));
        else d.scale.set(1);
      });
    });

    setTimeout(setupObserver, 80);

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(draw, 150);
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) app.ticker.stop();
      else app.ticker.start();
    });
  }).catch(function () {});
})();
