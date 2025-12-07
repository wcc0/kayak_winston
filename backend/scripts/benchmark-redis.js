#!/usr/bin/env node

/**
 * Redis Performance Benchmark Script
 * Tests and compares performance with and without Redis caching
 * 
 * Usage: node scripts/benchmark-redis.js
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
  baseUrl: process.env.API_URL || 'http://localhost:5001',
  iterations: 100,
  warmupIterations: 10,
  endpoints: [
    { path: '/api/admin/users?page=1&limit=10', name: 'Get Users (Page 1)' },
    { path: '/api/admin/billing?page=1&limit=10', name: 'Get Billing Records' },
    { path: '/api/admin/analytics/revenue/top-properties?year=2024', name: 'Analytics - Top Properties' },
    { path: '/api/admin/analytics/revenue/by-city?year=2024', name: 'Analytics - City Revenue' },
  ],
  token: process.env.AUTH_TOKEN || ''
};

// Results storage
const results = {
  withCache: {},
  withoutCache: {},
  summary: {}
};

/**
 * Make HTTP request and measure response time
 */
async function makeRequest(endpoint, headers = {}) {
  const start = performance.now();
  try {
    const response = await axios.get(`${CONFIG.baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${CONFIG.token}`,
        ...headers
      },
      timeout: 30000
    });
    const end = performance.now();
    return {
      success: true,
      responseTime: end - start,
      cacheStatus: response.headers['x-cache'] || 'UNKNOWN',
      statusCode: response.status
    };
  } catch (error) {
    const end = performance.now();
    return {
      success: false,
      responseTime: end - start,
      error: error.message,
      statusCode: error.response?.status || 0
    };
  }
}

/**
 * Run benchmark for a single endpoint
 */
