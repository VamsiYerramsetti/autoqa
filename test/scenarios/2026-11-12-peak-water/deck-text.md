[Slide 1]
Peak water has passed 
Summer runoff from the Sorne glacier catchment to 2060 
Léa Montandon, PhD candidate · Institute for Mountain Hydrology, Université de Valmont
Alpine Hydrology Meeting 2026 · Session 4B: Cryosphere and water resources 
1

[Slide 2]
−38% August runoff in the 2050s, compared with 1991–2020 
Median of 600 simulations, SSP2-4.5. 10–90% range: −49% to −27%. 
2

[Slide 3]
Why this catchment 
Sorne catchment: 74 km², 31% glacierised in 2020
In August, melt from the glacier supplies 62% of the river's flow
Feeds the Lac de Brenay reservoir (hydropower, head 480 m)
Irrigation for 1,900 ha of orchards and vineyards downstream
The last runoff projection for the Sorne is from 2015 and used CMIP5 
3

[Slide 4]
Study area and data 
Discharge Gauge at Pont-de-Sorne (1,480 m a.s.l.), daily, 1981–2024
Weather 3 AWS at 1,620 m, 2,340 m and 2,910 m: T and P, daily
Mass balance 14 stakes on the Glacier de Sorne, 2009–2024
Glacier outlines 1985, 2003, 2016, 2023 (orthophotos)
Ice thickness GPR survey, 2018 
4

[Slide 5]
Methods (1): melt 
M = DDF · max(T − T 0 , 0) 
M: melt in mm w.e. d −1 ; T: daily mean air temperature of the elevation band
DDF snow = 4.1 ± 0.6 mm w.e. °C −1 d −1 
DDF ice = 7.3 ± 0.9 mm w.e. °C −1 d −1 
T 0 = 0 °C; lapse rate −5.8 °C km −1 ; 100 m elevation bands
Rain or snow: single threshold at 1.0 °C 
Degree-day approach after Hock (2003). ± is one standard deviation across the 50 retained parameter
sets. 
5

[Slide 6]
Methods (2): glacier and routing 
Glacier geometry updated once a year with the Δh-parameterisation (Huss et
al., 2010)
Melt and rain routed through two linear reservoirs: 
Q(t) = S fast (t) / k fast + S slow (t) / k slow 
k fast = 2.1 d, k slow = 38 d
Evapotranspiration: Hamon, off-glacier area only
9 free parameters in all 
6

[Slide 7]
Calibration and validation 
Daily discharge Calibration 1981–2005 Validation 2006–2024 
NSE 0.87 0.82
log-NSE 0.84 0.79
Volume bias +1.2% −3.4% 
Glacier mass balance, 2009–2024: RMSE 0.31 m w.e. a −1 against the
stakes. 
Monte Carlo: 20,000 parameter sets sampled; the 50 best on a combined discharge and mass-balance
score were kept. 
7

[Slide 8]
Climate forcing 
12 GCMs from CMIP6
3 scenarios: SSP1-2.6, SSP2-4.5, SSP5-8.5
Bias-corrected to the three stations by quantile mapping, reference 1991–2020
12 GCMs × 50 parameter sets = 600 simulations per scenario, 1,800 in all 
8

[Slide 9]
Peak water 
Figure 2. Annual runoff at Pont-de-Sorne, 1981–2060, SSP2-4.5. Line: median. Band: 10–90% range
of 600 simulations. Dashed line: peak water, around 2019 (range 2012–2027). Grey line: end of
observations. 9

[Slide 10]
August runoff, change from 1991–2020 
Scenario 2031–2040 2051–2060 
SSP1-2.6 −14% [−22, −6] −29% [−41, −18]
SSP2-4.5 −17% [−26, −8] −38% [−49, −27]
SSP5-8.5 −19% [−30, −9] −47% [−60, −35] 
Median [10th, 90th percentile] of 600 simulations per scenario. 
10

[Slide 11]
The year as a whole changes much less 
Annual runoff: −9% by the 2050s (SSP2-4.5, median)
April–June runoff: +21%
Snow melts about three weeks earlier, and more winter precipitation falls as
rain
The month of highest flow moves from July to June 
The water does not disappear. It arrives earlier. 
11

[Slide 12]
The glacier itself 
2020 2060 (SSP2-4.5, median) 
Area 22.9 km² 11.6 km²
Ice volume 0.71 km³ 0.24 km³ 
Two thirds of the ice volume is gone by 2060. Under SSP5-8.5: 0.15 km³
left. 
12

[Slide 13]
Where the spread comes from 
Figure 4. Share of the variance in August runoff, 2051–2060 (ANOVA). GCM: 46%. Scenario: 31%.
Hydrological model parameters: 17%. Internal variability: 6%. 
13

[Slide 14]
What it means for Lac de Brenay 
July–September inflow: 41 hm³ today (1991–2020 mean)
2051–2060: 29 hm³ (SSP2-4.5, median)
Spring inflow rises, but the reservoir is usually full by mid-June and spills 
1 hm³ = 1 million m³. Inflow computed at the dam, 9 km downstream of the gauge. 
14

[Slide 15]
Sensitivity 
What was varied August 2051–2060, SSP2-4.5 
DDF ice ± 1 standard deviation −34% to −42%
Lapse rate −5.3 to −6.3 °C km −1 −36% to −40%
Rain/snow threshold 0 to 2 °C −37% to −39% 
15

[Slide 16]
Limitations 
No debris cover: 12% of the ablation area is debris-covered today, and debris
slows melt
Degree-day factors are held constant to 2060
No contribution from permafrost or rock glaciers
Quantile mapping assumes model biases stay the same in a warmer climate
One catchment: do not scale these numbers to the whole canton 
16

[Slide 17]
Conclusions 
Peak water in the Sorne is behind us (around 2019)
August runoff falls by about a third by the 2050s under a middle scenario
The annual total barely moves: the question is storage and timing, not scarcity 
17

[Slide 18]
Code, data, funding 
Model code: git.valmont.example/hydro/sorne-runoff (MIT licence)
Station and stake data: on request from the Canton's water office
Preprint under review at the Journal of Alpine Hydrology
Funded by the Fonds Valmont pour la recherche alpine, grant 21-0457 
18

[Slide 19]
References 
Hock, R. (2003). Temperature index melt modelling in mountain areas. Journal of Hydrology, 282, 104–115.
Huss, M., Jouvet, G., Farinotti, D., Bauder, A. (2010). Future high-mountain hydrology: a new
parameterization of glacier retreat. Hydrology and Earth System Sciences, 14, 815–829.
Nash, J. E., Sutcliffe, J. V. (1970). River flow forecasting through conceptual models, part I. Journal of
Hydrology, 10, 282–290.
O'Neill, B. C., et al. (2016). The Scenario Model Intercomparison Project (ScenarioMIP) for CMIP6.
Geoscientific Model Development, 9, 3461–3482. 
19

[Slide 20]
Thank you 
lea.montandon@valmont.example 
20

