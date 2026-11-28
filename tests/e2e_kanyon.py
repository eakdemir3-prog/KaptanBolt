# Güneş Kanyonu mekanikleri: çöken platform düşer ve geri gelir, bataklık kumu yavaşlatır, fırtına geri iter, yılan saklanır
from playwright.sync_api import sync_playwright
res=[]
def check(n,c,info=''): res.append(c); print(('PASS ' if c else 'FAIL ')+n, info)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_context(viewport={"width":480,"height":240}).new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://127.0.0.1:5180/"); pg.wait_for_function("KB2.G.state==='menu'",timeout=90000)
    ev=pg.evaluate
    ev("KB2.load(41); 0"); pg.wait_for_timeout(500)
    r=ev("""new Promise(async res=>{const k=KB2.ents.crumbles[0], p=KB2.player; KB2.G.inv=99; p.x=k.c.x+1; p.y=k.c.y+0.3; p.vy=0; p.ground=false;
      const log=[]; let miny=9; for(let i=0;i<30;i++){ await new Promise(r=>setTimeout(r,100)); miny=Math.min(miny,p.y); if(!log.includes(k.st)) log.push(k.st); }
      const fell=miny<k.c.y-0.5; for(let i=0;i<45;i++){ await new Promise(r=>setTimeout(r,100)); if(k.st==='ok') break; } res([log.join('>'), fell, k.st])})""")
    check("çöken platform: sallanır, düşer, Bolt düşer, platform geri gelir", r[0]=='ok>shake>fall' and r[1] and r[2]=='ok', r)
    ev("KB2.load(42); 0"); pg.wait_for_timeout(500)
    r=ev("""new Promise(async res=>{const z=KB2.L.sands[0],p=KB2.player; KB2.ents.enemies.forEach(e=>e.x=999); KB2.tp(z.x0+0.6); KB2.input.right=true; await new Promise(r=>setTimeout(r,600)); const v=Math.abs(p.vx);
      KB2.input.jump=true; KB2.input.jumpPressed=true; let top=p.y; for(let i=0;i<30;i++){ await new Promise(r=>setTimeout(r,30)); top=Math.max(top,p.y);} KB2.input.jump=false; KB2.input.right=false; res([+v.toFixed(2), +(top-z.y).toFixed(2)])})""")
    check("bataklık kumu: yavaşlatır, zıplama kısalır", r[0] < 2.6 and r[1] < 1.8, r)
    ev("KB2.load(43); 0"); pg.wait_for_timeout(500)
    r=ev("""new Promise(async res=>{const z=KB2.L.storms[0],p=KB2.player; KB2.tp(z.x0+3); const x0=p.x; await new Promise(r=>setTimeout(r,800)); res([+(p.x-x0).toFixed(2)])})""")
    check("kum fırtınası: duran Bolt'u sola iter", r[0] < -0.5, r)
    ev("KB2.load(44); 0"); pg.wait_for_timeout(500)
    r=ev("""new Promise(async res=>{const e=KB2.ents.enemies.find(q=>q.look==='yilan'); let hid=0, out=0; for(let i=0;i<50;i++){ await new Promise(r=>setTimeout(r,100)); if(e.hidden) hid++; else out++; } res([hid,out])})""")
    check("yılan kumdan çıkıp batıyor", r[0]>3 and r[1]>3, r)
    check("JS hatası yok", not errs, errs[:2]); print(f"{sum(res)}/{len(res)}")
