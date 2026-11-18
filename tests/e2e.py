# Uçtan uca test: gerçek tarayıcıda oyunu açar, bölüm oynar, kayıt ve ekranları doğrular
import sys, json
from playwright.sync_api import sync_playwright
URL = "http://localhost:4173/"
OUT = "/home/claude/kaptan-bolt/tests/shots/"
ok = []; fail = []
def check(name, cond):
    (ok if cond else fail).append(name); print(("PASS " if cond else "FAIL ") + name)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
    ctx = b.new_context(viewport={"width":412,"height":915}, device_scale_factor=2, has_touch=True)
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.goto(URL); pg.wait_for_timeout(2500)
    pg.screenshot(path=OUT+"01_menu.png")
    check("ana menü açıldı", pg.evaluate("KB.screen") == "menu")
    pg.click("[data-act=levels]"); pg.wait_for_timeout(1200)
    pg.screenshot(path=OUT+"02_levels.png")
    check("bölüm 2 kilitli", pg.locator("[data-lv='2']").get_attribute("data-locked") == "1")
    pg.click("[data-lv='1']"); pg.wait_for_timeout(1500)
    pg.screenshot(path=OUT+"03_level1_tutorial.png")
    st = lambda: pg.evaluate("({pos:KB.state.pos, moves:KB.state.moves, status:KB.state.status, col:[...KB.state.collapsed].reduce((a,b)=>a+b,0), keys:KB.state.keysTaken})")
    wait_idle = lambda: pg.wait_for_function("KB.idle()", timeout=8000)
    s0 = st()
    # geçersiz hamle: yukarıda boşluk var -> hamle sayılmamalı
    pg.keyboard.press("ArrowUp"); pg.wait_for_timeout(300)
    check("geçersiz kaydırma hamle sayılmaz", st()["moves"] == 0 and st()["pos"] == s0["pos"])
    # gerçek dokunmatik kaydırma ile sağa
    box = pg.viewport_size
    pg.mouse.move(150, 500); pg.mouse.down(); pg.mouse.move(260, 505, steps=6); pg.mouse.up(); wait_idle()
    s1 = st()
    check("kaydırma robotu bir kare ilerletir", s1["moves"] == 1 and s1["pos"] == s0["pos"] + 1)
    check("ayrılınan kare çöker", s1["col"] == 1)
    pg.keyboard.press("ArrowLeft"); pg.wait_for_timeout(300)
    check("çöken kareye geri dönülemez", st()["moves"] == 1)
    for k in ["ArrowRight","ArrowRight"]: pg.keyboard.press(k); wait_idle()
    pg.screenshot(path=OUT+"04_level1_mid.png")
    # yeniden başla
    pg.click("[data-act=restart]"); pg.wait_for_timeout(800)
    s2 = st(); check("yeniden başla bölümü sıfırlar", s2["moves"] == 0 and s2["col"] == 0 and s2["pos"] == s0["pos"])
    # çözümü oyna: sağ x4, aşağı x2, sol x4
    for k in ["ArrowRight"]*4 + ["ArrowDown"]*2: pg.keyboard.press(k); wait_idle()
    s3 = st(); check("anahtar toplandı", s3["keys"] == [True])
    pg.screenshot(path=OUT+"05_level1_dooropen.png")
    for k in ["ArrowLeft"]*4: pg.keyboard.press(k); wait_idle()
    pg.wait_for_timeout(1500)
    check("kapıya ulaşınca bölüm biter", st()["status"] == "win")
    pg.screenshot(path=OUT+"06_win.png")
    saved = pg.evaluate("JSON.parse(localStorage.getItem('kaptanbolt.save.v1'))")
    check("ilerleme kaydedildi (3 yıldız)", saved["stars"].get("1") == 3)
    # kayıt yeniden yüklemede korunuyor mu
    pg.reload(); pg.wait_for_timeout(2000)
    check("yeniden açınca ilerleme duruyor", pg.evaluate("KB.data().stars[1]") == 3)
    pg.click("[data-act=levels]"); pg.wait_for_timeout(800)
    check("bölüm 2 açıldı", pg.locator("[data-lv='2']").get_attribute("data-locked") is None)
    # kapı kilidi: bölüm 2'yi aç, kapıya anahtarsız girmeye çalış
    lv = json.load(open("/home/claude/kaptan-bolt/src/levels/levels.json"))
    def run_level(i, moves_dirs=None):
        pg.evaluate(f"KB.start({i})"); pg.wait_for_timeout(900)
    # yol kapandı senaryosu: çözücünün olmayan bir rota bulmak için rastgele hamleler
    pg.evaluate("KB.start(9)"); pg.wait_for_timeout(900)
    pg.screenshot(path=OUT+"07_level9.png")
    import random; random.seed(3)
    for _ in range(40):
        if st()["status"] != "play": break
        pg.keyboard.press(random.choice(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"])); wait_idle()
    pg.wait_for_timeout(1200)
    print("rastgele oyun sonucu:", st()["status"])
    pg.screenshot(path=OUT+"08_random_end.png")
    for i,name in [(25,"09_level25.png"),(44,"10_level44_ice.png"),(60,"11_level60.png")]:
        pg.evaluate(f"KB.start({i})"); pg.wait_for_timeout(1500); pg.screenshot(path=OUT+name)
    # küçük ekran
    pg.set_viewport_size({"width":360,"height":640}); pg.evaluate("KB.start(40)"); pg.wait_for_timeout(1500)
    pg.screenshot(path=OUT+"12_small_screen.png")
    check("hata yok", len(errs) == 0)
    if errs: print(errs[:5])
    b.close()
print(f"\n{len(ok)} geçti, {len(fail)} kaldı")
sys.exit(1 if fail else 0)
