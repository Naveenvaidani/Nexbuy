const http = require('http');

function testEndpoint(path, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`${label}`);
    console.log('='.repeat(80));
    
    http.get(`http://localhost:5000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(JSON.stringify(json, null, 2));
          resolve(json);
        } catch (e) {
          console.log('Raw response:', data);
          resolve(data);
        }
      });
    }).on('error', err => {
      console.error('Error:', err.message);
      reject(err);
    });
  });
}

async function runTests() {
  console.log('\n🔍 TESTING NEXBUY AGGREGATED SEARCH\n');
  
  try {
    // Test 1: Health check
    await testEndpoint('/api/health', 'Test 1: Health Check');
    
    // Test 2: Aggregated search - phones
    await testEndpoint('/api/products/search/aggregate?q=phone&limit=10', 
      'Test 2: Aggregated Search - Phones (all providers)');
    
    // Test 3: Aggregated search - laptop with specific providers
    await testEndpoint('/api/products/search/aggregate?q=laptop&providers=amazon,flipkart,myntra&limit=8', 
      'Test 3: Aggregated Search - Laptops (amazon, flipkart, myntra)');
    
    // Test 4: Aggregated search with brand filter
    await testEndpoint('/api/products/search/aggregate?q=phone&brands=Apple,Samsung&sortBy=price_low&limit=12', 
      'Test 4: Aggregated Search - Phones by Apple/Samsung sorted by price');
    
    // Test 5: All providers search
    await testEndpoint('/api/products/search/aggregate?q=watch&providers=amazon,flipkart,snapdeal,myntra,ajio,tatacliq&limit=15', 
      'Test 5: Aggregated Search - Watches (all 6 providers)');
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL TESTS COMPLETED');
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
