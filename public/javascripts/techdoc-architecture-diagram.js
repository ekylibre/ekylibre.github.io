// Schéma d'architecture animé : services Ekylibre + flux animés entre eux.
// Rendu dans #architecture-diagram. Survol d'un service = highlight + tooltip.
(function () {
  if (typeof PIXI === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var container = document.getElementById('architecture-diagram');
  if (!container) return;
  if (!container.style.minHeight) container.style.minHeight = '460px';

  var COLORS = {
    bg: 0xfafbfc,
    browser: 0x6c757d,
    caddy: 0x3b82f6,
    rails: 0xdc2626,
    sidekiq: 0xef4444,
    db: 0x336791,
    redis: 0xdc382d,
    duke: 0x8b5cf6,
    text: 0xffffff,
    edge: 0xc0c8d0,
    edgeActive: 0x2c5d8f,
    tooltipBg: 0x1a2a3a,
    tooltipText: 0xffffff
  };

  var SERVICES = [
    { id: 'browser', label: 'Navigateur', color: COLORS.browser, role: 'Client utilisateur — appels HTTPS' },
    { id: 'caddy',   label: 'Caddy',      color: COLORS.caddy,   role: 'Reverse-proxy HTTPS, certificats Let\'s Encrypt auto' },
    { id: 'rails',   label: 'Rails (Puma)', color: COLORS.rails, role: 'Serveur applicatif Ruby — coeur metier, port 3000' },
    { id: 'sidekiq', label: 'Sidekiq',    color: COLORS.sidekiq, role: 'Worker de jobs asynchrones (imports, exports, integrations)' },
    { id: 'db',      label: 'PostgreSQL + PostGIS', color: COLORS.db, role: 'Stockage relationnel & geospatial — multi-tenant par schemas' },
    { id: 'redis',   label: 'Redis',      color: COLORS.redis,   role: 'Cache + file de jobs Sidekiq' },
    { id: 'duke',    label: 'Duke',       color: COLORS.duke,    role: 'Assistant chatbot agricole (optionnel)' }
  ];

  var LAYOUT = {
    browser: { x: 0.50, y: 0.08 },
    caddy:   { x: 0.50, y: 0.28 },
    rails:   { x: 0.30, y: 0.55 },
    duke:    { x: 0.78, y: 0.45 },
    db:      { x: 0.18, y: 0.85 },
    redis:   { x: 0.45, y: 0.85 },
    sidekiq: { x: 0.65, y: 0.85 }
  };

  var EDGES = [
    { from: 'browser', to: 'caddy',   flow: true,  color: COLORS.edgeActive },
    { from: 'caddy',   to: 'rails',   flow: true,  color: COLORS.edgeActive },
    { from: 'caddy',   to: 'duke',    flow: true,  color: COLORS.edge },
    { from: 'rails',   to: 'db',      flow: true,  color: COLORS.edgeActive },
    { from: 'rails',   to: 'redis',   flow: true,  color: COLORS.edgeActive },
    { from: 'redis',   to: 'sidekiq', flow: true,  color: COLORS.edgeActive },
    { from: 'sidekiq', to: 'db',      flow: true,  color: COLORS.edgeActive },
    { from: 'duke',    to: 'db',      flow: false, color: COLORS.edge }
  ];

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

    var edgesLayer = new PIXI.Container();
    var flowLayer = new PIXI.Container();
    var nodesLayer = new PIXI.Container();
    var tooltipLayer = new PIXI.Container();
    app.stage.addChild(edgesLayer);
    app.stage.addChild(flowLayer);
    app.stage.addChild(nodesLayer);
    app.stage.addChild(tooltipLayer);

    var flowParticles = [];

    function W() { return container.offsetWidth || 800; }
    function H() { return container.offsetHeight || 460; }

    function getPos(id) {
      var p = LAYOUT[id];
      return { x: p.x * W(), y: p.y * H() };
    }

    function drawAll() {
      edgesLayer.removeChildren();
      flowLayer.removeChildren();
      nodesLayer.removeChildren();
      tooltipLayer.removeChildren();
      flowParticles.length = 0;

      EDGES.forEach(function (e) {
        var from = getPos(e.from);
        var to = getPos(e.to);
        var g = new PIXI.Graphics();
        g.moveTo(from.x, from.y);
        g.lineTo(to.x, to.y);
        g.stroke({ color: e.color, width: 2, alpha: 0.7 });
        edgesLayer.addChild(g);

        if (e.flow) {
          for (var k = 0; k < 3; k++) {
            var dot = new PIXI.Graphics();
            dot.circle(0, 0, 3.5);
            dot.fill({ color: e.color });
            dot._edge = e;
            dot._offset = k / 3;
            flowLayer.addChild(dot);
            flowParticles.push(dot);
          }
        }
      });

      SERVICES.forEach(function (svc) {
        var pos = getPos(svc.id);
        var radius = 38;

        var g = new PIXI.Graphics();
        g.circle(pos.x, pos.y, radius);
        g.fill({ color: svc.color });
        g.stroke({ color: 0xffffff, width: 3 });
        g.eventMode = 'static';
        g.cursor = 'pointer';

        var label = new PIXI.Text({
          text: svc.label,
          style: {
            fontFamily: 'Open Sans, Lato, Arial, sans-serif',
            fontSize: 11,
            fill: COLORS.text,
            fontWeight: 'bold',
            align: 'center',
            wordWrap: true,
            wordWrapWidth: radius * 1.8
          }
        });
        label.anchor.set(0.5, 0.5);
        label.x = pos.x;
        label.y = pos.y;

        g.on('pointerover', function () {
          showTooltip(svc, pos);
          g.alpha = 0.85;
        });
        g.on('pointerout', function () {
          hideTooltip();
          g.alpha = 1;
        });

        nodesLayer.addChild(g);
        nodesLayer.addChild(label);
      });
    }

    function showTooltip(svc, pos) {
      hideTooltip();
      var tooltipText = new PIXI.Text({
        text: svc.role,
        style: {
          fontFamily: 'Open Sans, Lato, Arial, sans-serif',
          fontSize: 12,
          fill: COLORS.tooltipText,
          wordWrap: true,
          wordWrapWidth: 240
        }
      });
      tooltipText.anchor.set(0.5, 0);
      var tx = Math.max(140, Math.min(W() - 140, pos.x));
      var ty = pos.y + 50;
      if (ty + tooltipText.height + 16 > H()) ty = pos.y - 50 - tooltipText.height;
      tooltipText.x = tx;
      tooltipText.y = ty + 8;

      var bg = new PIXI.Graphics();
      var pad = 10;
      bg.roundRect(tx - tooltipText.width / 2 - pad, ty, tooltipText.width + pad * 2, tooltipText.height + pad * 2, 6);
      bg.fill({ color: COLORS.tooltipBg, alpha: 0.95 });

      tooltipLayer.addChild(bg);
      tooltipLayer.addChild(tooltipText);
    }
    function hideTooltip() { tooltipLayer.removeChildren(); }

    drawAll();

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(drawAll, 150);
    });

    var elapsed = 0;
    app.ticker.add(function (ticker) {
      elapsed += ticker.deltaMS / 1000;
      var period = 1.6;
      var t = (elapsed % period) / period;
      flowParticles.forEach(function (dot) {
        var e = dot._edge;
        var from = getPos(e.from);
        var to = getPos(e.to);
        var u = (t + dot._offset) % 1;
        dot.x = from.x + (to.x - from.x) * u;
        dot.y = from.y + (to.y - from.y) * u;
        dot.alpha = 0.4 + 0.5 * Math.sin(u * Math.PI);
      });
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) app.ticker.stop();
      else app.ticker.start();
    });
  }).catch(function () {});
})();
