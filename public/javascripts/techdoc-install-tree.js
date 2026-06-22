// Arbre de décision interactif pour choisir une variante d'installation.
// Rendu dans #install-decision-tree (Pixi v8). Fallback : si Pixi est absent
// ou que prefers-reduced-motion est actif, on n'initialise rien et le tableau
// comparatif HTML reste seul visible.
(function () {
  if (typeof PIXI === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var container = document.getElementById('install-decision-tree');
  if (!container) return;

  if (!container.style.minHeight) container.style.minHeight = '420px';

  var COLORS = {
    bg: 0xf7f9fb,
    node: 0xffffff,
    nodeBorder: 0x2c5d8f,
    nodeText: 0x1a2a3a,
    leaf: 0x2c5d8f,
    leafText: 0xffffff,
    edge: 0x9bb6cf
  };

  var TREE = {
    label: 'Voulez-vous utiliser Docker ?',
    children: [
      { edge: 'Oui', node: {
        label: 'Pour la production ?',
        children: [
          { edge: 'Oui', node: {
            label: 'Plusieurs apps sur ce serveur ?',
            children: [
              { edge: 'Oui', node: { variant: 'Docker prod Dokploy', href: '/techdoc/install/docker-prod-dokploy/' } },
              { edge: 'Non', node: { variant: 'Docker prod standalone', href: '/techdoc/install/docker-prod-standalone/' } }
            ]
          }},
          { edge: 'Non', node: { variant: 'Docker dev', href: '/techdoc/install/docker-dev/' } }
        ]
      }},
      { edge: 'Non', node: {
        label: 'Installation système assumée ?',
        children: [
          { edge: 'Oui', node: { variant: 'Native Ubuntu', href: '/techdoc/install/native-ubuntu/' } },
          { edge: 'Non', node: { variant: 'Docker dev', href: '/techdoc/install/docker-dev/' } }
        ]
      }}
    ]
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

    var layoutLayer = new PIXI.Container();
    app.stage.addChild(layoutLayer);

    function layoutTree() {
      var W = container.offsetWidth || 800;
      var H = container.offsetHeight || 420;
      var levels = [[], [], [], []];
      function walk(node, depth) {
        levels[depth].push(node);
        if (node.children) node.children.forEach(function (c) { walk(c.node, depth + 1); });
      }
      walk(TREE, 0);
      levels.forEach(function (lvl, depth) {
        var yRatio = 0.15 + depth * 0.25;
        lvl.forEach(function (n, i) {
          var xRatio = (i + 1) / (lvl.length + 1);
          n._x = xRatio * W;
          n._y = yRatio * H;
        });
      });
    }

    function clear(c) { while (c.children.length) c.removeChildAt(0); }

    function makeText(str, x, y, opts) {
      opts = opts || {};
      var t = new PIXI.Text({
        text: str,
        style: {
          fontFamily: 'Open Sans, Lato, Arial, sans-serif',
          fontSize: opts.size || 13,
          fill: opts.color || COLORS.nodeText,
          fontWeight: opts.weight || 'normal',
          align: 'center',
          wordWrap: true,
          wordWrapWidth: opts.maxWidth || 160
        }
      });
      t.anchor.set(0.5, 0.5);
      t.x = x; t.y = y;
      return t;
    }

    function makeNode(node, isLeaf) {
      var w = isLeaf ? 180 : 200;
      var h = 56;
      var g = new PIXI.Graphics();
      var fill = isLeaf ? COLORS.leaf : COLORS.node;
      var stroke = isLeaf ? COLORS.leaf : COLORS.nodeBorder;
      g.roundRect(node._x - w / 2, node._y - h / 2, w, h, 10);
      g.fill({ color: fill });
      g.stroke({ color: stroke, width: 2 });
      if (isLeaf) {
        g.eventMode = 'static';
        g.cursor = 'pointer';
        g.on('pointerover', function () { g.alpha = 0.85; });
        g.on('pointerout', function () { g.alpha = 1; });
        g.on('pointertap', function () { window.location.href = node.href; });
      }
      return { g: g, w: w };
    }

    function makeEdge(parent, child, label) {
      var g = new PIXI.Graphics();
      g.moveTo(parent._x, parent._y + 28);
      g.lineTo(child._x, child._y - 28);
      g.stroke({ color: COLORS.edge, width: 2 });
      var mx = (parent._x + child._x) / 2;
      var my = (parent._y + child._y) / 2;
      var lbl = makeText(label, mx, my, { size: 11, weight: 'bold', color: 0x556677, maxWidth: 60 });
      var bg = new PIXI.Graphics();
      var pad = 4;
      bg.roundRect(mx - lbl.width / 2 - pad, my - lbl.height / 2 - pad / 2, lbl.width + pad * 2, lbl.height + pad, 4);
      bg.fill({ color: COLORS.bg });
      return [g, bg, lbl];
    }

    function render() {
      clear(layoutLayer);
      layoutTree();

      function drawEdges(node) {
        if (!node.children) return;
        node.children.forEach(function (c) {
          makeEdge(node, c.node, c.edge).forEach(function (el) { layoutLayer.addChild(el); });
          drawEdges(c.node);
        });
      }
      drawEdges(TREE);

      function drawAll(node) {
        var isLeaf = !!node.variant;
        var ref = makeNode(node, isLeaf);
        layoutLayer.addChild(ref.g);
        var txt = makeText(
          isLeaf ? node.variant : node.label,
          node._x, node._y,
          { color: isLeaf ? COLORS.leafText : COLORS.nodeText, weight: isLeaf ? 'bold' : 'normal', maxWidth: ref.w - 20 }
        );
        layoutLayer.addChild(txt);
        if (node.children) node.children.forEach(function (c) { drawAll(c.node); });
      }
      drawAll(TREE);

      var all = layoutLayer.children.slice();
      all.forEach(function (d, i) {
        d.alpha = 0;
        setTimeout(function () {
          var start = performance.now();
          (function step() {
            var t = Math.min(1, (performance.now() - start) / 280);
            d.alpha = t;
            if (t < 1) requestAnimationFrame(step);
          })();
        }, i * 40);
      });
    }

    render();

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(render, 150);
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) app.ticker.stop();
      else app.ticker.start();
    });
  }).catch(function () {});
})();
