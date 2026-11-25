# 5. aşama tarayıcı testi: mağaza, güçler, yeni altın ekonomisi, reklamla altın, satın alma (test), Pro
import sys
from playwright.sync_api import sync_playwright
OUT="/home/claude/kaptan-bolt/tests/shots/"
res=[]
def check(n,c): res.append(bool(c)); print(("PASS " if c else "FAIL ")+n)
KEY={"up":"ArrowUp","down":"ArrowDown","left":"ArrowLeft","right":"ArrowRight"}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":412,"height":915},device_scale_factor=2)
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://localhost:4173/"); pg.wait_for_timeout(1500)
    pg.evaluate("Object.assign(KB.data().settings,{unlockAll:true,infiniteEnergy:true}); Object.assign(KB.data().seenTutorial,{patrol:1,boss:1,strong:1,keys:1,ice:1,portal:1,chaser:1,bridge:1,arrow:1,castle:1}); KB.data().coins=0")
    st=lambda k: pg.evaluate(f"KB.state.{k}")
    idle=lambda: pg.wait_for_function("KB.idle()",timeout=15000)
    # altın ekonomisi
    pg.evaluate("KB.start(6)"); pg.wait_for_timeout(900)
    for m in pg.evaluate("KB.solve()"): pg.keyboard.press(KEY[m]); idle()
    pg.wait_for_timeout(1200)
    c1=pg.evaluate("KB.data().coins")
    check(f"normal bölüm ilk bitiriş: az altın ({c1})", 5<=c1<=12)
    pg.click("#card [data-act=restart]"); pg.wait_for_timeout(800)
    for m in pg.evaluate("KB.solve()"): pg.keyboard.press(KEY[m]); idle()
    pg.wait_for_timeout(1200)
    check("aynı yıldızla tekrar oynamak altın vermiyor", pg.evaluate("KB.data().coins")==c1)
    pg.evaluate("KB.start(35)"); pg.wait_for_timeout(1200)
    for m in pg.evaluate("KB.solve()"): pg.keyboard.press(KEY[m]); idle()
    pg.wait_for_timeout(1500)
    c2=pg.evaluate("KB.data().coins")
    check(f"boss bölümü çok altın verir (+{c2-c1})", c2-c1>=30)
    # reklamla altın (test reklamı)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(500)
    if pg.locator("#card [data-act=leave]").count(): pg.click("#card [data-act=leave]"); pg.wait_for_timeout(500)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(500); pg.keyboard.press("Escape"); pg.wait_for_timeout(800)
    pg.click("[data-act=shop]"); pg.wait_for_timeout(800)
    pg.click("[data-shoptab=coins]"); pg.wait_for_timeout(300)
    c3=pg.evaluate("KB.data().coins")
    pg.click("[data-act=adCoins]"); pg.wait_for_timeout(2800)
    check("reklam izleyince +40 altın", pg.evaluate("KB.data().coins")==c3+40)
    # satın alma (tarayıcıda test satın alması)
    pg.click("[data-act=iap][data-k=coins1300]"); pg.wait_for_timeout(1200)
    check("altın paketi satın alındı (+1430, %10 bonuslu)", pg.evaluate("KB.data().coins")==c3+40+1430)
    pg.screenshot(path=OUT+"s5_shop_coins.png")
    # güç satın al
    pg.click("[data-shoptab=powers]"); pg.wait_for_timeout(300)
    n0=pg.evaluate("KB.data().powers.freeze")
    pg.click("[data-act=buypower][data-id=freeze]"); pg.wait_for_timeout(300)
    check("Dondur gücü altınla alındı", pg.evaluate("KB.data().powers.freeze")==n0+1)
    pg.screenshot(path=OUT+"s5_shop_powers.png")
    # güçleri kullan
    pg.keyboard.press("Escape"); pg.wait_for_timeout(500)
    pg.evaluate("KB.start(106)"); pg.wait_for_timeout(1300)
    # ilk hamle (uyanma)
    mv=pg.evaluate("KB.solve()"); pg.keyboard.press(KEY[mv[0]]); idle()
    pg.click("[data-power=freeze]"); pg.wait_for_timeout(400)
    check("Dondur: düşmanlar 3 hamle donmuş", st("frozen")==3)
    pg.screenshot(path=OUT+"s5_freeze.png")
    epos=pg.evaluate("KB.state.enemies.map(e=>e.pos).join()")
    mv=pg.evaluate("KB.solve()") or []
    if mv: pg.keyboard.press(KEY[mv[0]]); idle()
    check("dondurulmuş düşman hareket etmedi", pg.evaluate("KB.state.enemies.map(e=>e.pos).join()")==epos)
    # onarım
    col=pg.evaluate("[...KB.state.collapsed].reduce((a,b)=>a+b,0)")
    pg.click("[data-power=repair]"); pg.wait_for_timeout(600)
    check("Onarım: çöken kare geri geldi", pg.evaluate("[...KB.state.collapsed].reduce((a,b)=>a+b,0)")==col-1)
    m0=st("moves")
    pg.click("[data-power=undo3]"); pg.wait_for_timeout(500)
    check("Geri Al gücü son hamleyi geri aldı", st("moves")==m0-1)
    # zıpla: boşluk üstünden atlama olan bir bölüm
    d=None
    for jl in [9,11,12,13,16,17,18,22,24]:
        pg.evaluate(f"KB.start({jl})"); pg.wait_for_timeout(800)
        d=pg.evaluate("['up','down','left','right'].find(d=>{const s=KB._clone(KB.state); return KB._move(s,d,{jump:true})})")
        if d: break
    pg.click("[data-power=jump]"); pg.wait_for_timeout(300)
    pos0=st("pos")
    if d: pg.keyboard.press(KEY[d]); idle()
    check(f"Zıpla: iki kare öteye atladı ({d})", d and st("pos")!=pos0 and pg.evaluate("KB.data().powers.jump")==0)
    # kalkan
    seq=None
    for lv in [106,107,108,211,212,213]:
        pg.evaluate(f"KB.start({lv})"); pg.wait_for_timeout(600)
        seq=pg.evaluate("KB.findCaught()")
        if seq: break
    pg.keyboard.press(KEY[seq[0]]); idle()
    pg.click("[data-power=shield]"); pg.wait_for_timeout(300)
    for m in seq[1:]: pg.keyboard.press(KEY[m]); idle()
    pg.wait_for_timeout(900)
    check("Kalkan: yakalanınca oyun devam etti", st("status")=="play" and pg.is_hidden("#card [data-act=restart]"))
    # Pro
    pg.keyboard.press("Escape"); pg.wait_for_timeout(500)
    if pg.locator("#card [data-act=leave]").count(): pg.click("#card [data-act=leave]"); pg.wait_for_timeout(500)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(500); pg.keyboard.press("Escape"); pg.wait_for_timeout(800)
    pg.click("[data-act=shop]"); pg.wait_for_timeout(700); pg.click("[data-shoptab=pro]"); pg.wait_for_timeout(300)
    c4=pg.evaluate("KB.data().coins")
    pg.click("[data-act=iap][data-k=proLifetime]"); pg.wait_for_timeout(1300)
    check("Pro (ömür boyu) aktif, günlük 100 altın verildi", pg.evaluate("KB.data().pro.lifetime") and pg.evaluate("KB.data().coins")==c4+100)
    pg.screenshot(path=OUT+"s5_pro.png")
    pg.click("[data-shoptab=skins]"); pg.wait_for_timeout(600)
    pg.click("[data-skin=pro]"); pg.wait_for_timeout(500)
    check("Pro kostümü seçilebildi", pg.evaluate("KB.data().skin")=="pro")
    pg.screenshot(path=OUT+"s5_skins.png")
    check("hata yok", not errs); print(errs[:3])
    b.close()
sys.exit(0 if all(res) else 1)
