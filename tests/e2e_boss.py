# Boss testi: üstten temas zarar vermez, şimşek yalnızca açık anda (sersem/yorgun) can götürür,
# %50 ve %25 eşikleri, öfke, sıfır enerjiyle bitirme, can barı, yeniden başlatmada sıfırlama.
from playwright.sync_api import sync_playwright
res=[]
def check(n,c,info=''): res.append(c); print(('PASS ' if c else 'FAIL ')+n, info)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_context(viewport={"width":915,"height":412},has_touch=True,is_mobile=True).new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://127.0.0.1:5180/"); pg.wait_for_function("KB2.G.state==='menu'",timeout=90000)
    ev=pg.evaluate
    for lv,vul in ((20,'stun'),(40,'tired'),(60,'stun')):
        ev(f"KB2.load({lv}); 0"); pg.wait_for_timeout(500)
        ev("(()=>{const b=KB2.ents.boss;KB2.tp(b.x0+3);})()"); pg.wait_for_timeout(1500)
        st=ev("(()=>{const b=KB2.ents.boss;return [b.st,b.hp,b.max,!document.getElementById('bossBar').classList.contains('hidden'),document.getElementById('bossName').textContent]})()")
        check(f"{lv}: arena başladı, can barı görünür", st[0]!='wait' and st[3], st)
        # üstten temas: kimse can kaybetmez
        r=ev("""new Promise(res=>{const b=KB2.ents.boss,p=KB2.player; b.st='walk'; b.t=0; b.vx=0; KB2.G.inv=0; const h0=KB2.G.hearts,hp0=b.hp;
          p.x=b.x; p.y=b.y+b.h+0.5; p.prevY=p.y; p.vy=-3; p.ground=false; setTimeout(()=>res([KB2.G.hearts-h0,b.hp-hp0]),350)})""")
        check(f"{lv}: üstten temas can azaltmaz", r==[0,0], r)
        # açık değilken ateş: hasar yok
        def fire_at(n):
            return ev(f"""new Promise(async res=>{{const b=KB2.ents.boss,p=KB2.player; const hp0=b.hp; for(let i=0;i<{n};i++){{ KB2.ents.sballs.forEach(q=>q.y=-9); const sd=(b.x-b.x0>5)?-1:1; p.x=b.x+sd*4; p.y=b.y; p.vy=0; p.face=-sd; p.ground=true; KB2.G.inv=99; KB2.input.fire=true; await new Promise(r=>setTimeout(r,450)); }} await new Promise(r=>setTimeout(r,400)); res([hp0-b.hp,b.st,b.hp,b.rage])}})""")
        ev("(()=>{const b=KB2.ents.boss; b.st='walk'; b.t=-99; b.vx=0; KB2.G.ch=3})()")
        r=fire_at(1); check(f"{lv}: açık değilken şimşek işlemez", r[0]==0, r)
        # açık anda ateş: her isabet 1 can; sıfır enerjiyle başla (dolum)
        ev(f"(()=>{{const b=KB2.ents.boss; b.st='{vul}'; b.t=-99; KB2.G.ch=0; KB2.G.cd=0}})()")
        r=ev(f"""new Promise(async res=>{{const b=KB2.ents.boss,p=KB2.player; const hp0=b.hp; const t0=KB2.G.t;
          while(KB2.G.ch<1 && KB2.G.t-t0<5) {{ b.st='{vul}'; b.t=-99; await new Promise(r=>setTimeout(r,100)); }}
          const wait=KB2.G.t-t0; KB2.ents.sballs.forEach(q=>q.y=-9); const sd=(b.x-b.x0>5)?-1:1; p.x=b.x+sd*4; p.y=b.y; p.face=-sd; p.ground=true; KB2.G.inv=99; KB2.input.fire=true; await new Promise(r=>setTimeout(r,900)); res([hp0-b.hp, +wait.toFixed(2), +b.x.toFixed(1), b.x0, +p.x.toFixed(1), p.face, b.st, KB2.ents.shots.length])}})""")
        check(f"{lv}: sıfır enerjiden dolup isabet ediyor (oyun saniyesi)", r[0]>=1 and r[1]<1.5, r)
        ev(f"(()=>{{const b=KB2.ents.boss; b.st='{vul}'; b.t=-99; KB2.G.ch=3}})()")
        # %25'e kadar indir → öfke
        for k in range(10):
            s2=ev("(()=>{const b=KB2.ents.boss;return [b.hp,b.rage,b.st]})()")
            if s2[1]: break
            ev(f"(()=>{{const b=KB2.ents.boss; b.st='{vul}'; b.t=-99; KB2.G.ch=3}})()"); fire_at(1)
        s2=ev("(()=>{const b=KB2.ents.boss;return [b.hp,b.max,b.rage,b.st,document.getElementById('bossBar').classList.contains('rage')]})()")
        check(f"{lv}: %25'te öfke evresi ve kırmızı bar", s2[2] and s2[0]<=s2[1]*0.25 and s2[4], s2)
        trail=ev("[document.getElementById('bossFill').style.width, document.getElementById('bossTrail').style.width]")
        print('   bar', trail)
        for k in range(6):
            if ev("KB2.ents.boss.dead"): break
            ev(f"(()=>{{const b=KB2.ents.boss; b.st='{vul}'; b.t=-99; KB2.G.ch=3}})()"); fire_at(1)
        check(f"{lv}: şimşekle yenildi", ev("KB2.ents.boss.dead"))
        pg.wait_for_function("!!KB2.ents.ship", timeout=60000)
        check(f"{lv}: duvarlar indi, gemi geldi, bar kapandı", ev("!KB2.ents.boss.wallsUp && !!KB2.ents.ship && document.getElementById('bossBar').classList.contains('hidden')"))
        ev(f"KB2.load({lv}); 0"); pg.wait_for_timeout(500)
        check(f"{lv}: yeniden başlatınca can/evre/bar sıfır", ev("(()=>{const b=KB2.ents.boss;return b.hp===b.max && !b.rage && b.st==='wait' && document.getElementById('bossBar').classList.contains('hidden')})()"))
    print('JS hataları', errs[:3]); check("JS hatası yok", not errs)
    print(f"{sum(res)}/{len(res)}")
