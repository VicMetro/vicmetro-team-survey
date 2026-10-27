// Fill + send TEST responses (is_test=true) through every step, with 390px screenshots of each step.
// node test/e2e.js [url]   (default: serve dist/ on 8766)
const puppeteer = require("puppeteer-core"), fs = require("fs");
const URL0 = process.argv[2] || "http://127.0.0.1:8766/", OUT = process.env.OUT || "/workspace/employee-survey/screens";
const RUNS = [{ name: "Test (ignore)", pick: 3, shots: true }, { name: "", pick: 1, shots: false }];
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox"] });
  for (const R of RUNS) {
    const p = await b.newPage();
    await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const errs = []; p.on("pageerror", e => errs.push(String(e)));
    const reqs = []; p.on("response", r => { if (r.url().includes("/rest/v1/")) reqs.push(`${r.status()} ${r.request().method()}`); });
    await p.goto(URL0 + "?test=1", { waitUntil: "networkidle0" });
    await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle0" });
    const shot = async n => R.shots && p.screenshot({ path: `${OUT}/step${n}.png`, fullPage: true });
    await shot("0-start");
    if (R.name) await p.type("#i-name", R.name);
    await p.click("#next"); await sleep(200);
    // try Next with nothing filled, to show the "still to answer" state
    if (R.shots) { await p.click("#next"); await sleep(500); await shot("1-missing"); }
    for (let s = 1; s <= 4; s++) {
      await p.evaluate(pick => document.querySelectorAll(".chips").forEach(c => c.querySelectorAll(".chip")[pick].click()), R.pick);
      const tas = await p.$$("textarea");
      for (const t of tas) await t.type(`Test answer (ignore) step ${s}`);
      await shot(`${s}-filled`);
      await p.click("#next"); await sleep(400);
    }
    await p.waitForFunction(() => /Thanks/.test(document.body.innerText), { timeout: 20000 });
    await shot("5-thanks");
    const left = await p.evaluate(() => [localStorage.getItem("vm-team-survey:test:draft"), localStorage.getItem("vm-team-survey-q")]);
    console.log(R.name || "(anonymous)", "requests:", reqs, "draft/queue left:", left, "errors:", errs);
    await p.close();
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
