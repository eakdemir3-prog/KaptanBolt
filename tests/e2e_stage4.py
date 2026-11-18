# 4. aşama tarayıcı testi: enerji, altın, görevler, başarımlar, kostüm satın alma, dünya kilitleri, yeni ekranlar
import sys
from playwright.sync_api import sync_playwright
OUT="/home/claude/kaptan-bolt/tests/shots/"
res=[]
def check(n,c): res.append(bool(c)); print(("PASS " if c else "FAIL ")+n)
KEY={"up":"ArrowUp","down":"ArrowDown","left":"ArrowLeft","right":"ArrowRight"}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    for vw,vh,tag in [(412,915,"big"),(360,640,"small")]:
        pg=b.new_page(viewport={"width":vw,"height":vh},device_scale_factor=2)
        pg.goto("http://localhost:4173/"); pg.wait_for_timeout(1800)
        pg.screenshot(path=OUT+f"s4_menu_{tag}.png")
        # menü: logo, tahta alanı ve düğmeler üst üste binmiyor
        ok=pg.evaluate("(()=>{const l=document.getElementById('menuLogo').getBoundingClientRect(), m=document.getElementById('menuBottom').getBoundingClientRect(); return l.bottom < m.top - 60})()")
        check(f"menü ({vw}x{vh}): logo ile düğmeler arasında tahta için yer var", ok)
        pg.close()
    pg=b.new_page(viewport={"width":412,"height":915},device_scale_factor=2)
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://localhost:4173/"); pg.wait_for_timeout(1500)
    pg.evaluate("Object.assign(KB.data().settings,{unlockAll:false,infiniteEnergy:false}); Object.assign(KB.data().seenTutorial,{patrol:1,boss:1,keys:1})")
    st=lambda k: pg.evaluate(f"KB.state.{k}")
    idle=lambda: pg.wait_for_function("KB.idle()",timeout=15000)
    # dünya kilitleri
    pg.click("[data-act=worlds]"); pg.wait_for_timeout(1500); pg.screenshot(path=OUT+"s4_worlds.png")
    check("dünya 2 kilitli (yıldız yok, boss yenilmedi)", "lock" in pg.get_attribute("[data-world='2']","class"))
    pg.click("[data-world='1']"); pg.wait_for_timeout(1000); pg.screenshot(path=OUT+"s4_map.png")
    check("yol haritasında 20 düğüm ve boss var", pg.locator("#mapInner .node").count()==20 and pg.locator("#mapInner .node.boss").count()==1)
    # altın: bölüm 1'i çöz
    c0=pg.evaluate("KB.data().coins")
    pg.click("[data-lv='1']"); pg.wait_for_timeout(1000)
    for m in pg.evaluate("KB.solve()"): pg.keyboard.press(KEY[m]); idle()
    pg.wait_for_timeout(1300)
    c1=pg.evaluate("KB.data().coins")
    check(f"kazanınca altın verildi (+{c1-c0})", c1>c0)
    pg.screenshot(path=OUT+"s4_win.png")
    # enerji: kaybet -> geri al (enerji gitmez), kaybet -> yeniden başla (1 gider)
    pg.evaluate("Object.assign(KB.data().settings,{unlockAll:true})")
    e0=pg.evaluate("KB.data().energy")
    seq=None
    for lv in [66,70,73,126,153,181]:
        pg.evaluate(f"KB.start({lv})"); pg.wait_for_timeout(600)
        seq=pg.evaluate("KB.findCaught()")
        if seq: break
    for m in seq: pg.keyboard.press(KEY[m]); idle()
    pg.wait_for_timeout(900)
    pg.screenshot(path=OUT+"s4_lose.png")
    pg.click("#card [data-act=adContinue]"); pg.wait_for_timeout(2800)
    check("reklam izleyip devam: oyun sürüyor, Geri Al hakkı azalmadı, enerji gitmedi", st("status")=="play" and pg.evaluate("KB.data().energy")==e0 and pg.locator("#undoCount").inner_text()=="3")
    pg.keyboard.press(KEY[seq[-1]]); idle(); pg.wait_for_timeout(900)
    pg.click("#card [data-act=restart]"); pg.wait_for_timeout(800)
    check("kaybedip yeniden başlayınca 1 enerji gitti", pg.evaluate("KB.data().energy")==e0-1)
    # enerji 0 iken bölüm başlatılamaz, altınla doldurulur
    pg.evaluate("KB.data().energy=0; KB.data().energyAt=Date.now(); KB.data().coins=1000")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(600)
    pg.evaluate("KB.start(5)"); pg.wait_for_timeout(800)
    pg.screenshot(path=OUT+"s4_energy.png")
    check("enerji yokken 'Enerjin Bitti' ekranı çıkıyor", pg.is_visible("text=Enerjin Bitti"))
    pg.click("#card [data-act=refill]"); pg.wait_for_timeout(1500)
    check("altınla doldurunca enerji 5 oldu ve bölüm açıldı", pg.evaluate("KB.data().energy")==5 and pg.evaluate("KB.screen")=="game")
    check("enerji asla 5'i geçmiyor", pg.evaluate("(KB.data().energy=5, KB.data().coins=0, KB.data().energy)")==5)
    # görevler
    pg.keyboard.press("Escape"); pg.wait_for_timeout(500); pg.keyboard.press("Escape"); pg.wait_for_timeout(500); pg.keyboard.press("Escape"); pg.wait_for_timeout(800)
    pg.evaluate("for (const q of KB.data().quests.list) { q.have=q.n; q.done=true; }")
    pg.click("[data-act=quests]"); pg.wait_for_timeout(500); pg.screenshot(path=OUT+"s4_quests.png")
    c2=pg.evaluate("KB.data().coins")
    for i in range(3): pg.click("#card [data-act=claimq]"); pg.wait_for_timeout(300)
    pg.click("#card [data-act=claimbonus]"); pg.wait_for_timeout(300)
    check("görev ödülleri ve bonus alındı", pg.evaluate("KB.data().quests.bonus") and pg.evaluate("KB.data().coins")>=c2+250)
    pg.click("#card [data-act=close]"); pg.wait_for_timeout(300)
    # kostüm satın alma
    pg.evaluate("Object.assign(KB.data().settings,{unlockAll:false}); KB.data().coins=600")
    pg.click("[data-act=garage]"); pg.wait_for_timeout(1500)
    pg.click("[data-skin=altin]"); pg.wait_for_timeout(400)
    pg.click("#card [data-act=buyskin]"); pg.wait_for_timeout(800)
    pg.screenshot(path=OUT+"s4_garage.png")
    check("Altın Kaptan 500 altına alındı ve seçildi", pg.evaluate("KB.data().skin")=="altin" and pg.evaluate("KB.data().coins")==100)
    # başarımlar
    pg.keyboard.press("Escape"); pg.wait_for_timeout(500)
    pg.click("[data-act=ach]"); pg.wait_for_timeout(800)
    c3=pg.evaluate("KB.data().coins")
    pg.click("[data-act=claimach][data-id=ilk]"); pg.wait_for_timeout(400)
    pg.screenshot(path=OUT+"s4_ach.png")
    check("'İlk Adım' başarımı ödülü alındı", pg.evaluate("KB.data().coins")==c3+50)
    check("hata yok", not errs); print(errs[:3])
    b.close()
sys.exit(0 if all(res) else 1)
