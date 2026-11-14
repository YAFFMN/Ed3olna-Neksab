// simulator.js — Simulates the astronaut's wearable radiation dosimeter
// The launcher (run-all.mjs) sets RCPT_API_URL when the server uses a port other than 5000.
const API_URL = process.env.RCPT_API_URL || 'http://localhost:5000/api/readings';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendReading(data, label) {
  console.log(`\n📡 Sending [${label}]:`, data);
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();

    if (!res.ok || result.error) {
      console.error(`❌ Request failed (${res.status}):`, result.error || 'Unknown error');
      return;
    }

    if (result.alert) {
      const a = result.alert;
      const title = a.protocol?.title || a.title || 'Alert';
      const severity = a.protocol?.severity || a.severity || 'ACTIVE';
      if (a.alreadyActive) {
        console.log(`🚨 ALERT ALREADY ACTIVE: ${title} (${severity}). Resolve it on the website to trigger it again.`);
      } else {
        console.log(`🚨 ALERT TRIGGERED: ${title} (${severity})`);
      }
      console.log(`📋 Protocol Steps: ${a.protocol?.action_steps || a.action_steps || 'None'}`);
    } else {
      console.log(`✅ Status Normal (Reading ID: ${result.reading?.id ?? 'N/A'})`);
    }
  } catch (err) {
    console.error('❌ Network error sending reading:', err.message);
  }
}

async function runDemoSimulation() {
  console.log('🚀 Starting Wearable Dosimeter Simulation for Commander Yassine...');

  // 1. Normal Deep-Space Background Radiation (GCR)
  await sendReading({
    astronaut_id: 1,
    radiation_rate_usv_hr: 45.2,
    cumulative_dose_msv: 12.400,
    radiation_type: 'GCR',
    heart_rate_bpm: 72,
    data_source: 'WEARABLE'
  }, 'NORMAL ORBIT');

  await sleep(2500);

  // 2. Slight Elevation (Warning threshold >= 250 uSv/hr)
  await sendReading({
    astronaut_id: 1,
    radiation_rate_usv_hr: 310.5,
    cumulative_dose_msv: 14.100,
    radiation_type: 'GCR',
    heart_rate_bpm: 88,
    data_source: 'WEARABLE'
  }, 'ELEVATED RADIATION');

  await sleep(2500);

  // 3. Sudden Solar Flare Spike (Critical threshold >= 1000 uSv/hr)
  await sendReading({
    astronaut_id: 1,
    radiation_rate_usv_hr: 1450.0,
    cumulative_dose_msv: 28.750,
    radiation_type: 'SPE',
    heart_rate_bpm: 118,
    data_source: 'WEARABLE'
  }, 'SOLAR FLARE STORM');

  console.log(`\n✨ Simulation complete! The alerts are in Habitat Link on the website (data: ${new URL(API_URL).origin}/api/dashboard/1).`);
}

runDemoSimulation();
