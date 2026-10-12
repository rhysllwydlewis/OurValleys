import { chromium } from "@playwright/test";
const [,, path, name, w="1440"] = process.argv;
const b = await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome"}); const p = await b.newPage({viewport:{width:+w,height:900}});
await p.goto("http://127.0.0.1:3000"+path,{waitUntil:"networkidle"});
await p.screenshot({path:`/tmp/claude-0/shots/${name}-${w}.png`,fullPage:true}); await b.close();
