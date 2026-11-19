# 3. aşama tarayıcı testi: ilk hamle güvenliği, tehlike işaretleri, geri al, köprü, ok, son boss, kostüm, günlük bulmaca
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
    pg.goto("http://localhost:4173/"); pg.wait_for_timeout(800)
    pg.evaluate("Object.assign(KB.data().seenTutorial,{patrol:1,strong:1,portal:1,chaser:1,boss:1,keys:1,ice:1,castle:1}); KB.data().settings.infiniteEnergy=true"); pg.wait_for_timeout(1800)
    pg.screenshot(path=OUT+"s3_menu.png")
    idle=lambda: pg.wait_for_function("KB.idle()",timeout=15000)
    st=lambda k: pg.evaluate(f"KB.state.{k}")
    # 1) ilk hamle güvenli: tüm düşmanlı bölümlerde her ilk hamle güvenli mi (kurallarla)
    unsafe=pg.evaluate("""(()=>{let bad=0;for(let id=61;id<=200;id++){KB.start(id);const s=KB.state;if(!s.enemies.length&&!s.boss)continue;
      for(const d of ['up','down','left','right']){const c=KB._clone(s);if(KB._move(c,d)&&c.status==='caught')bad++;}}return bad})()""")
    check("hiçbir bölümde ilk hamlede yakalanılmıyor", unsafe==0)
    # 2) tehlike işareti + yakalanma + geri al
    found=None
    for lv in [66,70,126,153,181,190]:
        pg.evaluate(f"KB.start({lv})"); pg.wait_for_timeout(500)
        seq=pg.evaluate("KB.findCaught()")
        if seq: found=(lv,seq); break
    lv,seq=found
    for m in seq[:-1]: pg.keyboard.press(KEY[m]); idle()
    pg.wait_for_timeout(300)
    marks=pg.evaluate("KB.dangerCount()")
    pg.screenshot(path=OUT+"s3_danger.png")
    check(f"bölüm {lv}: yakalanacağın kare kırmızı X ile işaretli", marks>=1)
    pg.keyboard.press(KEY[seq[-1]]); idle(); pg.wait_for_timeout(1000)
    check("yakalandın ekranında Geri Al var", st("status")=="caught" and pg.is_visible("#card [data-act=undo]"))
    pg.screenshot(path=OUT+"s3_caught_undo.png")
    mv=st("moves"); pg.click("#card [data-act=undo]"); pg.wait_for_timeout(700)
    check("geri al bir hamle geri götürür ve oyun devam eder", st("status")=="play" and st("moves")==mv-1)
    # 3) köprü, ok, son boss, günlük: çözücüyle oyna
    def play(level, shot):
        pg.evaluate(f"KB.start({level})"); pg.wait_for_timeout(1200)
        if pg.is_visible("#tutorial [data-act=tutok]"): pg.screenshot(path=OUT+shot.replace('.png','_tut.png')); pg.click("#tutorial [data-act=tutok]")
        pg.wait_for_timeout(300); pg.screenshot(path=OUT+shot)
        for m in pg.evaluate("KB.solve()"): pg.keyboard.press(KEY[m]); idle()
        pg.wait_for_timeout(1300); return st("status")
    check("bölüm 141 (köprü) bitti", play(141,"s3_141.png")=="win")
    check("bölüm 161 (ok) bitti", play(161,"s3_161.png")=="win")
    check("bölüm 200 (son boss) bitti", play(200,"s3_200.png")=="win")
    pg.screenshot(path=OUT+"s3_finish.png")
    # 4) günlük bulmaca
    pg.click("#card [data-act=menu]"); pg.wait_for_timeout(1000)
    pg.click("[data-act=daily]"); pg.wait_for_timeout(1500); pg.screenshot(path=OUT+"s3_daily.png")
    for m in pg.evaluate("KB.solve()"): pg.keyboard.press(KEY[m]); idle()
    pg.wait_for_timeout(1300)
    d=pg.evaluate("KB.data().daily")
    check("günlük bulmaca bitti, seri kaydedildi", st("status")=="win" and d and d.get("streak")==1)
    pg.screenshot(path=OUT+"s3_daily_win.png")
    # 5) kostümler
    pg.click("#card [data-act=menu]"); pg.wait_for_timeout(800)
    pg.click("[data-act=garage]"); pg.wait_for_timeout(1200)
    pg.evaluate("KB.data().coins=5000")
    pg.click("[data-skin=korsan]"); pg.wait_for_timeout(600)
    pg.screenshot(path=OUT+"s3_garage_buy.png")
    pg.click("#card [data-act=buyskin]"); pg.wait_for_timeout(600)
    pg.screenshot(path=OUT+"s3_garage.png")
    check("kostüm altınla alındı ve seçildi", pg.evaluate("KB.data().skin")=="korsan" and pg.evaluate("KB.data().coins")<5000)
    check("hata yok", not errs); print(errs[:3])
    b.close()
sys.exit(0 if all(res) else 1)
