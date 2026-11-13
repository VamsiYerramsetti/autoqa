[Slide 1]
Knowing the unknown
animal 
Open-set recognition for camera-trap images at new sites 
Amara Okafor, postdoctoral researcher · Computer Vision Group, University of Tellhaven
Workshop on Machine Vision for Ecology 2026 · Paper 17 
1

[Slide 2]
1 in 9 animal images at a new site show a species the model was
never trained on 
11.3% across the four held-out test sites (2,690 of 23,800 animal images). 
2

[Slide 3]
The problem 
Species classifiers are trained on a fixed list of species (a "closed set")
At a new site, an animal not on the list still gets a name from the list
In our 2025 pilot, 64% of unknown-species images got a known label with
confidence above 0.9
Volunteers then trust the label and skip the image
Checking every image by hand: about 4.2 s per image for a trained volunteer 
3

[Slide 4]
Data: TrailCam-Ostra 
Images 412,000 animal images, 2019–2025
Known species 38 (mammals and ground birds)
Camera sites 61: 52 for training, 5 for validation, 4 for testing
Test sites 23,800 animal images; 2,690 show one of 14 species not among the 38
Empty frames Removed beforehand with MegaDetector v5 
Split by site, never by image: no camera appears in two splits. 
4

[Slide 5]
Method (1): the energy score 
E(x) = −T · log Σ k exp(f k (x) / T) 
f k (x): the network's score (logit) for species k; T = 1
Low energy: looks like a known species. High energy: unknown
An image is flagged "unknown" when E(x) > τ
Backbone: ViT-B/16 with DINOv2 weights, fine-tuned on the 52 training sites 
Energy score after Liu et al. (2020). 
5

[Slide 6]
Method (2): site-aware outlier exposure 
L = L CE + λ · L OE , λ = 0.5 
L CE : the usual classification loss on the 38 known species
L OE : pushes energy up on outlier images: 31,000 iNaturalist photos of 300 species
not among the 38
Site-aware: each batch mixes outliers with known images from the same site, so
the model cannot use the background to tell them apart
Then temperature scaling, fitted on the 5 validation sites 
6

[Slide 7]
Choosing the threshold τ 
τ is set on the 5 validation sites, never on the test sites
Rule: keep 95% of known-species images (TPR = 95%)
The same τ is then used unchanged at all 4 test sites 
TPR: true positive rate, the share of known-species images accepted as known. 
7

[Slide 8]
How we measure 
Top-1: accuracy on known species only
AUROC: how well the score separates unknown from known (0.5 = chance, 1 =
perfect)
FPR@95: share of unknown animals still accepted as known, at TPR 95%. Lower
is better
ECE: expected calibration error, 15 bins: 
ECE = Σ b (n b / N) · | acc(b) − conf(b) | 
8

[Slide 9]
Main results, 4 test sites 
Method Top-1 ↑ AUROC ↑ FPR@95 ↓ ECE ↓ 
Max softmax (baseline) 91.8 ± 0.3 81.2 ± 0.9 58.4 ± 2.1 6.1 ± 0.4
Energy score 91.8 ± 0.3 84.7 ± 0.7 49.0 ± 1.8 6.1 ± 0.4
Energy + outlier exposure 91.2 ± 0.4 90.3 ± 0.6 31.5 ± 1.5 4.8 ± 0.3 
Ours 91.4 ± 0.3 92.6 ± 0.5 24.7 ± 1.2 2.3 ± 0.2 
All numbers in %. Mean ± standard deviation over 5 training seeds. 
9

[Slide 10]
Confidence you can take at its word 
Figure 3. Reliability diagram, 4 test sites. Bars: accuracy in each confidence bin (15 bins; bins with fewer
than 200 images not shown). Grey: max-softmax baseline. Blue: ours. Dashed: perfect calibration. 
10

[Slide 11]
Site by site (ours) 
Test site Animal images Unknown share AUROC 
A · lowland forest 7,900 6.2% 95.1
B · river edge 6,400 9.8% 93.4
C · upland heath 5,300 12.5% 92.0
D · conifer plantation, 81% night (IR) 4,200 21.6% 86.3 
Mean of 5 seeds. 
11

[Slide 12]
Where it still fails 
Night infrared images: AUROC 87.9, against 94.8 in daylight
Small animals filling less than 5% of the frame
41% of the unknowns still accepted as known are rodents or shrews 
A grey, blurred, small animal at night looks like every other grey, blurred, small
animal at night. 
12

[Slide 13]
Ablation (AUROC, mean of 5 seeds) 
Variant AUROC ECE 
Ours (λ = 0.5) 92.6 2.3
Without site-aware batches 90.9 2.5
Without temperature scaling 92.5 5.0
λ = 0.1 91.1 2.4
λ = 1.0 92.2 2.6 
λ = 1.0 also lowers Top-1 to 90.1%. 
13

[Slide 14]
What it means for volunteers 
Per 10,000 animal images at a new site (11.3% unknown): 
About 1,300 are flagged and go to a person
About 280 unknown animals still get a known name
Review time: about 1.5 hours, instead of 11.7 hours for all 10,000 
14

[Slide 15]
Compute 
Model size 86 M parameters (ViT-B/16)
Training 14 h on 4 × A100 GPUs, per seed
Inference 38 ms per image on one A100, batch 64
Energy score no extra cost: computed from the same logits 
15

[Slide 16]
Limitations 
Four test sites, all in one temperate country
"Unknown" means not among our 38 labels; most unknowns are close relatives of
known species
We removed outlier photos of the 14 test species, but not of their genera
τ is fixed from validation sites; it may drift with season and camera model
We flag images; we do not count individuals or estimate abundance 
16

[Slide 17]
Conclusions 
Site-aware outlier exposure: AUROC 92.6 against 81.2 for the baseline, at almost
the same Top-1
Unknowns accepted as known: from 58% to 25%
Confidence becomes honest: ECE from 6.1% to 2.3%
Night and small animals remain the hard part 
17

[Slide 18]
Code, data, funding 
Code: git.tellhaven.example/cv/unknown-animal (Apache 2.0)
TrailCam-Ostra: images on request from the Ostra Wildlife Trust; site locations
withheld to protect species
Funded by the Tellhaven Biodiversity Fund, grant BF-24-112 
18

[Slide 19]
References 
Beery, S., Morris, D., Yang, S. (2019). Efficient pipeline for camera trap image review. arXiv:1907.06772.
Guo, C., Pleiss, G., Sun, Y., Weinberger, K. Q. (2017). On calibration of modern neural networks. ICML.
Hendrycks, D., Gimpel, K. (2017). A baseline for detecting misclassified and out-of-distribution examples in neural
networks. ICLR.
Hendrycks, D., Mazeika, M., Dietterich, T. (2019). Deep anomaly detection with outlier exposure. ICLR.
Liu, W., Wang, X., Owens, J., Li, Y. (2020). Energy-based out-of-distribution detection. NeurIPS.
Oquab, M., et al. (2024). DINOv2: Learning robust visual features without supervision. TMLR. 
19

[Slide 20]
Thank you 
amara.okafor@tellhaven.example 
20