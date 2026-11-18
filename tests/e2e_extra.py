import json, sys
from playwright.sync_api import sync_playwright
sys.path.insert(0,'.')
OUT="/home/claude/kaptan-bolt/tests/shots/"
res=[]
def check(n,c): res.append(c); print(("PASS " if c else "FAIL ")+n)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":412,"height":915},device_scale_factor=2)
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://localhost:4173/"); pg.wait_for_timeout(2000)
    pg.click("[data-act=settings]"); pg.wait_for_timeout(500); pg.screenshot(path=OUT+"13_settings.png")
    pg.click("[data-toggle=sound]"); pg.wait_for_timeout(200)
    check("ayar kaydedildi", pg.evaluate("JSON.parse(localStorage.getItem('kaptanbolt.save.v1')).settings.sound")==False)
    pg.click("[data-act=close]")
    st=lambda: pg.evaluate("({pos:KB.state.pos,moves:KB.state.moves,status:KB.state.status})")
    idle=lambda: pg.wait_for_function("KB.idle()",timeout=8000)
    # ipucu
    pg.evaluate("KB.start(25)"); pg.wait_for_timeout(1200)
    h0=pg.evaluate("KB.data().hints")
    pg.click("[data-act=hint]"); pg.wait_for_timeout(600); pg.screenshot(path=OUT+"14_hint.png")
    check("ipucu kullanıldı", pg.evaluate("KB.data().hints")==h0-1)
    # çıkmaz uyarısı: bölüm 12'de rastgele hamleler, bannerı yakala
    import random; random.seed(11); seen=False
    for attempt in range(6):
        pg.evaluate(f"KB.start({12+attempt})"); pg.wait_for_timeout(700)
        for _ in range(25):
            if st()["status"]!="play": break
            pg.keyboard.press(random.choice(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"])); idle(); pg.wait_for_timeout(120)
            if pg.is_visible("#banner"): seen=True; break
        if seen: break
    pg.screenshot(path=OUT+"15_deadend.png")
    check("çıkmaz rota uyarısı göründü", seen)
    # buz öğreticisi + kayma
    pg.evaluate("KB.start(41)"); pg.wait_for_timeout(1000); pg.screenshot(path=OUT+"16_ice_tutorial.png")
    check("buz öğreticisi", pg.is_visible("#tutorial"))
    pg.click("[data-act=tutok]")
    lv=json.load(open("src/levels/levels.json"))[40]
    print(lv["grid"])
    pg.evaluate("KB.start(21)"); pg.wait_for_timeout(1000); pg.screenshot(path=OUT+"17_keys_tutorial.png")
    check("anahtar öğreticisi", pg.is_visible("#tutorial"))
    # android geri tuşu (Escape): oyundan bölümler ekranına
    pg.keyboard.press("Escape"); pg.wait_for_timeout(300); pg.keyboard.press("Escape"); pg.wait_for_timeout(500)
    check("geri tuşu menüye döner", pg.evaluate("KB.screen") in ("levels","menu"))
    check("hata yok", not errs); print(errs[:3])
    b.close()
sys.exit(0 if all(res) else 1)
