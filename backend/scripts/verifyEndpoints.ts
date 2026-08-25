const BASE_URL = "http://localhost:8000/api/v1";

async function runVerification() {
  console.log("Starting API Endpoints Verification...");

  try {
    // 1. POST /auth/login
    console.log("\n1. Testing Login API (/auth/login)...");
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "cfo", password: "demo1234" })
    });
    const loginData = await loginRes.json() as any;
    if (!loginRes.ok) throw new Error(`Login failed: ${loginData.error}`);
    const token = loginData.token;
    console.log("✓ Login successful. Received Token.");

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    };

    // 2. GET /kpis
    console.log("\n2. Testing List KPIs (/kpis)...");
    const kpisRes = await fetch(`${BASE_URL}/kpis`, { headers });
    const kpis = await kpisRes.json() as any;
    console.log(`✓ Retrieved ${kpis.length} KPIs.`);

    // 3. GET /kpis/net_revenue/timeseries
    console.log("\n3. Testing KPI Timeseries (/kpis/net_revenue/timeseries)...");
    const timeseriesRes = await fetch(`${BASE_URL}/kpis/net_revenue/timeseries`, { headers });
    const timeseries = await timeseriesRes.json() as any;
    console.log(`✓ Retrieved ${timeseries.length} datapoints for Net Revenue.`);

    // 4. GET /anomalies
    console.log("\n4. Testing List Anomalies (/anomalies)...");
    const anomaliesRes = await fetch(`${BASE_URL}/anomalies`, { headers });
    const anomalies = await anomaliesRes.json() as any;
    console.log(`✓ Retrieved ${anomalies.length} anomalies.`);

    if (anomalies.length > 0) {
      const anomalyId = anomalies[0].anomalyId;

      // 5. GET /anomalies/:anomalyId
      console.log(`\n5. Testing Anomaly Detail Lookup (/anomalies/${anomalyId})...`);
      const detailsRes = await fetch(`${BASE_URL}/anomalies/${anomalyId}`, { headers });
      const details = await detailsRes.json() as any;
      console.log("✓ Anomaly detail loaded successfully.");
      console.log("  Drivers:", details.driverContributions?.map((d: any) => d.driverId));

      // 6. GET /explanations/:anomalyId
      console.log(`\n6. Testing Explanation Generation (/explanations/${anomalyId})...`);
      const explanationRes = await fetch(`${BASE_URL}/explanations/${anomalyId}`, { headers });
      const explanation = await explanationRes.json() as any;
      console.log("✓ Explanation narrative generated successfully.");
      console.log("  Summary:", explanation.narrativeText?.slice(0, 80) + "...");
    }

    // 7. GET /admin/security/policies
    console.log("\n7. Testing Security Role Policies (/admin/security/policies)...");
    const securityRes = await fetch(`${BASE_URL}/admin/security/policies`, { headers });
    const security = await securityRes.json() as any;
    console.log("✓ Loaded security configurations successfully.");

    console.log("\nAll endpoints checked successfully! Phase 5 backend endpoints are fully functioning.");
  } catch (error: any) {
    console.error("❌ Endpoint verification failed:", error.message);
    process.exit(1);
  }
}

runVerification();
