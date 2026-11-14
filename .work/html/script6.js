/* Orion data: named regions, landing sites, shielding options.
   Coordinates: latitude north +, longitude EAST in -180..180 (Tharsis on the left, Arabia in the middle, Elysium on the right).
   Notes are rounded published facts; hazards are planning-level text, not medical advice. Edit freely. */
window.ORION_DATA = {
  /* Terrain features used to build the stylised elevation model (km relative to the datum). g = Gaussian bump. */
  features: [
    {lat:0,lon:-105,amp:5.2,sig:1500},                       // Tharsis rise
    {lat:18.65,lon:-133.8,amp:21.8,sig:165},                 // Olympus Mons
    {lat:-8.4,lon:-120.1,amp:10,sig:150},                  // Arsia Mons
    {lat:0.8,lon:-113.0,amp:9.5,sig:135},                     // Pavonis Mons
    {lat:11.8,lon:-104.5,amp:13.6,sig:150},                  // Ascraeus Mons
    {lat:40.5,lon:-109.6,amp:3.2,sig:300},                   // Alba Mons
    {lat:25,lon:147,amp:2.4,sig:900},                        // Elysium rise
    {lat:25,lon:147.2,amp:10.5,sig:120},                     // Elysium Mons
    {lat:32.2,lon:150.2,amp:2.8,sig:90},                     // Hecates Tholus
    {lat:18.6,lon:150.2,amp:2.4,sig:80},                     // Albor Tholus
    {lat:-9.3,lon:174.4,amp:3.4,sig:100},                    // Apollinaris Mons
    {lat:8.4,lon:69.5,amp:1.9,sig:600},                      // Syrtis Major plateau
    {lat:-21.4,lon:106.5,amp:1.4,sig:220},                   // Tyrrhena Mons
    {lat:-42.7,lon:70,amp:-9.8,sig:520},                     // Hellas basin
    {lat:-49.7,lon:-44.3,amp:-6.5,sig:350},                  // Argyre basin
    {lat:12.9,lon:87,amp:-6.2,sig:330},                      // Isidis basin
    {lat:46.7,lon:117.5,amp:-1.0,sig:900},                   // Utopia Planitia
    {lat:48,lon:-22,amp:-1.8,sig:800},                       // Acidalia Planitia
    {lat:28,lon:-40,amp:-2.4,sig:600},                       // Chryse Planitia
    {lat:24.8,lon:-164,amp:-1.8,sig:700},                    // Amazonis Planitia
    {lat:-5,lon:140,amp:-3.4,sig:700},
    {lat:-5.4,lon:137.8,amp:-2.4,sig:50},                    // Gale crater
    {lat:22,lon:75,amp:2.2,sig:350},                        // Nili Fossae highlands
    {lat:18.4,lon:77.5,amp:-1.0,sig:32}                      // Jezero crater
  ],
  /* Highland-lowland boundary latitude by longitude (control points, cosine-interpolated) */
  dichotomy: [[-180,28],[-135,48],[-100,40],[-70,22],[-40,8],[-15,28],[0,40],[30,32],[55,12],[80,6],[110,5],[150,3],[180,28]],
  /* Valles Marineris: polyline of the canyon axis, depth in km, width sigma in km */
  valles: {pts:[[-7,-103],[-11,-86],[-13,-68],[-12,-47]], depth:7, sig:105},

  regions: [
    {n:'Olympus Mons',lat:18.65,lon:-133.8,r:380,sci:1.2,terrain:2,dust:1,tube:1,
      env:'The tallest known volcano in the solar system: about 22 km high and roughly 600 km wide. Its summit sits above almost all of the thin atmosphere. Overall slopes are gentle, but a cliff several kilometres high rings its base.',
      watch:'Least atmosphere overhead means the highest cosmic-ray dose on the planet. Air is under 1 mbar and nights are very cold. The encircling cliff is a serious obstacle on foot or by rover.'},
    {n:'Ascraeus Mons',lat:11.8,lon:-104.5,r:320,sci:1.1,terrain:2,dust:1,tube:1,
      env:'One of the three Tharsis Montes, giant shield volcanoes about 14 to 18 km high. Lava channels and collapsed lava tubes mark its flanks.',
      watch:'High elevation, so thin air shielding and strong cosmic-ray dose. Possible lava tubes could offer natural shelter but need a survey first.'},
    {n:'Pavonis Mons',lat:0.8,lon:-113,r:280,sci:1.2,terrain:2,dust:1,tube:1,
      env:'The middle Tharsis volcano, sitting almost on the equator. Pit-like openings on and near it are thought to lead into lava tubes, so it is a candidate for natural radiation shelters.',
      watch:'High elevation means little atmospheric shielding. Roof stability inside lava tubes is unknown, so treat any cave as unverified.'},
    {n:'Arsia Mons',lat:-8.4,lon:-120.1,r:320,sci:1.1,terrain:2,dust:1,tube:1,
      env:'The southernmost Tharsis volcano, with a very wide caldera and signs of lava tubes and past glaciers on its flanks.',
      watch:'Thin air and a strong cosmic-ray dose at this height. Dust haze is common around Tharsis.'},
    {n:'Alba Mons',lat:40.5,lon:-109.6,r:450,sci:1.0,terrain:1,dust:1,tube:1,
      env:'A very broad, low-slope volcano, among the widest on Mars, with a gentle profile and lava channels on its flanks.',
      watch:'Moderate elevation. Mid-latitude cold, with a chance of shallow ice nearby.'},
    {n:'Valles Marineris',pts:[[-11,-88,700],[-12,-62,600]],sci:1.5,terrain:3,dust:2,
      env:'A canyon system about 4,000 km long and up to roughly 7 km deep, around ten times the length of the Grand Canyon. Walls expose layered rock and hydrated minerals that record the planet\'s water history.',
      watch:'Steep walls and landslide deposits make landing and EVA risky, and canyon walls can block radio line of sight. The deep floor has more air overhead, so its cosmic-ray dose is lower than the highlands.'},
    {n:'Noctis Labyrinthus',lat:-7,lon:-100,r:350,sci:1.3,terrain:3,dust:1,
      env:'A maze of steep-sided valleys at the western end of Valles Marineris, thought to have formed as the ground collapsed.',
      watch:'Fractured, steep terrain with unstable slopes. Rough ground makes rover travel slow and risky.'},
    {n:'Hellas Planitia',lat:-42.7,lon:70,r:1050,sci:1.0,terrain:1,dust:3,
      env:'A giant impact basin about 2,300 km across and some 7 to 8 km deep, the lowest large region on Mars. It has the thickest air overhead on the planet, so pressure and temperature are a little higher here than elsewhere.',
      watch:'The lowest cosmic-ray dose on the planet, but Hellas is a known starting region for large dust storms. Frost can form on the floor in winter.'},
    {n:'Argyre Planitia',lat:-49.7,lon:-44.3,r:800,sci:1.2,terrain:1,dust:2,
      env:'A roughly 1,800 km impact basin in the cold southern highlands. Landforms suggest ancient glaciers and lakes once filled or surrounded it.',
      watch:'Cold at this latitude, with a dust-storm start region. Lower floor gives moderately reduced radiation.'},
    {n:'Isidis Planitia',lat:12.9,lon:87,r:650,sci:1.2,terrain:1,dust:1,
      env:'A large, flat impact basin on the boundary between the southern highlands and northern plains, about 1,500 km across. Good for landing, and close to ancient rocks that interest geologists.',
      watch:'Low elevation reduces radiation. The Beagle 2 lander was lost near here in 2003.'},
    {n:'Jezero Crater',lat:18.4,lon:77.5,r:170,sci:1.8,terrain:2,dust:1,
      env:'A crater about 45 km wide holding a clear ancient river delta. The Perseverance rover landed here in 2021 and is collecting rock samples for possible signs of past microbial life.',
      watch:'Boulder fields and rough ground make the surface tricky. Low elevation gives modest radiation; dust and perchlorates apply as everywhere.'},
    {n:'Syrtis Major',lat:8.4,lon:69.5,r:700,sci:1.2,terrain:1,dust:1,tube:1,
      env:'A dark volcanic plateau. Strong winds keep it relatively free of bright dust, so it looks dark from Earth.',
      watch:'Windy, with blowing dust. Moderate elevation.'},
    {n:'Gale Crater',lat:-5.4,lon:137.8,r:190,sci:1.7,terrain:2,dust:1,
      env:'A crater about 154 km wide with a layered mound, Mount Sharp, rising roughly 5 km from the floor. The Curiosity rover has been climbing it since 2012, reading clay and sulfate layers.',
      watch:'Curiosity measured about 0.64 mSv per day of radiation here. This is the anchor for the model on the map. Slopes on the mound and sand ripples limit travel.'},
    {n:'Gusev Crater',lat:-14.6,lon:175.5,r:150,sci:1.4,terrain:1,dust:2,
      env:'A crater about 160 km wide with an outflowing channel. The Spirit rover explored volcanic plains and found signs of past water.',
      watch:'Dust devils are common here, a known dust hazard for solar power and equipment.'},
    {n:'Meridiani Planum',lat:-2,lon:-5.5,r:450,sci:1.3,terrain:1,dust:2,
      env:'A very flat plain rich in hematite, where the Opportunity rover found evidence of past water. One of the easiest places on Mars to land.',
      watch:'Fine dust: Opportunity\'s mission ended in 2018 after a global dust storm cut its solar power. Plan for storm season.'},
    {n:'Chryse Planitia',lat:28,lon:-40,r:700,sci:1.3,terrain:1,dust:1,
      env:'A low plain where giant ancient floods from the outflow channels emptied. Viking 1 and Mars Pathfinder both landed here.',
      watch:'Low elevation gives a lower radiation dose. Scattered boulders from the ancient floods.'},
    {n:'Utopia Planitia',pts:[[46.7,117.5,950],[25.1,109.9,500]],sci:1.2,terrain:1,dust:1,
      env:'A vast northern plain and the largest recognised impact basin region. Viking 2 and China\'s Zhurong rover landed here. Radar and craters suggest buried ice at higher latitudes.',
      watch:'Low and flat, so a modest radiation dose and easy landing. Cold at higher latitudes, with possible shallow ice.'},
    {n:'Arcadia Planitia',lat:47,lon:-168,r:750,sci:1.3,terrain:1,dust:1,
      env:'A smooth mid-northern plain often proposed as a human landing region because shallow ice is thought to lie within a metre or so of the surface. Water access is a major plus.',
      watch:'Cold, with strong seasonal frost. Moderate elevation. Ice near the surface also means mud and ground-collapse risk near ice-rich patches.'},
    {n:'Acidalia Planitia',lat:48,lon:-22,r:800,sci:1.1,terrain:1,dust:1,
      env:'A broad, dark, low plain in the far north. It is low, flat and smooth, one of the lowest-elevation lands around.',
      watch:'Cold and low: good radiation shielding from the thick air above, but high latitude winter is severe.'},
    {n:'Elysium Mons',lat:25,lon:147.2,r:500,sci:1.2,terrain:2,dust:1,tube:1,
      env:'A 14 km volcano and the heart of the Elysium volcanic province, with long lava channels and collapse features.',
      watch:'High elevation, so thin air shielding. Marsquakes recorded in the region mean lava or fault hazards cannot be ruled out.'},
    {n:'Elysium Planitia',lat:4.5,lon:135.6,r:600,sci:1.2,terrain:1,dust:1,
      env:'A flat equatorial plain. NASA\'s InSight lander sat here from 2018 and recorded hundreds of marsquakes, many from the Cerberus Fossae fractures to the east.',
      watch:'Flat and easy to land on, but the region is seismically active. Dust accumulation on solar panels ended InSight\'s mission in 2022.'},
    {n:'Arabia Terra',lat:20,lon:10,r:1200,sci:1.1,terrain:2,dust:3,
      env:'A large, heavily cratered and dust-covered region on the dichotomy boundary, with eroded craters and layered deposits.',
      watch:'Dust-covered ground raises dust hazards and clogs hardware. Cratered ground slows travel.'},
    {n:'Amazonis Planitia',lat:24.8,lon:-164,r:700,sci:1.0,terrain:1,dust:3,
      env:'A smooth, dusty plain of young lava flows west of the Tharsis volcanoes.',
      watch:'Very dusty. Smooth ground is good for rovers, but dust and low thermal inertia make big temperature swings.'},
    {n:'Terra Sirenum',lat:-40,lon:-150,r:900,sci:1.1,terrain:2,dust:1,
      env:'Part of the ancient cratered southern highlands. Orbiters found strong patches of magnetised crust here, relics of a global magnetic field that died long ago.',
      watch:'Local crustal magnetic fields are patchy and weak; they should not be counted on as radiation shielding. Heavily cratered and cold.'},
    {n:'Vastitas Borealis',lat:68,lon:-126,r:800,sci:1.4,terrain:1,dust:1,
      env:'The far-northern plain where NASA\'s Phoenix lander touched down in 2008. Phoenix dug into the soil and found water ice just below the surface and perchlorate salts.',
      watch:'Very cold with long polar winters. Ice access is excellent. The soil contains perchlorates, which are toxic if inhaled or swallowed.'},
    {n:'North Polar Cap (Planum Boreum)',lat:86,lon:0,r:700,sci:1.2,terrain:2,dust:1,
      env:'A thick layered ice cap, largely water ice, covered in winter by a seasonal layer of carbon-dioxide frost.',
      watch:'Extreme cold, months of polar darkness and deep seasonal frost. Plenty of water ice, but very hard to power and keep warm.'},
    {n:'South Polar Cap (Planum Australe)',lat:-87,lon:0,r:700,sci:1.2,terrain:2,dust:1,
      env:'A layered ice cap with a permanent carbon-dioxide ice veneer. It sits on a high plateau, a few kilometres above the datum.',
      watch:'Extreme cold and months of darkness. High plateau means thinner shielding than the northern pole.'}
  ],

  sites: [
    {n:'Viking 1',lat:22.3,lon:-48,y:1976,s:'landed'},
    {n:'Viking 2',lat:47.6,lon:134.3 - 360 + 360 - 0, y:1976,s:'landed',fix:225.7},
    {n:'Mars Pathfinder',lat:19.1,lon:-33.2,y:1997,s:'landed'},
    {n:'Spirit',lat:-14.6,lon:175.5,y:2004,s:'landed'},
    {n:'Opportunity',lat:-1.9,lon:-5.5,y:2004,s:'landed'},
    {n:'Phoenix',lat:68.2,lon:-125.7,y:2008,s:'landed'},
    {n:'Curiosity',lat:-4.6,lon:137.4,y:2012,s:'landed'},
    {n:'InSight',lat:4.5,lon:135.6,y:2018,s:'landed'},
    {n:'Perseverance',lat:18.4,lon:77.5,y:2021,s:'landed'},
    {n:'Zhurong',lat:25.1,lon:109.9,y:2021,s:'landed'},
    {n:'Beagle 2',lat:11.5,lon:90.4,y:2003,s:'lost'},
    {n:'Mars Polar Lander',lat:-76,lon:-165,y:1999,s:'lost'}
  ],

  /* Assumed shielding multipliers on cosmic-ray dose for time spent indoors (illustrative, not engineering values) */
  shields: [
    {id:'hab',n:'Standard habitat',f:0.7,note:'Light structure: removes some secondary particles.'},
    {id:'reg',n:'Regolith-covered habitat',f:0.45,note:'About a metre or two of soil piled on top.'},
    {id:'tube',n:'Lava-tube shelter',f:0.3,note:'Natural rock roof. Only available at volcanic regions, and unverified in real life.',volcanic:true}
  ]
};
// Viking 2 longitude fix (225.7 E = -134.3)
window.ORION_DATA.sites.forEach(function(s){ if(s.fix!=null) s.lon = s.fix>180 ? s.fix-360 : s.fix; });
