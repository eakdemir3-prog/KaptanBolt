# Reklamla devam: kazanılabilir son ana geri sarar
from playwright.sync_api import sync_playwright
import random, sys
ok=fail=0
def check(c, m):
    global ok, fail
    print(('PASS ' if c else 'FAIL ') + m); ok += c; fail += (not c)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":412,"height":915})
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://localhost:4173/"); pg.wait_for_timeout(2500)
    pg.evaluate("Object.assign(KB.data(),{storySeen:true}); Object.assign(KB.data().settings,{unlockAll:true,infiniteEnergy:true}); KB.data().seenTutorial={keys:1,swipe:1}")
    pg.evaluate("KB.start(9)"); pg.wait_for_timeout(1500)
    pg.evaluate("document.getElementById('modal').classList.add('hidden')")
    random.seed(3)
    K={"up":"ArrowUp","down":"ArrowDown","left":"ArrowLeft","right":"ArrowRight"}
    for i in range(60):
        if pg.evaluate("KB.state.status")!='play': break
        pg.keyboard.press(K[random.choice(list(K))]); pg.wait_for_timeout(260)
    pg.wait_for_timeout(2500)
    st=pg.evaluate("KB.state.status")
    btn=pg.query_selector("[data-act=adContinue]")
    check(btn is not None, f"kaybedince 'Reklamla devam et' çıktı (durum {st})")
    if btn:
        n0=pg.evaluate("KB.state.moves")
        btn.click(); pg.wait_for_timeout(4000)
        n1=pg.evaluate("KB.state.moves")
        win=pg.evaluate("KB.canWin ? KB.canWin() : null")
        check(pg.evaluate("KB.state.status")=='play', "oyun devam ediyor")
        check(win is not False, f"geri sarılan an kazanılabilir ({n0} -> {n1} hamle)")
    check(not errs, "hata yok")
    b.close()
print(f"\n{ok} geçti, {fail} kaldı"); sys.exit(1 if fail else 0)
