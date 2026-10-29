/* ============================================================================
   scripts/ui/component-art.js  —  Drawings of the optical components
   ----------------------------------------------------------------------------
   GENERATED FILE. Do not edit by hand: change the SVG files in
   assets/components/ and run   python tools/build_component_art.py

   The drawings come from ComponentLibrary by Alexander Franzen, licensed
   CC BY-NC 3.0 (see assets/components/LICENSE.md). They are placed once in
   the page as <symbol> elements; the table draws them with <use>.
   ============================================================================ */

(() => {
  const ART = {
  "bsp": {
    "viewBox": "0 0 23.427 23.427",
    "body": "<g id=\"bsp_Layer_1\"><g><linearGradient id=\"bsp_XMLID_2_\" gradientUnits=\"userSpaceOnUse\" x1=\"44.0039\" y1=\"105.2021\" x2=\"72.3501\" y2=\"76.856\" gradientTransform=\"matrix(0.8 0 0 0.8 -34.8284 -61.1108)\"><stop offset=\"0\" style=\"stop-color:#FFFFFF\"/><stop offset=\"1\" style=\"stop-color:#89A4B6\"/></linearGradient><rect x=\"0.375\" y=\"0.375\" fill=\"url(#bsp_XMLID_2_)\" stroke=\"#000000\" stroke-width=\"0.75\" width=\"22.677\" height=\"22.677\"/><line fill=\"none\" stroke=\"#000000\" stroke-width=\"0.75\" x1=\"0.375\" y1=\"0.375\" x2=\"23.052\" y2=\"23.052\"/></g></g>",
    "file": "b-bsp.svg"
  },
  "mir": {
    "viewBox": "0 0 10.671 29.096",
    "body": "<g id=\"mir_Layer_1\"><g><linearGradient id=\"mir_XMLID_2_\" gradientUnits=\"userSpaceOnUse\" x1=\"350.0874\" y1=\"43.0298\" x2=\"350.0874\" y2=\"14.6831\" gradientTransform=\"matrix(0.35 0 0 1 -117.1952 -14.3086)\"><stop offset=\"0.0056\" style=\"stop-color:#89A4B6\"/><stop offset=\"0.5\" style=\"stop-color:#FFFFFF\"/><stop offset=\"1\" style=\"stop-color:#89A4B6\"/></linearGradient><rect x=\"0.375\" y=\"0.375\" fill=\"url(#mir_XMLID_2_)\" stroke=\"#000000\" stroke-width=\"0.75\" width=\"9.921\" height=\"28.346\"/><rect x=\"7.46\" y=\"0.375\" stroke=\"#000000\" stroke-width=\"0.75\" width=\"2.836\" height=\"28.346\"/></g></g>",
    "file": "b-mir.svg"
  },
  "phase": {
    "viewBox": "0 0 10.542 23.131",
    "body": "<g id=\"phase_Layer_1\"><linearGradient id=\"phase_XMLID_2_\" gradientUnits=\"userSpaceOnUse\" x1=\"-88.2759\" y1=\"117.2637\" x2=\"-67.8309\" y2=\"96.8187\" gradientTransform=\"matrix(-0.5 0.866 -0.866 -0.5 61.7697 134.4119)\"><stop offset=\"0\" style=\"stop-color:#FFFFFF\"/><stop offset=\"1\" style=\"stop-color:#89A4B6\"/></linearGradient><polygon fill=\"url(#phase_XMLID_2_)\" stroke=\"#000000\" stroke-width=\"0.75\" points=\"0.463,0.375 10.08,0.375 5.271,23.053 \"/></g>",
    "file": "b-phase.svg"
  },
  "laser1": {
    "viewBox": "0 0 61.695 46.104",
    "body": "<g id=\"laser1_Layer_1\"><g><rect x=\"0.375\" y=\"0.375\" fill=\"#302B33\" width=\"56.693\" height=\"12.756\"/><rect x=\"0.375\" y=\"32.973\" fill=\"#302B33\" width=\"56.693\" height=\"12.756\"/><linearGradient id=\"laser1_XMLID_2_\" gradientUnits=\"userSpaceOnUse\" x1=\"28.7217\" y1=\"32.9727\" x2=\"28.7217\" y2=\"13.1309\"><stop offset=\"0\" style=\"stop-color:#FFFFFF\"/><stop offset=\"0.0051\" style=\"stop-color:#FEFCFC\"/><stop offset=\"0.1497\" style=\"stop-color:#E6A4A4\"/><stop offset=\"0.277\" style=\"stop-color:#D35E5E\"/><stop offset=\"0.3823\" style=\"stop-color:#C62B2B\"/><stop offset=\"0.4615\" style=\"stop-color:#BD0C0C\"/><stop offset=\"0.5056\" style=\"stop-color:#BA0000\"/><stop offset=\"0.7077\" style=\"stop-color:#D86E6E\"/><stop offset=\"0.9099\" style=\"stop-color:#F4D6D6\"/><stop offset=\"1\" style=\"stop-color:#FFFFFF\"/></linearGradient><rect x=\"0.375\" y=\"13.131\" fill=\"url(#laser1_XMLID_2_)\" stroke=\"#000000\" stroke-width=\"0.75\" width=\"56.693\" height=\"19.842\"/><rect x=\"57.068\" y=\"3.209\" stroke=\"#000000\" stroke-width=\"0.75\" width=\"4.252\" height=\"39.686\"/><rect x=\"0.375\" y=\"0.375\" fill=\"none\" stroke=\"#000000\" stroke-width=\"0.75\" width=\"56.693\" height=\"45.354\"/></g></g>",
    "file": "c-laser1.svg"
  },
  "pd1": {
    "viewBox": "0 0 16.34 23.428",
    "body": "<g id=\"pd1_Layer_1\"><g><radialGradient id=\"pd1_XMLID_2_\" cx=\"8.8794\" cy=\"7.4609\" r=\"17.0671\" fx=\"8.8794\" fy=\"7.4609\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" style=\"stop-color:#FEDE58\"/><stop offset=\"0.6854\" style=\"stop-color:#BA0000\"/></radialGradient><path fill=\"url(#pd1_XMLID_2_)\" stroke=\"#000000\" stroke-width=\"0.75\" d=\"M6.044,1.792 c-0.986,0-1.936,0.148-2.835,0.417v19.01c0.899,0.268,1.849,0.416,2.835,0.416c5.479,0,9.921-4.441,9.921-9.921 S11.523,1.792,6.044,1.792z\"/><rect x=\"0.375\" y=\"0.375\" stroke=\"#000000\" stroke-width=\"0.75\" width=\"2.835\" height=\"22.678\"/></g></g>",
    "file": "e-pd1.svg"
  }
};

  // Size of each drawing (width / height) so the table can keep proportions.
  const ratio = {};
  let sprite = '';
  for (const [id, a] of Object.entries(ART)) {
    const [, , w, h] = a.viewBox.split(/\s+/).map(Number);
    ratio[id] = w / h;
    sprite += `<symbol id="sym-${id}" viewBox="${a.viewBox}">${a.body}</symbol>`;
  }
  // Put the symbols into the page once (hidden), so every drawing can use them.
  function install() {
    if (document.getElementById('component-sprite')) return;
    const holder = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    holder.id = 'component-sprite';
    holder.setAttribute('aria-hidden', 'true');
    holder.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
    holder.innerHTML = sprite;
    document.body.prepend(holder);
  }
  if (document.body) install(); else document.addEventListener('DOMContentLoaded', install);

  // A small icon (for menus and the legend) showing one drawing.
  const artIcon = (id, size = 16) => {
    const r = ratio[id] || 1, w = r >= 1 ? 20 : 20 * r, h = r >= 1 ? 20 / r : 20;
    return `<svg class="i art" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><use href="#sym-${id}" x="${(24 - w) / 2}" y="${(24 - h) / 2}" width="${w}" height="${h}"/></svg>`;
  };

  OGS.art = { ratio, sprite, artIcon, ids: Object.keys(ART) };
})();
