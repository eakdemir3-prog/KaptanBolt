# Vadi Girişi: 4 yer altını koşarak (zıplamadan) toplanır; 13. bölüm: kalp ve yanındaki altın ayrı ayrı toplanır
from playwright.sync_api import sync_playwright
res=[]
def check(n,c,info=''): res.append(c); print(('PASS ' if c else 'FAIL ')+n, info)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_context(viewport={"width":480,"height":240}).new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://127.0.0.1:5180/"); pg.wait_for_function("KB2.G.state==='menu'",timeout=90000)
    ev=pg.evaluate
    ev("KB2.load(1); 0"); pg.wait_for_timeout(500)
    r=ev("""new Promise(async res=>{ KB2.ents.enemies.forEach(e=>e.x=999); KB2.tp(84); const c0=KB2.G.coins; let jumped=false; KB2.input.right=true;
      while(KB2.player.x<91){ await new Promise(r=>setTimeout(r,30)); if(!KB2.player.ground) jumped=true; }
      KB2.input.right=false; const got=KB2.ents.coins.filter(c=>c.x>86&&c.x<90&&c.taken).length; res([got, jumped])})""")
    check("Vadi Girişi: 4 yer altını koşarak toplandı, zıplama yok", r==[4,False], r)
    ev("KB2.load(13); 0"); pg.wait_for_timeout(500)
    r=ev("""new Promise(async res=>{ KB2.ents.enemies.forEach(e=>e.x=999); const h=KB2.ents.hearts[0]; const near=KB2.ents.coins.filter(c=>Math.abs(c.x-h.x)<2.2&&Math.abs(c.y-h.y)<0.5);
      KB2.G.hearts=2; KB2.tp(h.x-1.2); const c0=KB2.G.coins; KB2.input.right=true; for(let i=0;i<150 && KB2.player.x<h.x+2.5;i++){ await new Promise(r=>setTimeout(r,30)); } KB2.input.right=false;
      res([h.taken, KB2.G.hearts, near.length, near.filter(c=>c.taken).length, KB2.G.coins-c0, near.map(c=>(c.x-h.x).toFixed(1))])})""")
    check("13: kalp ve yanındaki altınlar ayrı ayrı toplandı, HUD doğru", r[0] and r[1]==3 and r[2]==r[3] and r[4]>=r[3], r)
    check("JS hatası yok", not errs, errs[:2]); print(f"{sum(res)}/{len(res)}")
