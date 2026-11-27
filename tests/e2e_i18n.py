# 1.0.3: İngilizce dil + yeni ekranlar (haftalık, KB2 kartı, paylaş, önizleme) — kalan Türkçe metinleri bulur
import re, json
from playwright.sync_api import sync_playwright
TRW=re.compile(r"[çğıöşüÇĞİÖŞÜ]|\b(ve|bir|için|bölüm|altın|Bölüm|Dünya|Kapat|Seç|Devam|Geri|hamle|kare|gün|Tamam|Başla|kostüm|Yeni|enerji|Reklam|izle|Paylaş|var|yok|Haftalık|Görev)\b")
res=[]; found={}
def check(n,c): res.append(bool(c)); print(("PASS " if c else "FAIL ")+n)
KEY={"up":"ArrowUp","down":"ArrowDown","left":"ArrowLeft","right":"ArrowRight"}
def scan(pg, where):
    t=pg.evaluate("""()=>{const o=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const e=n.parentElement;if(!e||!e.offsetParent&&getComputedStyle(e).position!=='fixed')continue;const v=n.nodeValue.trim();if(v)o.push(v)}return o}""")
    for v in t:
        if TRW.search(v): found.setdefault(v, where)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader","--lang=en-US"])
    ctx=b.new_context(viewport={"width":412,"height":915},locale="en-US")
    ctx.add_init_script("if(!localStorage.getItem('kaptanbolt.lang'))localStorage.setItem('kaptanbolt.lang','en')")
    pg=ctx.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://localhost:4173/"); pg.wait_for_timeout(2500)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(600)
    check("İngilizce açılıyor", pg.evaluate("document.documentElement.lang")=="en")
    scan(pg,"menu")
    check("menüde 'Continue/Play' var", pg.locator("[data-act=continue]").inner_text().strip() in ("Continue","Play"))
    for act,name in [("worlds","worlds"),("shop","shop"),("garage","garage"),("quests","quests"),("ach","ach"),("settings","settings")]:
        pg.evaluate(f"document.querySelector('[data-act={act}]').click()"); pg.wait_for_timeout(700); scan(pg,name)
        if name=="shop":
            for tab in ["powers","pro","coins","hints","skins","energy"]:
                pg.evaluate(f"document.querySelector('[data-shoptab={tab}]').click()"); pg.wait_for_timeout(300); scan(pg,"shop:"+tab)
        if name=="quests": check("haftalık etkinlik görünüyor", pg.locator(".weekly").count()==1)
        pg.keyboard.press("Escape"); pg.wait_for_timeout(500)
        if pg.locator("#card:visible").count(): pg.evaluate("document.querySelector('#card [data-act=close]')?.click()"); pg.wait_for_timeout(300)
    pg.goto("http://localhost:4173/"); pg.wait_for_timeout(2000); pg.keyboard.press("Escape"); pg.wait_for_timeout(500)
    check("KB2 kartı menüde", pg.locator("#kb2Card:visible").count()==1)
    pg.click("#kb2Card"); pg.wait_for_timeout(500); scan(pg,"kb2"); pg.screenshot(path="tests/shots/i18n_kb2.png")
    pg.evaluate("document.querySelector('#card [data-act=close]').click()"); pg.wait_for_timeout(300)
    # garaj önizleme (altın yetmiyor)
    pg.evaluate("KB.data().coins=10"); pg.evaluate("document.querySelector('[data-act=garage]').click()"); pg.wait_for_timeout(700)
    pg.evaluate("document.querySelector('#skinGrid [data-skin].locked')?.click()"); pg.wait_for_timeout(600)
    check("önizleme penceresi + Altın al", pg.locator("#card .skin-preview").count()==1 and pg.locator("#card [data-act=getcoins]").count()==1)
    scan(pg,"preview"); pg.screenshot(path="tests/shots/i18n_preview.png")
    pg.click("#card [data-act=getcoins]"); pg.wait_for_timeout(600)
    check("Altın al → mağaza altın sekmesi", pg.evaluate("document.querySelector('#shopTabs .on')?.dataset.shoptab")=="coins")
    # oyun: bölüm 1 kazan
    pg.evaluate("Object.assign(KB.data().settings,{unlockAll:true,infiniteEnergy:true}); KB.data().storySeen=true")
    for lv in [1,2,6,35]:
        pg.evaluate(f"KB.start({lv})"); pg.wait_for_timeout(1200); scan(pg,f"game{lv}")
        pg.evaluate("document.querySelector('#card [data-act=close]')?.click()"); pg.wait_for_timeout(300)
        for m in pg.evaluate("KB.solve()"): pg.keyboard.press(KEY[m]); pg.wait_for_function("KB.idle()",timeout=15000)
        pg.wait_for_timeout(1500); scan(pg,f"win{lv}")
    check("kazanınca Paylaş butonu", pg.locator("#card [data-act=share]").count()==1)
    pg.screenshot(path="tests/shots/i18n_win.png")
    pg.evaluate("document.querySelector('#card [data-act=restart]').click()"); pg.wait_for_timeout(1200)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(600); scan(pg,"pause")
    check("JS hatası yok", not errs)
    for e in errs[:5]: print("  ERR", e)
    found.pop("Türkçe",None)
    for v,w in found.items(): print("  TR?", w, "|", v[:110])
    check(f"kalan Türkçe metin yok ({len(found)})", not found)
    # Türkçe'ye geri dön
    pg.evaluate("localStorage.setItem('kaptanbolt.lang','tr')"); ctx.clear_cookies(); pg.goto('about:blank'); pg2=ctx.new_page(); pg2.goto('http://localhost:4173/'); pg=pg2; pg.wait_for_timeout(500); pg.wait_for_timeout(2000)
    check("Türkçe seçilince Türkçe", pg.evaluate("document.documentElement.lang")=="tr" and pg.locator("[data-act=continue]").inner_text().strip() in ("Devam Et","Başla"))
print(f"{sum(res)}/{len(res)}")
