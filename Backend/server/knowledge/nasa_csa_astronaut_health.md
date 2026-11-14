## [NASA HRP — 5 Hazards of Human Spaceflight]
NASA's Human Research Program identifies five primary hazards of human spaceflight that compound one another:
1. Space Radiation: Invisible, stealthy ionizing radiation beyond Earth's magnetic field; one of the most hazardous aspects of deep spaceflight.
2. Isolation and Confinement: Psychological and behavioral stress among crews living in small enclosed habitats for months or years.
3. Distance from Earth: Mars is ~140 million miles away (~3-year round trip vs. 3-day lunar trip), creating communication delays (up to 22 minutes each way, 44+ minutes round trip), resupply limits, and requiring autonomous onboard medical care.
4. Gravity Fields: Transitioning between microgravity (ISS), 1/6G (Moon), 3/8G (Mars), and 1G stresses bones, muscles, the inner ear (vestibular system), and cardiovascular function.
5. Hostile/Closed Environments: Spacecraft ecosystems require strict control of temperature, cabin pressure, O2/CO2, lighting, noise, and microbial communities that affect crew immunity.

## [NASA HRP — Space Radiation & Cancer Risks]
Space radiation exposure increases lifetime risk of radiation-induced cancers and acute tissue/DNA damage. Mitigation requires real-time dosimetry, water-wall/polyethylene storm shelters during Solar Particle Events (SPE), and continuous telemetry tracking.

## [NASA HRP — Physiological & Medical Risks]
- Cardiovascular Adaptations: Weightlessness shifts bodily fluids toward the head and alters blood circulation and blood vessel function.
- Spaceflight Associated Neuro-ocular Syndrome (SANS): Elevated intracranial fluid pressure in microgravity alters eye and brain structure.
- Spaceflight-Induced Bone & Muscle Loss: Without gravity, bones demineralize and weaken; countermeasures include daily exercise, targeted nutrition, and medication.
- Altered Immune System & Microbes: Spaceflight stress can reactivate latent viruses (causing skin rashes/symptoms) while altering skin and gut microbiomes.
- Decompression Sickness & Hypoxia: Moving from spacecraft pressure to lower-pressure EVA spacesuits risks nitrogen bubble formation ("the bends") and mild tissue hypoxia if pre-breathe oxygen protocols are not followed.
- Sensorimotor, Sleep & Behavioral Risks: Gravity transitions cause motion sickness and spatial disorientation; circadian disruption causes chronic sleep loss and cognitive fatigue.

## [NASA HRP — Ongoing Research & Artemis II Countermeasures]
- Artemis II Deep-Space Studies: ARCHeR uses wrist actigraphy to track astronaut sleep, activity, and behavioral health beyond Low Earth Orbit; Immune Biomarkers tracks blood and saliva samples for deep-space radiation and immune changes.
- Countermeasures on ISS: Daily B-Complex vitamin supplementation and Food Physiology diets help mitigate SANS eye/brain changes; Thigh Cuffs keep bodily fluids in the lower body to reduce headward fluid shift; Tempus Pro enables near real-time telemedicine diagnostics on board.

## [CSA — Monitoring Neutron Radiation for Astronaut Health (2026)]
Neutron radiation accounts for roughly 30% of total radiation exposure on the International Space Station (ISS) and causes severe biological damage requiring specialized shielding. The Canadian Space Agency (CSA) awarded $5.5M to Bubble Technology Industries to develop the Canadian Active Neutron Spectrometer (CANS), succeeding ISS bubble detectors (MOSFET, EVARM, Radi-N, Radi-N2) to continuously and autonomously measure neutron radiation for Moon and Mars missions.

## [CSA — Why We Conduct Space Science & Accelerated Aging]
Extended missions to the Moon and Mars increase radiation exposure, communication delays, and reliance on onboard medical autonomy rather than Earth evacuation. Six months in weightlessness produces physiological changes similar to years of aging or sedentary deconditioning on Earth, including bone density loss, cardiovascular deconditioning, balance/vestibular issues, and Type-2 diabetes insulin resistance markers.

## [RCPT — Tri-Node Biometric Telemetry Network]
The hardware architecture distributes continuous physiological sensing across three ergonomic wearable nodes:
1. Head Node (Fabric Headband): Measures dry Ag/AgCl comb-electrode EEG, focusing on alpha (8–12 Hz) and beta (13–30 Hz) bands to evaluate cognitive load, alertness, and early neurological fatigue. Features a Cortex-M4 microcontroller and BLE 5.2.
2. Chest Node (Thoracic Patch): Measures reduced-lead ECG, respiration by impedance pneumography, and Galvanic Skin Response (GSR) for stress arousal and Heart Rate Variability (HRV). Performs edge R-peak detection.
3. Wrist Node (Forearm Gauntlet Hub): Integrates optical PPG, oscillometric Blood Pressure (BP) and SpO2, plus suit barometer and thermistors. Houses a space-grade multi-core processor that aggregates head and chest data over BLE 5.2 and relays synchronized telemetry to the habitat server via UWB / Wi-Fi 6E.

## [RCPT — Compound Physiological Risk Index & Interaction Model]
The live Risk Index (R, 0 to 100) merges radiation dose, Heart Rate Variability (HRV), and sleep debt into a single, explainable health metric:
- Compounding Model: Environmental radiation and biological fatigue do not merely add; they interact multiplicatively. A sleep-deprived astronaut (high sleep debt, low HRV) exhibits diminished DNA repair capacity and elevated inflammatory cytokine release, significantly lowering the acute tolerance threshold for solar particle radiation.
- Alert Tiers:
  - Nominal (R < 30): All biometrics and background Galactic Cosmic Ray (GCR) exposure within mission limits.
  - Elevated (30 <= R < 60): Early physiological strain or moderate radiation rate (>= 250 uSv/hr); targeted rest and hydration recommended.
  - Emergency (R >= 60): Critical event (SPE flare >= 1000 uSv/hr or combined severe biological fatigue); immediate storm shelter protocol required.

## [RCPT — Organ System Strain & Physiological Twin]
The physiological twin deconstructs the unified risk index into five critical organ systems:
1. Brain / Cognitive: Derived from EEG alpha/beta power ratio and cumulative sleep debt.
2. Cardiovascular: Derived from resting heart rate, ECG rhythm stability, and RMSSD Heart Rate Variability.
3. Hematopoietic & Immune: Sensitive to ionizing radiation dose, tracking bone marrow stem cell suppression and viral reactivation risks.
4. Ocular & SANS: Tracks intracranial fluid pressure indicators, headward fluid shift, and microgravity neuro-ocular changes.
5. Pulmonary / Respiratory: Monitored via impedance pneumography respiration rate, SpO2 blood oxygen saturation, and in-suit atmospheric pressure.

## [NASA & Curiosity Rover — Mars Surface Radiation & Atmospheric Shielding]
Published data from the Mars Science Laboratory (MSL) Curiosity rover Radiation Assessment Detector (RAD) at Gale Crater provides baseline surface dosimetry:
- Annual-average surface dose: ~0.64 mSv/day for Galactic Cosmic Rays (GCR).
- Atmospheric Pressure Swing: Seasonal surface pressure swings (700 Pa to 950 Pa) increase atmospheric column density (20 g/cm²), reducing dose equivalent by ~16% (0.10 mSv/day) during atmospheric high-pressure phases.
- Cruise Comparison: Unshielded interplanetary transit (deep space cruise) exposes astronauts to ~1.8 mSv/day, confirming that planetary shadowing and Martian atmospheric mass provide crucial natural shielding.
