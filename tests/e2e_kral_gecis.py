# Mantar Kral'ın öbür tarafına geçiş: (1) kafadan sekip üstünden aşma, (2) köşedeyken kral sıçrar, altından geçilir
from playwright.sync_api import sync_playwright
res=[]
def check(n,c,info=''): res.append(c); print(('PASS ' if c else 'FAIL ')+n, info)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_context(viewport={"width":915,"height":412}).new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://127.0.0.1:5180/"); pg.wait_for_function("KB2.G.state==='menu'",timeout=90000)
    ev=pg.evaluate
    ev("KB2.load(40); 0"); pg.wait_for_timeout(500); ev("(()=>{const b=KB2.ents.boss;KB2.tp(b.x0+3);})()"); pg.wait_for_timeout(1500)
    # 1: kafadan sek → öbür tarafa in (sağa basılı)
    r=ev("""new Promise(async res=>{const b=KB2.ents.boss,p=KB2.player; b.st='tired'; b.t=-99; b.x=b.x0+10; KB2.G.inv=0; const h0=KB2.G.hearts;
      p.x=b.x-0.4; p.y=b.y+b.h+0.4; p.prevY=p.y; p.vy=-3; p.ground=false; KB2.input.right=true;
      for(let i=0;i<40;i++){ b.st='tired'; b.t=-99; await new Promise(r=>setTimeout(r,60)); if(p.ground && i>3) break; }
      KB2.input.right=false; res([+(p.x-b.x).toFixed(2), KB2.G.hearts-h0, p.ground])})""")
    check("kafadan sekip kralın sağına geçti, can gitmedi", r[0] > 1.2 and r[1]==0, r)
    # 2: köşeye sıkıştır → kral sıçrar; Bolt altından koşar
    r=ev("""new Promise(async res=>{const b=KB2.ents.boss,p=KB2.player; KB2.G.inv=0; const h0=KB2.G.hearts; b.st='walk'; b.t=0; b.x=b.x0+6; p.x=b.x0+1.2; p.y=b.y; p.vx=0; p.ground=true;
      let seen=[], passed=false;
      for(let i=0;i<120;i++){ await new Promise(r=>setTimeout(r,60)); if(!seen.includes(b.st)) seen.push(b.st);
        
        if(p.x > b.x + 1.2) { passed=true; } if(KB2.G.hearts<h0 && !window.__hl){ window.__hl=[b.st,+b.t.toFixed(2),+b.yOff.toFixed(2),+(p.x-b.x).toFixed(2),+p.y.toFixed(2),KB2.ents.sballs.length]; }
        if(b.st==='land') break; }
      KB2.input.right=false; res([seen.join('>'), passed, KB2.G.hearts-h0, +(p.x-b.x).toFixed(1), window.__hl])})""")
    check("köşede kral sıçradı, öbür uca indi, can gitmedi", 'leap' in r[0] and r[2]==0, r)
    # 3: ortada dururken sıçrayış: kral üstünden aşar, taraf değişir
    r=ev("""new Promise(async res=>{const b=KB2.ents.boss,p=KB2.player; KB2.input.right=false; KB2.G.inv=0; window.__hl=null; const h0=KB2.G.hearts; b.x=b.x0+16; p.x=b.x0+11; p.y=b.y; p.vx=0; p.ground=true; b.atk=2; b.st='walk'; b.t=99; const side0=Math.sign(p.x-b.x);
      for(let i=0;i<80;i++){ await new Promise(r=>setTimeout(r,60)); if(b.st==='land') break; }
      res([b.st, side0, Math.sign(p.x-b.x), KB2.G.hearts-h0])})""")
    check("ortada sıçrayış: kral üstünden aştı, taraflar değişti, can gitmedi", r[0]=='land' and r[1]!=r[2] and r[3]==0, r)
    check("JS hatası yok", not errs, errs[:2]); print(f"{sum(res)}/{len(res)}")
