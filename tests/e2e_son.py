# Son üç dünyanın mekanikleri: lav havuzu, lav kovalaması, ateş yarasası (şimşek işlemez), karanlık + ışık taşı,
# köstebek saklanır, konveyör bant taşır, lazer açıkken can götürür, kalkanlı asker
from playwright.sync_api import sync_playwright
res=[]
def check(n,c,info=''): res.append(c); print(('PASS ' if c else 'FAIL ')+n, info)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_context(viewport={"width":480,"height":240}).new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://127.0.0.1:5180/"); pg.wait_for_function("KB2.G.state==='menu'",timeout=90000)
    ev=pg.evaluate; W="const wt=async(s)=>{const t0=KB2.G.t; while(KB2.G.t-t0<s) await new Promise(r=>setTimeout(r,30));};"
    ev("KB2.load(81); 0"); pg.wait_for_timeout(500)
    r=ev(f"""new Promise(async res=>{{{W} const t=KB2.L.thorns.find(q=>q.y>0); KB2.G.inv=0; const h0=KB2.G.hearts; KB2.tp(t.x0+1); await wt(0.4); res([h0-KB2.G.hearts])}})""")
    check("lav havuzu can götürür", r[0]>=1, r)
    ev("KB2.load(85); 0"); pg.wait_for_timeout(500)
    r=ev(f"""new Promise(async res=>{{{W} KB2.ents.enemies.forEach(e=>e.x=999); KB2.tp(9); await wt(0.3); const h0=KB2.G.hearts; KB2.G.inv=0; await wt(5.5); res([KB2.ents.chase.on, h0-KB2.G.hearts])}})""")
    check("lav kovalaması başlar, duran Bolt'a yetişir", r[0] and r[1]>=1, r)
    ev("KB2.load(83); 0"); pg.wait_for_timeout(500)
    r=ev(f"""new Promise(async res=>{{{W} const e=KB2.ents.enemies.find(q=>q.look==='atesyarasa'); KB2.G.inv=99; e.vx=0; e.wait=99; e.swCd=99; const p=KB2.player; KB2.tp(e.x-3); await wt(0.3); p.face=1; KB2.G.ch=3; KB2.G.cd=0; e.yo=0.2; KB2.input.fire=true; await wt(0.6); const after=e.alive;
      p.x=e.x; p.y=e.y+(e.yo||0)+e.h+0.4; p.prevY=p.y; p.vy=-3; p.ground=false; await wt(0.3); res([after, e.alive])}})""")
    check("ateş yarasası şimşekle ölmez, ezilince ölür", r==[True,False], r)
    ev("KB2.load(102); 0"); pg.wait_for_timeout(500)
    r=ev(f"""new Promise(async res=>{{{W} const el=document.getElementById('dark'); const dark=!el.classList.contains('hidden'); KB2.tp(10); await wt(0.5); const r0=el._r; KB2.tp(KB2.ents.lights[1].x); await wt(1.2); res([dark, Math.round(r0), Math.round(el._r)])}})""")
    check("karanlık mağara: ışık taşı aydınlatır", r[0] and r[2] > r[1]+100, r)
    ev("KB2.load(102); 0"); pg.wait_for_timeout(500)
    r=ev(f"""new Promise(async res=>{{{W} const e=KB2.ents.enemies.find(q=>q.look==='kostebek'); let hid=0,out=0; for(let i=0;i<40;i++){{ await wt(0.1); if(e.hidden) hid++; else out++; }} res([hid,out])}})""")
    check("köstebek yerden çıkıp batıyor", r[0]>3 and r[1]>3, r)
    ev("KB2.load(131); 0"); pg.wait_for_timeout(500)
    r=ev(f"""new Promise(async res=>{{{W} KB2.ents.enemies.forEach(e=>e.x=999); const z=KB2.L.belts[0]; KB2.tp(z.x0+2); await wt(0.2); const x0=KB2.player.x; await wt(1); res([+(KB2.player.x-x0).toFixed(2)])}})""")
    check("konveyör bant taşır", r[0]>1.5, r)
    r=ev(f"""new Promise(async res=>{{{W} const z=KB2.ents.lasers[0]; let hit=0; for(let i=0;i<3;i++){{ KB2.G.inv=0; const h0=KB2.G.hearts; KB2.tp(z.x); await wt(0.25); if(KB2.G.hearts<h0) hit++; KB2.G.hearts=3; await wt(1.0); }} res([hit])}})""")
    check("lazer açıkken can götürür, kapalıyken geçilir", r[0]>=1 and r[0]<3, r)
    ev("KB2.load(135); 0"); pg.wait_for_timeout(500)
    r=ev(f"""new Promise(async res=>{{{W} const e=KB2.ents.enemies.find(q=>q.look==='asker'); if(!e) return res(['yok']); e.vx=0; e.wait=99; KB2.G.inv=99; const p=KB2.player;
      p.x=e.x; p.y=e.y+e.h+0.4; p.prevY=p.y; p.vy=-3; p.ground=false; await wt(0.3); const a1=e.alive; KB2.tp(e.x-3); await wt(0.2); p.face=1; KB2.G.ch=3; KB2.G.cd=0; KB2.input.fire=true; await wt(0.5);
      p.x=e.x; p.y=e.y+e.h+0.4; p.prevY=p.y; p.vy=-3; p.ground=false; await wt(0.3); res([a1, e.alive])}})""")
    check("asker: kalkanlıyken ezilmez, şimşekten sonra ezilir", r==[True,False], r)
    check("JS hatası yok", not errs, errs[:2]); print(f"{sum(res)}/{len(res)}")
