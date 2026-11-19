# Yerleşim denetimi: tüm ekranlarda taşan yazı, üst üste binen düğme ve ekrandan taşan öğe arar
import sys, json
from playwright.sync_api import sync_playwright
SIZES=[(360,640),(360,780),(393,873),(412,915),(480,1000)]
JS = r"""(screenName) => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && e.offsetParent !== null; };
  const modalOpen = !document.getElementById('modal').classList.contains('hidden');
  const root = modalOpen ? document.getElementById('card') : document.querySelector('.screen.on');
  const out = [];
  if (!root) return out;
  const sel = '.btn,.chip,.top-title,.item .it,.mh-text b,.mh-text span,.wc .nm,h2,.lvname,.set-tile,.quest .qt,.pw,.buy,.tabs > *,.shop-tabs button,.menu-sub,.node,.toggle';
  const els = [...root.querySelectorAll(sel)].filter(vis);
  for (const e of els) {
    const cs = getComputedStyle(e);
    const ell = cs.textOverflow === 'ellipsis';
    if (!ell && !e.classList.contains('pw') && e.scrollWidth > e.clientWidth + 2 && cs.overflowX !== 'auto') out.push(['taşan yazı', e.className || e.tagName, (e.innerText || '').slice(0, 30)]);
    const r = e.getBoundingClientRect();
    if (r.left < -1 || r.right > innerWidth + 1) { if (!e.closest('.shop-tabs') && !e.closest('.scroll')) out.push(['ekran dışı', e.className, (e.innerText || '').slice(0, 30), Math.round(r.left), Math.round(r.right)]); }
  }
  const btns = [...root.querySelectorAll('button')].filter(vis).filter((b) => !b.closest('.scroll') && !b.closest('.shop-tabs'));
  for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) {
    const a = btns[i].getBoundingClientRect(), b = btns[j].getBoundingClientRect();
    if (btns[i].contains(btns[j]) || btns[j].contains(btns[i])) continue;
    const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (ox > 4 && oy > 4) out.push(['üst üste', (btns[i].innerText||btns[i].className).slice(0,20), (btns[j].innerText||btns[j].className).slice(0,20)]);
  }
  if (modalOpen) { const c = document.getElementById('card'); if (c.scrollHeight > c.clientHeight + 2) out.push(['pencere sığmıyor (kaydırma gerekiyor)', screenName]); }
  // oyun ekranı: tahta HUD altında ve düğmelerin üstünde mi (kamera güvenli alanı)
  return out;
}"""
KEY={"up":"ArrowUp","down":"ArrowDown","left":"ArrowLeft","right":"ArrowRight"}
problems={}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    for (w,h) in SIZES:
        pg=b.new_page(viewport={"width":w,"height":h},device_scale_factor=1)
        errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
        pg.goto("http://localhost:4173/"); pg.wait_for_timeout(1500)
        pg.evaluate("KB.data().coins=12345; Object.assign(KB.data().settings,{unlockAll:true,infiniteEnergy:true})")
        def audit(name):
            r=pg.evaluate(JS, name)
            for x in r: problems.setdefault(f"{w}x{h} {name}",[]).append(x)
        def esc(n=1):
            for _ in range(n): pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
        pg.evaluate("KB.screen"); audit("menü")
        pg.click("[data-act=settings]"); pg.wait_for_timeout(300); audit("ayarlar"); pg.click("#card [data-act=close]")
        pg.click("[data-act=quests]"); pg.wait_for_timeout(300); audit("görevler"); pg.click("#card [data-act=close]")
        pg.click("#menuEnergy"); pg.wait_for_timeout(300); audit("enerji"); pg.click("#card [data-act=closeEnergy]")
        pg.click("[data-act=worlds]"); pg.wait_for_timeout(800); audit("dünyalar")
        for wd in [1,2,8,10]:
            pg.click(f"[data-world='{wd}']"); pg.wait_for_timeout(500); audit(f"harita {wd}"); esc()
        esc()
        pg.click("[data-act=shop]"); pg.wait_for_timeout(500)
        for t in ['powers','pro','coins','hints','skins','energy']:
            pg.evaluate(f"document.querySelector('[data-shoptab={t}]').click()"); pg.wait_for_timeout(250); audit(f"mağaza {t}")
        esc()
        pg.click("[data-act=garage]"); pg.wait_for_timeout(700); audit("kostüm"); esc()
        pg.click("[data-act=ach]"); pg.wait_for_timeout(400); audit("başarımlar"); esc()
        for lv in [1,41,66,140,200]:
            pg.evaluate(f"KB.start({lv})"); pg.wait_for_timeout(700); audit(f"oyun {lv}")
            if pg.is_visible("#tutorial [data-act=tutok]"): pg.click("#tutorial [data-act=tutok]")
        pg.evaluate("KB.start(5)"); pg.wait_for_timeout(500)
        for m in pg.evaluate("KB.solve()"): pg.keyboard.press(KEY[m]); pg.wait_for_function("KB.idle()")
        pg.wait_for_timeout(900); audit("kazandın")
        pg.evaluate("document.querySelector('#card [data-act=restart]') && document.querySelector('#card [data-act=restart]').click()"); pg.wait_for_timeout(400)
        seq=[]
        for lv in [66,70,73,126,153,181]:
            pg.evaluate(f"KB.start({lv})"); pg.wait_for_timeout(500)
            seq=pg.evaluate("KB.findCaught()") or []
            if seq: break
        for m in seq: pg.keyboard.press(KEY[m]); pg.wait_for_function("KB.idle()")
        pg.wait_for_timeout(900); audit("yakalandın")
        pg.evaluate("document.querySelector('#card [data-act=restart]') && document.querySelector('#card [data-act=restart]').click()"); pg.wait_for_timeout(300)
        pg.click("[data-act=hint]"); pg.wait_for_timeout(200)
        if errs: problems.setdefault(f"{w}x{h} hata",[]).extend(errs)
        pg.close()
    b.close()
if problems:
    for k,v in problems.items():
        print(k); [print("   ",x) for x in v[:8]]
else: print("Sorun bulunamadı")
sys.exit(1 if problems else 0)