async function benchmarkEndpoint(endpoint, name) {
  console.log(`\n📊 Benchmarking: ${name}`);
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   Iterations: ${CONFIG.iterations}`);
  
  const timings = {
    cacheHit: [],
    cacheMiss: []
  };

  // Warmup phase - populate cache
  console.log('   🔥 Warming up cache...');
  for (let i = 0; i < CONFIG.warmupIterations; i++) {
    await makeRequest(endpoint);
  }

  // Main benchmark phase
  console.log('   ⏱️  Running benchmark...');
  for (let i = 0; i < CONFIG.iterations; i++) {
    const result = await makeRequest(endpoint);
    
    if (result.success) {
      if (result.cacheStatus === 'HIT') {
        timings.cacheHit.push(result.responseTime);
      } else {
        timings.cacheMiss.push(result.responseTime);
      }
    }

    // Progress indicator
    if ((i + 1) % 20 === 0) {
      process.stdout.write(`   Progress: ${i + 1}/${CONFIG.iterations}\r`);
    }
  }

  // Calculate statistics
  const stats = calculateStats(timings);
  
  console.log(`\n   ✅ Results for ${name}:`);
  console.log(`      Cache Hits: ${timings.cacheHit.length}`);
  console.log(`      Cache Misses: ${timings.cacheMiss.length}`);
  console.log(`      Avg Response Time (Cache Hit): ${stats.avgCacheHit.toFixed(2)}ms`);
  console.log(`      Avg Response Time (Cache Miss): ${stats.avgCacheMiss.toFixed(2)}ms`);
  console.log(`      Performance Improvement: ${stats.improvement.toFixed(2)}%`);
  console.log(`      P95 (Cache Hit): ${stats.p95CacheHit.toFixed(2)}ms`);
  console.log(`      P95 (Cache Miss): ${stats.p95CacheMiss.toFixed(2)}ms`);

  return {
    name,
    endpoint,
    ...stats,
    rawTimings: timings
  };
}

/**
 * Calculate statistics from timing data
 */
function calculateStats(timings) {
  const avgCacheHit = timings.cacheHit.length > 0
    ? timings.cacheHit.reduce((a, b) => a + b, 0) / timings.cacheHit.length
    : 0;

  const avgCacheMiss = timings.cacheMiss.length > 0
    ? timings.cacheMiss.reduce((a, b) => a + b, 0) / timings.cacheMiss.length
    : 0;

  const improvement = avgCacheMiss > 0
    ? ((avgCacheMiss - avgCacheHit) / avgCacheMiss) * 100
    : 0;

  const sortedHit = [...timings.cacheHit].sort((a, b) => a - b);
  const sortedMiss = [...timings.cacheMiss].sort((a, b) => a - b);

  const p95CacheHit = sortedHit.length > 0
    ? sortedHit[Math.floor(sortedHit.length * 0.95)] || sortedHit[sortedHit.length - 1]
    : 0;

  const p95CacheMiss = sortedMiss.length > 0
    ? sortedMiss[Math.floor(sortedMiss.length * 0.95)] || sortedMiss[sortedMiss.length - 1]
    : 0;

  const minCacheHit = sortedHit.length > 0 ? sortedHit[0] : 0;
  const maxCacheHit = sortedHit.length > 0 ? sortedHit[sortedHit.length - 1] : 0;
  const minCacheMiss = sortedMiss.length > 0 ? sortedMiss[0] : 0;
  const maxCacheMiss = sortedMiss.length > 0 ? sortedMiss[sortedMiss.length - 1] : 0;

  return {
    avgCacheHit,
    avgCacheMiss,
    improvement,
    p95CacheHit,
    p95CacheMiss,
    minCacheHit,
    maxCacheHit,
    minCacheMiss,
    maxCacheMiss,
    cacheHitCount: timings.cacheHit.length,
    cacheMissCount: timings.cacheMiss.length
  };
}

/**
 * Generate performance report
 */
function generateReport(allResults) {
  console.log('\n' + '='.repeat(80));
  console.log('📈 REDIS CACHING PERFORMANCE REPORT');
  console.log('='.repeat(80));
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log(`Server: ${CONFIG.baseUrl}`);
  console.log(`Iterations per endpoint: ${CONFIG.iterations}`);
  console.log('='.repeat(80));

  // Summary table
  console.log('\n📊 SUMMARY TABLE');
  console.log('-'.repeat(80));
  console.log(
    'Endpoint'.padEnd(30) +
    'Cache Hit'.padEnd(12) +
    'Cache Miss'.padEnd(12) +
    'Improvement'.padEnd(12) +
    'Hit Rate'.padEnd(12)
  );
  console.log('-'.repeat(80));

  let totalImprovement = 0;
  let totalHitRate = 0;

  for (const result of allResults) {
    const hitRate = result.cacheHitCount / (result.cacheHitCount + result.cacheMissCount) * 100;
    totalImprovement += result.improvement;
    totalHitRate += hitRate;

    console.log(
      result.name.substring(0, 28).padEnd(30) +
      `${result.avgCacheHit.toFixed(1)}ms`.padEnd(12) +
      `${result.avgCacheMiss.toFixed(1)}ms`.padEnd(12) +
      `${result.improvement.toFixed(1)}%`.padEnd(12) +
      `${hitRate.toFixed(1)}%`.padEnd(12)
    );
  }

  console.log('-'.repeat(80));
  console.log(
    'AVERAGE'.padEnd(30) +
    ''.padEnd(12) +
    ''.padEnd(12) +
    `${(totalImprovement / allResults.length).toFixed(1)}%`.padEnd(12) +
    `${(totalHitRate / allResults.length).toFixed(1)}%`.padEnd(12)
  );

  // Detailed analysis
  console.log('\n📋 DETAILED ANALYSIS');
  console.log('-'.repeat(80));
  
  for (const result of allResults) {
    console.log(`\n${result.name}:`);
    console.log(`  • Average Cache Hit Response: ${result.avgCacheHit.toFixed(2)}ms`);
    console.log(`  • Average Cache Miss Response: ${result.avgCacheMiss.toFixed(2)}ms`);
    console.log(`  • Performance Improvement: ${result.improvement.toFixed(2)}%`);
    console.log(`  • P95 Cache Hit: ${result.p95CacheHit.toFixed(2)}ms`);
    console.log(`  • P95 Cache Miss: ${result.p95CacheMiss.toFixed(2)}ms`);
    console.log(`  • Min/Max Cache Hit: ${result.minCacheHit.toFixed(2)}ms / ${result.maxCacheHit.toFixed(2)}ms`);
    console.log(`  • Min/Max Cache Miss: ${result.minCacheMiss.toFixed(2)}ms / ${result.maxCacheMiss.toFixed(2)}ms`);
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS');
  console.log('-'.repeat(80));
  
  const avgImprovement = totalImprovement / allResults.length;
  
  if (avgImprovement > 50) {
    console.log('✅ Excellent! Redis caching is providing significant performance benefits.');
    console.log('   Consider increasing cache TTL for stable data.');
  } else if (avgImprovement > 25) {
    console.log('👍 Good. Redis caching is helping, but there\'s room for improvement.');
    console.log('   Consider caching more endpoints or optimizing cache key strategies.');
  } else {
    console.log('⚠️  Caching impact is minimal. Consider:');
    console.log('   1. Increasing cache TTL');
    console.log('   2. Caching at different layers (query level)');
    console.log('   3. Reviewing cache invalidation strategies');
  }

  console.log('\n' + '='.repeat(80));
  
  return {
    timestamp: new Date().toISOString(),
    config: CONFIG,
    results: allResults,
    summary: {
      avgImprovement: avgImprovement.toFixed(2),
      avgHitRate: (totalHitRate / allResults.length).toFixed(2)
    }
  };
}

/**
 * Main benchmark runner
 */
async function runBenchmark() {
  console.log('🚀 Starting Redis Performance Benchmark');
  console.log(`   Server: ${CONFIG.baseUrl}`);
  console.log(`   Iterations: ${CONFIG.iterations}`);
  console.log(`   Endpoints: ${CONFIG.endpoints.length}`);

  // Check server availability
  try {
    await axios.get(`${CONFIG.baseUrl}/health`, { timeout: 5000 });
    console.log('   ✅ Server is reachable');
  } catch (error) {
    console.error('   ❌ Server is not reachable. Please ensure the server is running.');
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }

  const allResults = [];

  for (const endpoint of CONFIG.endpoints) {
    const result = await benchmarkEndpoint(endpoint.path, endpoint.name);
    allResults.push(result);
  }

  const report = generateReport(allResults);

  // Save report to file
  const fs = require('fs');
  const reportPath = `./logs/benchmark-report-${Date.now()}.json`;
  
  try {
    fs.mkdirSync('./logs', { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📁 Full report saved to: ${reportPath}`);
  } catch (error) {
    console.log(`\n⚠️  Could not save report: ${error.message}`);
  }

  return report;
}

// Run if called directly
if (require.main === module) {
  runBenchmark()
    .then(() => {
      console.log('\n✅ Benchmark complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Benchmark failed:', error);
      process.exit(1);
    });
}

module.exports = { runBenchmark, benchmarkEndpoint, calculateStats };

