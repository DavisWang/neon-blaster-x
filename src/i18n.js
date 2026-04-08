const STRINGS = {
  en: {
    "lang.label": "EN",

    "audio.on": "Audio On",
    "audio.off": "Audio Off",

    "title.presents": "Pwner Studios presents",
    "title.subtitle": "A neon salvage shooter about tearing ships apart and rebuilding your own in real time.",
    "title.newGame": "New Game",
    "title.builder": "Spaceship Builder",
    "title.howToPlay": "How to Play",
    "title.footer": "By Pwner Studios",
    "title.hint": "Keyboard: `WASD`, `Space` | Mouse: drag salvage | `R`: rotate dragged part",

    "howto.eyebrow": "How to Play",
    "howto.headline": "Steal Parts. Stay Alive.",
    "howto.subtitle": "Start as a bare cockpit, tear enemy ships apart, and rebuild faster than the next fight can overwhelm you.",
    "howto.flyShoot": "Fly + Shoot",
    "howto.flyShootDesc": "Use <code>WASD</code> to move and turn. Press <code>Space</code> to fire.",
    "howto.rebuild": "Rebuild Live",
    "howto.rebuildDesc": "Mouse click/drag to attach/detach parts.",
    "howto.rotate": "Rotate + Glow",
    "howto.rotateDesc": "Press <code>R</code> to rotate the dragged part before you drop it. Press <code>Q</code> to cycle glow quality and preview the live glow look.",
    "howto.startRun": "Start Run",
    "howto.back": "Back",

    "hud.shipStatus": "Spaceship Status",
    "hud.runStats": "Run Stats",
    "hud.health": "Cockpit {pct}% | Blocks {count}",
    "hud.score": "Kills {kills} | Scrap {scrap}",
    "gameover.stats": "Kills {kills} | Scrap attached {scrap}",

    "builder.eyebrow": "Builder Sandbox",
    "builder.title": "Ship Builder",
    "builder.launchRun": "Launch Run",
    "builder.copySpec": "Copy Ship Spec",
    "builder.resetShip": "Reset Ship",
    "builder.titleBtn": "Title",
    "builder.qualityHeading": "Quality",
    "builder.blocksHeading": "Blocks",
    "builder.notesHeading": "Builder Notes",
    "builder.note1": "Cyan squares on the ship are open mount points. Drop a part onto one to snap it in.",
    "builder.note2": "Hull 1x2 and 1x3 pieces extend straight out from the socket they connect to.",
    "builder.note3": "Press `R` while dragging blasters, thrusters, or shields to change their facing before you drop them.",
    "builder.note4": "Drag any mounted non-cockpit part off the ship to detach it, or right-click it for a quick detach.",
    "builder.note5": "Use `Copy Ship Spec` to export the exact ship layout as `nbx-ship-design-v1` JSON for future enemy-design requests.",
    "builder.exportNone": "No builder ship available to export yet.",
    "builder.exportSuccess": "Copied `nbx-ship-design-v1` JSON to the clipboard.",
    "builder.exportFallback": "Clipboard was blocked, so the JSON was opened for manual copy.",
    "builder.exportPrompt": "Copy ship design JSON:",

    "gameover.eyebrow": "Run Lost",
    "gameover.headline": "Cockpit Destroyed",
    "gameover.retry": "Retry",
    "gameover.title": "Title",

    "quality.grey": "Grey",
    "quality.red": "Red",
    "quality.orange": "Orange",
    "quality.yellow": "Yellow",
    "quality.green": "Green",
    "quality.blue": "Blue",
    "quality.purple": "Purple",
    "quality.white": "White",
    "quality.rainbow": "Rainbow",

    "palette.hull.single": "Hull 1×1",
    "palette.hull.single.detail": "Single-cell frame",
    "palette.hull.double": "Hull 1×2",
    "palette.hull.double.detail": "Two-cell spine",
    "palette.hull.triple": "Hull 1×3",
    "palette.hull.triple.detail": "Three-cell spine",
    "palette.blaster.single": "Blaster",
    "palette.blaster.single.detail": "Single forward shot",
    "palette.blaster.dual": "Dual Blaster",
    "palette.blaster.dual.detail": "Twin forward shots",
    "palette.blaster.spread": "3-Way Blaster",
    "palette.blaster.spread.detail": "Fan spread shot",
    "palette.thruster": "Thruster",
    "palette.thruster.detail": "Force from mounted direction",
    "palette.shield": "Shield",
    "palette.shield.detail": "Reflects incoming shots"
  },

  cn: {
    "lang.label": "中文",

    "audio.on": "音效 开",
    "audio.off": "音效 关",

    "title.presents": "Pwner Studios 出品",
    "title.subtitle": "一款霓虹风格的打捞射击游戏——拆解敌舰，实时重建你的战机。",
    "title.newGame": "开始游戏",
    "title.builder": "飞船建造",
    "title.howToPlay": "游戏指南",
    "title.footer": "By Pwner Studios",
    "title.hint": "键盘：`WASD`、`Space` | 鼠标：拖拽残骸 | `R`：旋转零件",

    "howto.eyebrow": "游戏指南",
    "howto.headline": "夺取零件，存活下去。",
    "howto.subtitle": "从一个裸露座舱起步，拆毁敌舰，在下一波攻势到来前完成改装。",
    "howto.flyShoot": "飞行 + 射击",
    "howto.flyShootDesc": "使用 <code>WASD</code> 移动和转向，按 <code>Space</code> 开火。",
    "howto.rebuild": "实时改装",
    "howto.rebuildDesc": "鼠标点击或拖拽来安装、拆卸零件。",
    "howto.rotate": "旋转 + 辉光",
    "howto.rotateDesc": "拖拽零件时按 <code>R</code> 旋转朝向；按 <code>Q</code> 切换辉光画质。",
    "howto.startRun": "开始作战",
    "howto.back": "返回",

    "hud.shipStatus": "飞船状态",
    "hud.runStats": "作战统计",
    "hud.health": "座舱 {pct}% | 模块 {count}",
    "hud.score": "击杀 {kills} | 残骸 {scrap}",
    "gameover.stats": "击杀 {kills} | 已装配 {scrap}",

    "builder.eyebrow": "建造沙盒",
    "builder.title": "飞船建造",
    "builder.launchRun": "出击",
    "builder.copySpec": "复制设计图",
    "builder.resetShip": "重置飞船",
    "builder.titleBtn": "主菜单",
    "builder.qualityHeading": "品质",
    "builder.blocksHeading": "模块",
    "builder.notesHeading": "建造指南",
    "builder.note1": "飞船上的青色方块是开放的安装点，将零件拖放到上面即可安装。",
    "builder.note2": "1×2 和 1×3 舰体从连接的插槽处直线延伸。",
    "builder.note3": "拖拽激光炮、推进器或护盾时按 `R` 可在放置前调整朝向。",
    "builder.note4": "拖拽已安装的非座舱零件即可拆卸，也可右键快速拆卸。",
    "builder.note5": "使用「复制设计图」将当前布局导出为 `nbx-ship-design-v1` JSON。",
    "builder.exportNone": "暂无可导出的飞船设计。",
    "builder.exportSuccess": "已将 `nbx-ship-design-v1` JSON 复制到剪贴板。",
    "builder.exportFallback": "剪贴板被阻止，已打开供手动复制。",
    "builder.exportPrompt": "复制飞船设计 JSON：",

    "gameover.eyebrow": "作战失败",
    "gameover.headline": "座舱已摧毁",
    "gameover.retry": "再试一次",
    "gameover.title": "主菜单",

    "quality.grey": "灰",
    "quality.red": "红",
    "quality.orange": "橙",
    "quality.yellow": "黄",
    "quality.green": "绿",
    "quality.blue": "蓝",
    "quality.purple": "紫",
    "quality.white": "白",
    "quality.rainbow": "彩虹",

    "palette.hull.single": "舰体 1×1",
    "palette.hull.single.detail": "单格框架",
    "palette.hull.double": "舰体 1×2",
    "palette.hull.double.detail": "双格脊柱",
    "palette.hull.triple": "舰体 1×3",
    "palette.hull.triple.detail": "三格脊柱",
    "palette.blaster.single": "激光炮",
    "palette.blaster.single.detail": "单发前射",
    "palette.blaster.dual": "双管激光炮",
    "palette.blaster.dual.detail": "双联前射",
    "palette.blaster.spread": "散射炮",
    "palette.blaster.spread.detail": "扇形散射",
    "palette.thruster": "推进器",
    "palette.thruster.detail": "沿安装方向提供推力",
    "palette.shield": "护盾",
    "palette.shield.detail": "反弹来袭弹幕"
  }
};

let currentLang = "en";
let onLangChangeCallback = null;

export function getLang() {
  return currentLang;
}

export function t(key, params = {}) {
  let str = STRINGS[currentLang]?.[key] ?? STRINGS.en[key] ?? key;
  for (const [k, v] of Object.entries(params)) {
    str = str.replaceAll(`{${k}}`, v);
  }
  return str;
}

export function getPaletteI18nKey(entry) {
  const variant = entry.variant ?? "";
  return variant ? `palette.${entry.type}.${variant}` : `palette.${entry.type}`;
}

export function setOnLangChange(callback) {
  onLangChangeCallback = callback;
}

export function applyLang() {
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of document.querySelectorAll("[data-i18n-html]")) {
    el.innerHTML = t(el.dataset.i18nHtml);
  }
  document.documentElement.lang = currentLang === "cn" ? "zh-CN" : "en";
  onLangChangeCallback?.();
}

export function initLang() {
  const stored = localStorage.getItem("nbx-lang");
  if (stored === "cn" || stored === "en") {
    currentLang = stored;
  }
  applyLang();
}

export function toggleLang() {
  currentLang = currentLang === "en" ? "cn" : "en";
  localStorage.setItem("nbx-lang", currentLang);
  applyLang();
}
