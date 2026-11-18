# 2. aşama tarayıcı testi: her yeni dünyanın ilk bölümü ve boss bölümleri çözücünün çözümüyle oynanır
import sys
from playwright.sync_api import sync_playwright
OUT="/home/claude/kaptan-bolt/tests/shots/"
res=[]
def check(n,c): res.append(c); print(("PASS " if c else "FAIL ")+n)
KEY={"up":"ArrowUp","down":"ArrowDown","left":"ArrowLeft","right":"ArrowRight"}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":412,"height":915},device_scale_factor=2)
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://localhost:4173/"); pg.wait_for_timeout(1500)
    pg.evaluate("Object.assign(KB.data().seenTutorial,{patrol:1,strong:1,portal:1,chaser:1,boss:1,keys:1,ice:1}); KB.data().settings.infiniteEnergy=true"); pg.wait_for_timeout(1500)
    def play(lv, shot_mid=None, shot_end=None):
        pg.evaluate(f"KB.start({lv})"); pg.wait_for_timeout(1300)
        if shot_mid: pg.screenshot(path=OUT+shot_mid)
        moves=pg.evaluate("KB.solve()")
        for i,m in enumerate(moves):
            pg.keyboard.press(KEY[m]); pg.wait_for_function("KB.idle()",timeout=10000)
        pg.wait_for_timeout(1300)
        if shot_end: pg.screenshot(path=OUT+shot_end)
        return pg.evaluate("KB.state.status"), len(moves)
    for lv,name in [(61,"devriye"),(81,"sağlam taş"),(101,"portal"),(121,"takipçi"),(80,"boss 4"),(20,"boss 1")]:
        st,n=play(lv, f"s2_{lv}_start.png", f"s2_{lv}_end.png")
        check(f"bölüm {lv} ({name}) çözümle bitti ({n} hamle)", st=="win")
    # boss ortasında ekran görüntüsü
    pg.evaluate("KB.start(100)"); pg.wait_for_timeout(1200)
    mv=pg.evaluate("KB.solve()")
    for m in mv[:max(1,len(mv)//2)]: pg.keyboard.press(KEY[m]); pg.wait_for_function("KB.idle()",timeout=10000)
    pg.wait_for_timeout(400); pg.screenshot(path=OUT+"s2_100_mid.png")
    # yakalanma: düşmana yakalanan bir hamle dizisini oyna
    seq=None
    for lv in [66,70,73,126,153]:
        pg.evaluate(f"KB.start({lv})"); pg.wait_for_timeout(700)
        seq=pg.evaluate("KB.findCaught()")
        if seq: break
    for m in seq or []: pg.keyboard.press(KEY[m]); pg.wait_for_function("KB.idle()",timeout=10000)
    pg.wait_for_timeout(1200); pg.screenshot(path=OUT+"s2_caught.png")
    check("devriyeye yakalanınca 'Yakalandın' ekranı", pg.evaluate("KB.state.status")=="caught" and pg.is_visible("text=Yakalandın!"))
    pg.click("#card [data-act=map]"); pg.wait_for_timeout(800); pg.keyboard.press("Escape"); pg.wait_for_timeout(600); pg.screenshot(path=OUT+"s2_levels.png")
    check("10 dünya kartı", pg.locator("#worldList [data-world]").count()==10)
    check("hata yok", not errs); print(errs[:3])
    b.close()
sys.exit(0 if all(res) else 1)
