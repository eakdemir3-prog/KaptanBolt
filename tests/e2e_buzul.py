# Buzul Dağları mekanikleri: buzda kayma, sarkıt düşer ve can götürür, buz bloğu şimşekle erir, yeti kartopu atar
from playwright.sync_api import sync_playwright
res=[]
def check(n,c,info=''): res.append(c); print(('PASS ' if c else 'FAIL ')+n, info)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_context(viewport={"width":480,"height":240}).new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://127.0.0.1:5180/"); pg.wait_for_function("KB2.G.state==='menu'",timeout=90000)
    ev=pg.evaluate
    ev("KB2.load(61); 0"); pg.wait_for_timeout(500)
    r=ev("""new Promise(async res=>{const p=KB2.player,z=KB2.L.ices[0]; const wt=async(s)=>{ const t0=KB2.G.t; while(KB2.G.t-t0<s) await new Promise(r=>setTimeout(r,30)); }; const slide=async(x)=>{ KB2.tp(x); await wt(0.2); KB2.input.right=true; await wt(0.7); KB2.input.right=false; const x0=p.x; await wt(0.9); return p.x-x0; };
      const a=await slide(z.x0+0.5); KB2.load(1); await wt(0.5); KB2.ents.enemies.forEach(e=>e.x=999); const b2=await slide(3); res([+a.toFixed(2), +b2.toFixed(2)])})""")
    check("buzda bırakınca uzun kayar, karda hemen durur", r[0] > 1.0 and r[1] < 0.4, r)
    ev("KB2.load(62); 0"); pg.wait_for_timeout(500)
    r=ev("""new Promise(async res=>{const c=KB2.ents.icicles[0],p=KB2.player; KB2.G.inv=0; const h0=KB2.G.hearts; KB2.tp(c.x); const log=[]; for(let i=0;i<25;i++){ await new Promise(r=>setTimeout(r,80)); if(!log.includes(c.st)) log.push(c.st);} res([log.join('>'), h0-KB2.G.hearts])})""")
    check("sarkıt titreyip düşüyor, altında durana çarpıyor", r[0].startswith('shake>fall') and r[1]==1, r)
    ev("KB2.load(63); 0"); pg.wait_for_timeout(500)
    r=ev("""new Promise(async res=>{const p=KB2.player; const n0=KB2.L.iceb.size; KB2.tp(5.5); p.face=1; KB2.G.ch=3; KB2.G.cd=0; KB2.input.fire=true; await new Promise(r=>setTimeout(r,800)); res([n0, KB2.L.iceb.size])})""")
    check("buz bloğu şimşekle eriyor", r[1] < r[0], r)
    ev("KB2.load(64); 0"); pg.wait_for_timeout(500)
    r=ev("""new Promise(async res=>{const e=KB2.ents.enemies.find(q=>q.look==='yeti'); KB2.G.inv=99; KB2.tp(e.x-5); let seen=0; for(let i=0;i<50;i++){ await new Promise(r=>setTimeout(r,100)); seen=Math.max(seen,KB2.ents.sballs.length);} res([seen])})""")
    check("yeti kartopu atıyor", r[0] >= 1, r)
    check("JS hatası yok", not errs, errs[:2]); print(f"{sum(res)}/{len(res)}")
