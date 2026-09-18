(function () {
  var ATTR = "bis_skin_checked";
  function strip(node) {
    if (!node) return;
    if (node.nodeType === 1 && node.hasAttribute && node.hasAttribute(ATTR)) {
      node.removeAttribute(ATTR);
    }
    if (!node.querySelectorAll) return;
    var list = node.querySelectorAll("[" + ATTR + "]");
    for (var i = 0; i < list.length; i++) list[i].removeAttribute(ATTR);
  }
  strip(document.documentElement);
  try {
    new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (
          m.type === "attributes" &&
          m.attributeName === ATTR &&
          m.target.removeAttribute
        ) {
          m.target.removeAttribute(ATTR);
        }
        var nodes = m.addedNodes;
        if (!nodes) continue;
        for (var j = 0; j < nodes.length; j++) strip(nodes[j]);
      }
    }).observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [ATTR],
    });
  } catch (e) {}
})();
