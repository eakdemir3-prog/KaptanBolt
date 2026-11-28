# Tarayıcıda oyun mantığı testleri: ezme (üstten/köşeden/yandan), kirpi, çoklu dokunma, geliştirici modu
from playwright.sync_api import sync_playwright
res=[]
def check(n,c,info=''): res.append(c); print(('PASS ' if c else 'FAIL ')+n, info)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    ctx=b.new_context(viewport={"width":915,"height":412},has_touch=True,is_mobile=True)
    pg=ctx.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://127.0.0.1:5180/#unlock"); pg.wait_for_function("KB2.G.state==='menu'",timeout=90000)
    def drop(lv, idx, dx, h, vx=0):
        pg.evaluate(f"KB2.load({lv})"); pg.wait_for_timeout(700)
        return pg.evaluate(f"""async()=>{{const e=KB2.ents.enemies[{idx}]; e.vx=0; e.wait=0; const p=KB2.player; KB2.G.inv=0;
          p.x=e.x+({dx}); p.y=e.y+{h}; p.vy=-2; p.vx={vx}; p.ground=false; const c0=KB2.G.coins, h0=KB2.G.hearts;
          await new Promise(r=>setTimeout(r,900)); return {{alive:e.alive, hearts:KB2.G.hearts-h0, curled:e.curled||0}}; }}""")
    r=drop(1,0,0,1.6); check("böcek: tam üstten iniş ezer", not r['alive'] and r['hearts']==0, r)
    r=drop(1,0,0.75,1.6); check("böcek: köşeden iniş ezer", not r['alive'] and r['hearts']==0, r)
    pg.evaluate("KB2.load(1)"); pg.wait_for_timeout(700)
    r=pg.evaluate("""async()=>{const e=KB2.ents.enemies[0]; e.vx=0; const p=KB2.player; KB2.G.inv=0; p.x=e.x-1.6; p.y=e.y; p.ground=true; p.vx=0; const h0=KB2.G.hearts; KB2.input.right=true; for(let i=0;i<15 && KB2.G.hearts===h0;i++) await new Promise(r=>setTimeout(r,70)); KB2.input.right=false; return {alive:e.alive, hearts:KB2.G.hearts-h0};}""")
    check("böcek: yandan çarpma can götürür", r['alive'] and r['hearts']==-1, r)
    r=drop(3,0,0,1.6); check("kirpi: üstüne basmak can götürür", r['alive'] and r['hearts']==-1, r)
    pg.evaluate("KB2.load(3)"); pg.wait_for_timeout(700)
    r=pg.evaluate("""async()=>{const e=KB2.ents.enemies[0]; e.vx=0; e.curled=3; const p=KB2.player; KB2.G.inv=0; p.x=e.x; p.y=e.y+1.6; p.vy=-2; p.ground=false; const h0=KB2.G.hearts; await new Promise(r=>setTimeout(r,800)); return {alive:e.alive, hearts:KB2.G.hearts-h0};}""")
    check("top kirpi: üstüne basınca ezilir", not r['alive'] and r['hearts']==0, r)
    # çoklu dokunma: sağ tuş basılıyken zıplama tuşu
    pg.evaluate("KB2.load(1)"); pg.wait_for_timeout(1500); pg.evaluate("KB2.tp(5)"); pg.wait_for_timeout(500)
    R=pg.locator('#bR').bounding_box(); J=pg.locator('#bJ').bounding_box()
    cdp=ctx.new_cdp_session(pg)
    pR={'x':R['x']+R['width']/2,'y':R['y']+R['height']/2,'id':1}; pJ={'x':J['x']+J['width']/2,'y':J['y']+J['height']/2,'id':2}
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[pR]}); pg.wait_for_timeout(400)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[pR,pJ]}); pg.wait_for_timeout(120)
    st=pg.evaluate("({r:KB2.input.right, j:KB2.input.jump, vx:KB2.player.vx, g:KB2.player.ground, vy:KB2.player.vy})")
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[pR]}); pg.wait_for_timeout(100)
    st2=pg.evaluate("({r:KB2.input.right, j:KB2.input.jump})")
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    check("çoklu dokunma: sağa koşarken zıplama", st['r'] and st['j'] and st['vx']>3 and not st['g'], st)
    check("çoklu dokunma: zıplama tutulurken sağ bırakılabiliyor", (not st2['r']) and st2['j'], st2)
    # geliştirici modu: altın sayacına 5 dokunuş
    bb=pg.locator('#coins').bounding_box()
    pg.evaluate('''()=>{const el=document.querySelector('#coins').parentElement; for(let i=0;i<5;i++) el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));}''')
    pg.wait_for_timeout(400); check("geliştirici modu 5 dokunuşla açılır", pg.evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent==='DEV')"))
    check("JS hatası yok", not errs, errs[:2])
print(f"{sum(res)}/{len(res)}")
