# Baştan sona boss dövüşü (zorlamasız): bot uzak durur, saldırılardan zıplar, açık anda ateş eder.
import sys
from playwright.sync_api import sync_playwright
lv=int(sys.argv[1]); secs=int(sys.argv[2]) if len(sys.argv)>2 else 240
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_context(viewport={"width":480,"height":240}).new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://127.0.0.1:5180/"); pg.wait_for_function("KB2.G.state==='menu'",timeout=90000)
    ev=pg.evaluate
    ev(f"KB2.load({lv}); 0"); pg.wait_for_timeout(500); ev("(()=>{const b=KB2.ents.boss;KB2.tp(b.x0+3);window.__ts=2})()")
    ev("""(()=>{ window.__log=[]; window.__hurt=0; let last='', h=KB2.G.hearts; setInterval(()=>{ const b=KB2.ents.boss,p=KB2.player,I=KB2.input; if(!b) return;
      if(KB2.G.hearts<h){ window.__hurt++; } KB2.G.hearts=3; h=3;
      const tag=b.st+(b.rage?'!':''); if(tag!==last){ window.__log.push(tag+'@'+KB2.G.t.toFixed(0)+':'+b.hp); last=tag; }
      if(b.dead) return;
      const vul = b.kind==='kral' ? b.st==='tired' : b.st==='stun';
      const dx=b.x-p.x, want = Math.sign(dx)*5; // boss'a 5 kare uzak dur (duvara yakınsa öbür yana geç)
      I.left=I.right=false;
      if (!vul && Math.abs(dx)<4) { const dir = (p.x-b.x0<3)?1:(b.x1-p.x<3)?-1:-Math.sign(dx); if(dir>0)I.right=true; else I.left=true; }
      if (vul) { p.face=Math.sign(dx)||1; if(KB2.G.ch>=1 && Math.abs(dx)>1.8) I.fire=true; }
      const ringNear = b.st==='punch' && b.t>1.0 && b.t<1.9, chargeNear = b.st==='charge' && Math.abs(dx)<6, leapLand = b.st==='leap';
      if (p.ground && (ringNear||chargeNear)) { I.jump=true; I.jumpPressed=true; setTimeout(()=>I.jump=false,350); }
    }, 40); })()""")
    for i in range(secs//5):
        pg.wait_for_timeout(5000)
        if ev("!!KB2.ents.boss && KB2.ents.boss.dead"): break
    pg.wait_for_timeout(3000)
    r=ev("[KB2.ents.boss.t.toFixed(1), KB2.G.state, KB2.ents.boss.hp, KB2.ents.boss.dead, KB2.G.t.toFixed(0), window.__hurt, document.getElementById('bossBar').classList.contains('hidden'), !!KB2.ents.ship]")
    print(' | '.join(ev("window.__log"))[:1500]); print('hp,dead,t,hasar,barKapalı,gemi', r, errs[:3])
    print('SONUÇ', 'YENİLDİ' if r[1] else 'YENİLMEDİ')
