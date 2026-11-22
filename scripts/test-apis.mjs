import { spawn } from 'node:child_process';

const PORT = 3100 + Math.floor(Math.random() * 90);
const BASE_URL = `http://127.0.0.1:${PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/aqi?city=New+Delhi&simulate=severe`);
      if (res.ok) return true;
    } catch {
      // server not ready yet
    }
    await sleep(500);
  }
  throw new Error('Timed out waiting for Next.js server on port ' + PORT);
}

async function testAqi(label, query) {
  console.log(`\n=== /api/aqi (${label}) ===`);
  const res = await fetch(`${BASE_URL}/api/aqi?${query}`, { cache: 'no-store' });
  const data = await res.json();
  console.log(`HTTP Status: ${res.status}`);
  console.log(`AQI: ${data.aqi} (${data.category}) | Source: ${data.source}`);
  console.log(`Station: ${data.stationName} (id=${data.debug?.stationId ?? 'n/a'})`);
  console.log(
    `Debug: source=${data.debug?.source} | upstreamStatus=${data.debug?.upstreamStatus} | fallbackReason=${data.debug?.fallbackReason}`
  );
  console.log('Mapped Pollutants & CPCB Sub-Indices:');
  for (const [k, v] of Object.entries(data.debug?.mappedPollutants || {})) {
    console.log(
      `  - ${k.toUpperCase()}: raw=${v.rawValue} ${v.rawUnit} -> CPCB=${v.convertedValue} ${v.cpcbUnit} (subIndex=${v.subIndex})`
    );
  }
  return data;
}

async function testRecommend(label, profile, aqiData) {
  console.log(`\n=== /api/recommend (${label}) ===`);
  const res = await fetch(`${BASE_URL}/api/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ profile, aqiData }),
  });
  const json = await res.json();
  console.log(
    `HTTP Status: ${res.status} | generatedBy: ${json.generatedBy} | attemptedModels: [${(json.debug?.attemptedModels || []).join(', ')}]`
  );
  console.log(`Debug fallbackReason: ${json.debug?.fallbackReason ?? 'none'}`);
  console.log(`Advisory Title: ${json.recommendations?.officialWarnings?.advisoryTitle}`);
  console.log(`Hero Verdict: ${json.recommendations?.heroVerdict}`);
  console.log(
    `On The Move: ${String(json.recommendations?.todaysPracticalMoves?.onTheMove || '').slice(0, 180)}...`
  );
  return json;
}

async function main() {
  const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    stdio: 'ignore',
    detached: true,
    env: { ...process.env },
  });

  try {
    await waitForServer();

    const lucknowAqi = await testAqi(
      'Station 227386 - Lucknow',
      'city=Lucknow&stationId=227386'
    );
    const hydAqi = await testAqi('Hyderabad Live', 'city=Hyderabad');
    const delhiAqi = await testAqi('New Delhi Live', 'city=New+Delhi');

    await testRecommend(
      'Profile A: New Delhi Bike + Night Shift Custom',
      {
        mode: 'personal',
        location: { city: 'New Delhi', town: 'Rohini' },
        stepOutWindows: ['Evening Rush (6–10 PM)', 'Night shift 11 PM–7 AM'],
        travelModes: ['Two-Wheeler / Bike'],
        householdMembers: ['Just Me'],
        healthSensitivities: ['Dust / Sinus Allergy'],
        homeSurroundings: ['Main Road / Heavy Traffic'],
        existingProtection: ['None (Zero-Cost Tips Only)'],
        updatedAt: new Date().toISOString(),
      },
      delhiAqi
    );

    await testRecommend(
      'Profile B: Hyderabad AC Car + Toddler Nebulizer Custom',
      {
        mode: 'personal',
        location: { city: 'Hyderabad', town: 'Jubilee Hills' },
        stepOutWindows: ['Office / College Hours (9 AM–6 PM)'],
        travelModes: ['AC Car / Cab'],
        householdMembers: ['Kids Under 10', 'Toddler with nebulizer'],
        healthSensitivities: ['Asthma / Wheezing'],
        homeSurroundings: ['Quiet Residential / Gated'],
        existingProtection: ['Air Purifier', 'Kitchen Chimney / Exhaust'],
        updatedAt: new Date().toISOString(),
      },
      hydAqi || lucknowAqi
    );
  } finally {
    if (server.pid) {
      try {
        process.kill(-server.pid, 'SIGTERM');
      } catch {
        server.kill('SIGTERM');
      }
    }
  }
}

main().catch((err) => {
  console.error('Diagnostic script failed:', err);
  process.exit(1);
});
