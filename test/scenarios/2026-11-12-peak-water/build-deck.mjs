// Builds today's made-up conference deck as a PDF (16:9 pages) from plain HTML.  node build-deck.mjs deck.pdf
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2];

// Figure 2: a drawn chart whose values are only in the picture; the slide's words are the caption.
function runoffChart() {
  const x = (y) => 90 + (y - 1980) * 12.5, y = (v) => 400 - (v - 60) * 4.2;
  const med = [[1981,104],[1990,108],[2000,114],[2010,121],[2019,126],[2030,119],[2040,112],[2050,106],[2060,101]];
  const hi = med.map(([t, v]) => [t, v + (t > 2024 ? 4 + (t - 2024) * 0.45 : 3)]), lo = med.map(([t, v]) => [t, v - (t > 2024 ? 4 + (t - 2024) * 0.5 : 3)]);
  const line = (p) => p.map(([t, v]) => `${x(t)},${y(v)}`).join(' ');
  return `<svg width="1100" height="430" viewBox="0 0 1100 430"><polygon points="${line(hi)} ${line(lo.slice().reverse())}" fill="#bcd6ea"/>
  <polyline points="${line(med)}" fill="none" stroke="#134b73" stroke-width="5"/><line x1="90" y1="400" x2="1090" y2="400" stroke="#334" stroke-width="2"/><line x1="90" y1="20" x2="90" y2="400" stroke="#334" stroke-width="2"/>
  <line x1="${x(2019)}" y1="30" x2="${x(2019)}" y2="400" stroke="#b3541e" stroke-width="3" stroke-dasharray="8 6"/><line x1="${x(2024)}" y1="30" x2="${x(2024)}" y2="400" stroke="#889" stroke-width="2"/></svg>`;
}
function varianceChart() {
  const parts = [[46, '#134b73'], [31, '#4c86b0'], [17, '#9cbfd9'], [6, '#d9e6ef']]; let at = 0;
  return `<svg width="1100" height="110" viewBox="0 0 1100 110">${parts.map(([p, c]) => { const r = `<rect x="${at * 11}" y="10" width="${p * 11}" height="90" fill="${c}"/>`; at += p; return r; }).join('')}</svg>`;
}

