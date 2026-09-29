import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

test('评审：小数平均分、跨GPU、当次分享、邀评资格和服务端频控模拟', async () => {
  const browser = await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  const errors = [];
  page.on('pageerror', e=>errors.push(e.message));
  try {
    await page.goto(pathToFileURL(path.resolve('demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html')).href);
    await page.waitForTimeout(450);
    const average = await page.evaluate(() => ({
      thresholds: [1,1.99,2,2.99,3,3.2,3.999,4,4.8,5].map(overallLevel),
      mixed: calcStats([5,5,2,2,2].map(stars=>({stars}))),
      newData: calcStats([{compatType:'basic',stars:5},{compatType:'perfect',stars:1}])
    }));
    assert.deepEqual(average.thresholds,['unplayable','unplayable','partial','partial','basic','basic','basic','perfect','perfect','perfect']);
    assert.equal(average.mixed.rawAverage,3.2);
    assert.equal(average.mixed.overallCompatType,'basic');
    assert.equal(average.newData.rawAverage,4);
    await page.click('#openCompatibilityReviews');
    await page.click('#manualReviewButton');
    await page.click('#fbTypeWrap [data-type="perfect"]');
    assert.equal(await page.locator('#shareSessionCheckbox').count(),0);
    await page.evaluate(()=>closeFeedbackModal());
    await page.evaluate(()=>{
      const source = compatibilityDemo.getSessionSnapshot();
      compatibilityDemo.routeSessionResult('normal',{playSessionId:source.playSessionId,gameId:'gta5',entry:'library'});
    });
    await page.click('#fbTypeWrap [data-type="perfect"]');
    assert.equal(await page.locator('#shareSessionCheckbox').count(),1);
    const countBefore = await page.evaluate(()=>compatibilityDemo.getInviteState().byGameGpu['gta5|Adreno 750'].exposures);
    await page.evaluate(()=>compatibilityDemo.routeSessionResult('normal',{playSessionId:compatibilityDemo.getSessionSnapshot().playSessionId}));
    assert.equal(await page.evaluate(()=>compatibilityDemo.getInviteState().byGameGpu['gta5|Adreno 750'].exposures),countBefore);
    await page.evaluate(()=>closeFeedbackModal());
    await page.click('#manualReviewButton');
    assert.equal(await page.locator('#shareSessionCheckbox').count(),0);
    await page.evaluate(()=>closeFeedbackModal());

    const gates = await page.evaluate(()=>{
      const eligibility=compatibilityDemo.getInviteEligibility;
      const now=Date.now();
      const day=86400000;
      return {
        otherGpu:eligibility('normal',{gameId:'gta5',gpuModel:'Adreno 740'}),
        otherGame:eligibility('normal',{gameId:'hades2'}),
        noId:eligibility('normal',{gameId:''}),
        noCapability:eligibility('normal',{supportsReviews:false}),
        offline:eligibility('normal',{online:false}),
        guest:eligibility('normal',{loggedIn:false}),
        short:eligibility('normal',{totalPlayMinutes:29}),
        crash:eligibility('crash'),
        priority:eligibility('normal',{higherPriorityModal:true}),
        recent:eligibility('normal',{now:now+8*day,reviewed:false,entry:'recent'}),
        reviewed:eligibility('normal',{now:now+8*day,reviewed:true}),
        afterMonth:eligibility('normal',{now:now+31*day,reviewed:true})
      };
    });
    for(const key of ['otherGpu','otherGame','noId','noCapability','offline','guest','short','crash','priority','reviewed'])assert.equal(gates[key].allowed,false,key);
    assert.equal(gates.recent.allowed,true);
    assert.equal(gates.afterMonth.allowed,true);

    await page.evaluate(()=>{
      const snapshots=getReviewSnapshots();
      snapshots.review_snapshot_s1.gpuModel='Adreno 740';
      snapshots.review_snapshot_s1.gpu.displayName='Adreno 740';
      localStorage.setItem(REVIEW_SNAPSHOTS_KEY,JSON.stringify(snapshots));
      openSolutionDetail('review_snapshot_s1');
    });
    assert.equal(await page.locator('#refreshSolutionDetail').count(),0);
    assert.equal(await page.locator('#applySolutionButton').isDisabled(),true);
    assert.equal(await page.locator('#copySolutionButton').isDisabled(),false);
    assert.match(await page.locator('#solutionApplyReason').innerText(),/GPU.*不同/);
    fs.mkdirSync('test-results/compatibility-review-v1.2/2026-09-29-review',{recursive:true});
    await page.locator('#shell').screenshot({path:'test-results/compatibility-review-v1.2/2026-09-29-review/gpu-mismatch.png'});
    await page.click('#copySolutionButton');
    await page.click('#confirmCopySolutionButton');
    assert.equal((await page.evaluate(()=>compatibilityDemo.getCopiedSolutions())).length,1);
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
});
