# Yeni düşmanlar: lazer nöbetçi ve kemirici böcek oyunda
from playwright.sync_api import sync_playwright
import json
res=[]
def check(n,c): res.append(bool(c)); print(("PASS " if c else "FAIL ")+n)
KEY={"up":"ArrowUp","down":"ArrowDown","left":"ArrowLeft","right":"ArrowRight"}
L=json.load(open('src/levels/levels.json'))
first=lambda t:[l['id'] for l in L if any(e['type']==t for e in l.get('enemies',[]))][0]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":393,"height":873}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://localhost:4173/"); pg.wait_for_timeout(3000)
    pg.evaluate("(()=>{const d=KB.data();Object.assign(d.seenTutorial,{keys:1,strong:1,portal:1,bridge:1});d.settings.unlockAll=true;d.settings.infiniteEnergy=true;d.storySeen=true})()")
    idle=lambda: pg.wait_for_function("KB.idle()",timeout=15000)
    # nöbetçi
    pg.evaluate(f"KB.start({first('sentry')})"); pg.wait_for_timeout(1200)
    check("nöbetçi öğretici penceresi", "Lazer Nöbetçi" in pg.locator("#tutorial").inner_text())
    pg.evaluate("document.querySelectorAll('[data-act=tutok], .tut button').forEach(b=>b.click())"); pg.wait_for_timeout(300)
    check("nöbetçi modeli sahnede", pg.evaluate("KB.stage().enemyMeshes.some(m=>m && m.userData.glb)"))
    sol=pg.evaluate("KB.solve()")
    charged=fired=False
    for i,mv in enumerate(sol):
        pg.keyboard.press(KEY[mv]); idle()
        if pg.evaluate("KB.stage().lasers.length")>0: charged=True
    check("nöbetçi bölümü çözülerek bitti", pg.locator("#card [data-act=next]").count()==1 or pg.evaluate("KB.state.status")=="win")
    check("lazer uyarı ışını görüldü", charged)
    # böcek
    pg.evaluate(f"KB.start({first('gnawer')})"); pg.wait_for_timeout(1200)
    check("böcek öğretici penceresi", "Kemirici Böcek" in pg.locator("#tutorial").inner_text())
    pg.evaluate("document.querySelectorAll('[data-act=tutok], .tut button').forEach(b=>b.click())"); pg.wait_for_timeout(300)
    sol=pg.evaluate("KB.solve()")
    for mv in sol: pg.keyboard.press(KEY[mv]); idle()
    pg.wait_for_timeout(500)
    check("böcek bölümü çözülerek bitti", pg.evaluate("KB.state.status")=="win")
    check("hata yok", not errs); print(errs)
    b.close()
print(f"{sum(res)} geçti, {len(res)-sum(res)} kaldı")