const slides = [
 ['title', 'Peak water has passed', `<p class="sub">Summer runoff from the Sorne glacier catchment to 2060</p><p class="foot">Léa Montandon, PhD candidate · Institute for Mountain Hydrology, Université de Valmont<br>Alpine Hydrology Meeting 2026 · Session 4B: Cryosphere and water resources</p>`],
 ['big', '−38%', `<p class="sub">August runoff in the 2050s, compared with 1991–2020</p><p class="foot">Median of 600 simulations, SSP2-4.5. 10–90% range: −49% to −27%.</p>`],
 ['', 'Why this catchment', `<ul><li>Sorne catchment: 74 km², 31% glacierised in 2020</li><li>In August, melt from the glacier supplies 62% of the river's flow</li><li>Feeds the Lac de Brenay reservoir (hydropower, head 480 m)</li><li>Irrigation for 1,900 ha of orchards and vineyards downstream</li><li>The last runoff projection for the Sorne is from 2015 and used CMIP5</li></ul>`],
 ['', 'Study area and data', `<table><tr><td>Discharge</td><td>Gauge at Pont-de-Sorne (1,480 m a.s.l.), daily, 1981–2024</td></tr><tr><td>Weather</td><td>3 AWS at 1,620 m, 2,340 m and 2,910 m: T and P, daily</td></tr><tr><td>Mass balance</td><td>14 stakes on the Glacier de Sorne, 2009–2024</td></tr><tr><td>Glacier outlines</td><td>1985, 2003, 2016, 2023 (orthophotos)</td></tr><tr><td>Ice thickness</td><td>GPR survey, 2018</td></tr></table>`],
 ['', 'Methods (1): melt', `<p class="eq">M = DDF · max(T − T<sub>0</sub>, 0)</p><ul><li>M: melt in mm w.e. d<sup>−1</sup>; T: daily mean air temperature of the elevation band</li><li>DDF<sub>snow</sub> = 4.1 ± 0.6 mm w.e. °C<sup>−1</sup> d<sup>−1</sup></li><li>DDF<sub>ice</sub> = 7.3 ± 0.9 mm w.e. °C<sup>−1</sup> d<sup>−1</sup></li><li>T<sub>0</sub> = 0 °C; lapse rate −5.8 °C km<sup>−1</sup>; 100 m elevation bands</li><li>Rain or snow: single threshold at 1.0 °C</li></ul><p class="foot">Degree-day approach after Hock (2003). ± is one standard deviation across the 50 retained parameter sets.</p>`],
 ['', 'Methods (2): glacier and routing', `<ul><li>Glacier geometry updated once a year with the Δh-parameterisation (Huss et al., 2010)</li><li>Melt and rain routed through two linear reservoirs:</li></ul><p class="eq">Q(t) = S<sub>fast</sub>(t) / k<sub>fast</sub> + S<sub>slow</sub>(t) / k<sub>slow</sub></p><ul><li>k<sub>fast</sub> = 2.1 d, k<sub>slow</sub> = 38 d</li><li>Evapotranspiration: Hamon, off-glacier area only</li><li>9 free parameters in all</li></ul>`],
 ['', 'Calibration and validation', `<table><tr><th>Daily discharge</th><th>Calibration 1981–2005</th><th>Validation 2006–2024</th></tr><tr><td>NSE</td><td>0.87</td><td>0.82</td></tr><tr><td>log-NSE</td><td>0.84</td><td>0.79</td></tr><tr><td>Volume bias</td><td>+1.2%</td><td>−3.4%</td></tr></table><p class="lead">Glacier mass balance, 2009–2024: RMSE 0.31 m w.e. a<sup>−1</sup> against the stakes.</p><p class="foot">Monte Carlo: 20,000 parameter sets sampled; the 50 best on a combined discharge and mass-balance score were kept.</p>`],
 ['', 'Climate forcing', `<ul><li>12 GCMs from CMIP6</li><li>3 scenarios: SSP1-2.6, SSP2-4.5, SSP5-8.5</li><li>Bias-corrected to the three stations by quantile mapping, reference 1991–2020</li><li>12 GCMs × 50 parameter sets = 600 simulations per scenario, 1,800 in all</li></ul>`],
 ['fig', 'Peak water', `${runoffChart()}<p class="cap">Figure 2. Annual runoff at Pont-de-Sorne, 1981–2060, SSP2-4.5. Line: median. Band: 10–90% range of 600 simulations. Dashed line: peak water, around 2019 (range 2012–2027). Grey line: end of observations.</p>`],
 ['', 'August runoff, change from 1991–2020', `<table><tr><th>Scenario</th><th>2031–2040</th><th>2051–2060</th></tr><tr><td>SSP1-2.6</td><td>−14% [−22, −6]</td><td>−29% [−41, −18]</td></tr><tr><td>SSP2-4.5</td><td>−17% [−26, −8]</td><td>−38% [−49, −27]</td></tr><tr><td>SSP5-8.5</td><td>−19% [−30, −9]</td><td>−47% [−60, −35]</td></tr></table><p class="foot">Median [10th, 90th percentile] of 600 simulations per scenario.</p>`],
 ['', 'The year as a whole changes much less', `<ul><li>Annual runoff: −9% by the 2050s (SSP2-4.5, median)</li><li>April–June runoff: +21%</li><li>Snow melts about three weeks earlier, and more winter precipitation falls as rain</li><li>The month of highest flow moves from July to June</li></ul><p class="lead">The water does not disappear. It arrives earlier.</p>`],
 ['', 'The glacier itself', `<table><tr><th></th><th>2020</th><th>2060 (SSP2-4.5, median)</th></tr><tr><td>Area</td><td>22.9 km²</td><td>11.6 km²</td></tr><tr><td>Ice volume</td><td>0.71 km³</td><td>0.24 km³</td></tr></table><p class="lead">Two thirds of the ice volume is gone by 2060. Under SSP5-8.5: 0.15 km³ left.</p>`],
 ['fig', 'Where the spread comes from', `${varianceChart()}<p class="cap">Figure 4. Share of the variance in August runoff, 2051–2060 (ANOVA). GCM: 46%. Scenario: 31%. Hydrological model parameters: 17%. Internal variability: 6%.</p>`],
 ['', 'What it means for Lac de Brenay', `<ul><li>July–September inflow: 41 hm³ today (1991–2020 mean)</li><li>2051–2060: 29 hm³ (SSP2-4.5, median)</li><li>Spring inflow rises, but the reservoir is usually full by mid-June and spills</li></ul><p class="foot">1 hm³ = 1 million m³. Inflow computed at the dam, 9 km downstream of the gauge.</p>`],
 ['', 'Sensitivity', `<table><tr><th>What was varied</th><th>August 2051–2060, SSP2-4.5</th></tr><tr><td>DDF<sub>ice</sub> ± 1 standard deviation</td><td>−34% to −42%</td></tr><tr><td>Lapse rate −5.3 to −6.3 °C km<sup>−1</sup></td><td>−36% to −40%</td></tr><tr><td>Rain/snow threshold 0 to 2 °C</td><td>−37% to −39%</td></tr></table>`],
 ['', 'Limitations', `<ul><li>No debris cover: 12% of the ablation area is debris-covered today, and debris slows melt</li><li>Degree-day factors are held constant to 2060</li><li>No contribution from permafrost or rock glaciers</li><li>Quantile mapping assumes model biases stay the same in a warmer climate</li><li>One catchment: do not scale these numbers to the whole canton</li></ul>`],
 ['', 'Conclusions', `<ul><li>Peak water in the Sorne is behind us (around 2019)</li><li>August runoff falls by about a third by the 2050s under a middle scenario</li><li>The annual total barely moves: the question is storage and timing, not scarcity</li></ul>`],
 ['', 'Code, data, funding', `<ul><li>Model code: git.valmont.example/hydro/sorne-runoff (MIT licence)</li><li>Station and stake data: on request from the Canton's water office</li><li>Preprint under review at the Journal of Alpine Hydrology</li><li>Funded by the Fonds Valmont pour la recherche alpine, grant 21-0457</li></ul>`],
 ['refs', 'References', `<ul><li>Hock, R. (2003). Temperature index melt modelling in mountain areas. Journal of Hydrology, 282, 104–115.</li><li>Huss, M., Jouvet, G., Farinotti, D., Bauder, A. (2010). Future high-mountain hydrology: a new parameterization of glacier retreat. Hydrology and Earth System Sciences, 14, 815–829.</li><li>Nash, J. E., Sutcliffe, J. V. (1970). River flow forecasting through conceptual models, part I. Journal of Hydrology, 10, 282–290.</li><li>O'Neill, B. C., et al. (2016). The Scenario Model Intercomparison Project (ScenarioMIP) for CMIP6. Geoscientific Model Development, 9, 3461–3482.</li></ul>`],
 ['title', 'Thank you', `<p class="sub">lea.montandon@valmont.example</p>`],
];
const html = `<style>
@page{size:1280px 720px;margin:0} *{box-sizing:border-box} body{margin:0;font-family:Helvetica,Arial,sans-serif;color:#16222c}
section{width:1280px;height:720px;padding:64px 90px;page-break-after:always;position:relative;border-left:16px solid #134b73;background:#fbfcfd}
h1{font-size:50px;margin:0 0 34px} .title h1{font-size:84px;margin-top:140px} .big h1{font-size:230px;margin:50px 0 10px;color:#134b73}
ul{font-size:30px;line-height:1.45;padding-left:34px} li{margin-bottom:12px} .lead{font-size:33px;line-height:1.4} .sub{font-size:40px;margin:0}
.eq{font-size:44px;font-family:Georgia,serif;font-style:italic;margin:6px 0 26px 40px} .cap{font-size:24px;line-height:1.4;color:#334;margin-top:14px} .refs ul{font-size:22px}
.foot{font-size:23px;color:#566;position:absolute;bottom:52px;left:90px;right:90px} table{font-size:30px;border-collapse:collapse;width:100%;margin-bottom:26px}
td,th{padding:13px 12px;border-bottom:2px solid #d5dde3;text-align:left} .n{position:absolute;right:40px;bottom:22px;font-size:18px;color:#889}
</style>` + slides.map(([c, h, b], i) => `<section class="${c}"><h1>${h}</h1>${b}<span class="n">${i + 1}</span></section>`).join('');
const b = await chromium.launch(); const p = await b.newPage(); await p.setContent(html);
await p.pdf({ path: out, width: '1280px', height: '720px', printBackground: true }); await b.close();
