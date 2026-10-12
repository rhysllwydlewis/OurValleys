import { chromium } from "@playwright/test";
const [,, path, name, w="1440"] = process.argv;
const b = await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome"});
const p = await b.newPage({viewport:{width:+w,height:900}});
const errs=[]; p.on("console",m=>{if(m.type()==="error")errs.push(m.text())});
await p.goto("http://127.0.0.1:3000"+path,{waitUntil:"networkidle"});
const h = await p.evaluate(()=>document.documentElement.scrollHeight);
for(let y=0;y<h;y+=500){await p.evaluate(y=>window.scrollTo(0,y),y);await p.waitForTimeout(250);}
await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(500);
await p.screenshot({path:`/tmp/claude-0/shots/${name}-${w}.png`,fullPage:true});
console.log(h, errs.slice(0,3));await b.close();
