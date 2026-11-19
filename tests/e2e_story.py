# Hikâye, gemi parçaları, bonus altın, dekor ve efektler
from playwright.sync_api import sync_playwright
res=[]
def check(n,c): res.append(bool(c)); print(("PASS " if c else "FAIL ")+n)
KEY={"up":"ArrowUp","down":"ArrowDown","left":"ArrowLeft","right":"ArrowRight"}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":393,"height":873}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://localhost:4173/"); pg.wait_for_timeout(2500)
    idle=lambda: pg.wait_for_function("KB.idle()",timeout=15000)
    check("menüde gemi düğmesi 0/10", "Gemi 0/10" in pg.locator("#menuSub").inner_text())
    pg.click("[data-act=continue]"); pg.wait_for_timeout(600)
    check("ilk bölümde hikâye açıldı", pg.locator("#card [data-act=storyGo]").count()==1)
    pg.screenshot(path="/tmp/shots/story.png")
    pg.click("#card [data-act=storyGo]"); pg.wait_for_timeout(1200)
    check("hikâyeden sonra bölüm 1 başladı", pg.evaluate("KB.screen")=="game" and pg.evaluate("KB.state.board.id")==1)
    pg.evaluate("(()=>{const d=KB.data();Object.assign(d.seenTutorial,{swipe:1,keys:1,patrol:1,ice:1,boss:1});d.settings.unlockAll=true;d.settings.infiniteEnergy=true})()")
    # bonus altın: bölüm 3
    pg.evaluate("KB.start(3)"); pg.wait_for_timeout(1200)
    bc=pg.evaluate("KB.stage().bonusCell")
    check("bölüm 3'te bonus altın var", bc>=0 and pg.evaluate("!!KB.stage().bonusMesh"))
    path=pg.evaluate(f"""(()=>{{const s0=KB._clone(KB.state);const q=[[s0,[]]];const seen=new Set();
      while(q.length){{const [s,p]=q.shift(); if(p.length>14) continue; for(const d of ['up','down','left','right']){{const c=KB._clone(s); const ev=KB._move(c,d); if(!ev||!ev.length||c.status==='caught'||c.status==='stuck') continue;
        if(ev.some(e=>e.t==='step'&&e.to==={bc})) return [...p,d]; const k=c.pos+':'+c.collapsed.join(''); if(seen.has(k)) continue; seen.add(k); q.push([c,[...p,d]]);}}}} return null;}})()""")
    c0=pg.evaluate("KB.data().coins")
    for d in path or []: pg.keyboard.press(KEY[d]); idle()
    pg.wait_for_timeout(500)
    check("bonus alındı: +15 altın", path and pg.evaluate("KB.data().coins")==c0+15 and pg.evaluate("KB.data().bonusTaken[3]")==1)
    pg.evaluate("KB.start(3)"); pg.wait_for_timeout(1000)
    check("alınan bonus tekrar çıkmıyor", pg.evaluate("KB.stage().bonusCell")==-1)
    pg.evaluate("KB.start(4)"); pg.wait_for_timeout(800)
    check("bölüm 4'te bonus yok", pg.evaluate("KB.stage().bonusCell")==-1)
    # boss yenince gemi parçası
    pg.evaluate("KB.start(20)"); pg.wait_for_timeout(1500)
    for d in pg.evaluate("KB.solve()"): pg.keyboard.press(KEY[d]); idle()
    pg.wait_for_timeout(1500)
    check("boss sonrası gemi parçası kartı", pg.locator("#card .part-won").count()==1 and "Pusula" in pg.locator("#card .part-won").inner_text())
    pg.screenshot(path="/tmp/shots/boss_part.png")
    pg.goto("http://localhost:4173/"); pg.wait_for_timeout(2500)
    check("menüde gemi 1/10", "Gemi 1/10" in pg.locator("#menuSub").inner_text())
    pg.click("[data-act=ship]"); pg.wait_for_timeout(500)
    check("gemi penceresi: 1 parça açık", pg.locator("#card .part.on").count()==1 and pg.locator("#card .part").count()==10)
    pg.screenshot(path="/tmp/shots/ship.png")
    check("hata yok", not errs); print(errs)
    b.close()
print(f"{sum(res)} geçti, {len(res)-sum(res)} kaldı")
