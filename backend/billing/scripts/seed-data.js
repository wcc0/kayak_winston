const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const BASE_URL = 'http://localhost:8086/api';

// Sample data
const users = [
  '123-45-6789',
  '987-65-4321',
  '456-78-9012',
  '321-54-9876',
  '789-01-2345'
];

const bookingTypes = ['flight', 'hotel', 'car'];
const paymentMethods = ['credit_card', 'debit_card', 'paypal', 'stripe'];

// Generate random billing data
function generateBilling() {
  const user_id = users[Math.floor(Math.random() * users.length)];
  const booking_type = bookingTypes[Math.floor(Math.random() * bookingTypes.length)];
  const payment_method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
  
  let total_amount;
  if (booking_type === 'flight') {
    total_amount = Math.floor(Math.random() * 1000) + 200; // $200-$1200
  } else if (booking_type === 'hotel') {
    total_amount = Math.floor(Math.random() * 500) + 100; // $100-$600
  } else {
    total_amount = Math.floor(Math.random() * 300) + 50; // $50-$350
  }
  
  return {
    user_id,
    booking_type,
    booking_id: uuidv4(),
    total_amount,
    payment_method
  };
}

// Create billings
async function seedBillings(count = 20) {
  console.log(`🌱 Seeding ${count} billing records...`);
  
  const billings = [];
  
  for (let i = 0; i < count; i++) {
    try {
      const billingData = generateBilling();
      
      const response = await axios.post(`${BASE_URL}/billing`, billingData);
      
      if (response.data.success) {
        billings.push(response.data.data);
        console.log(`✅ Created billing ${i + 1}/${count}: ${response.data.data.billing_id}`);
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ Error creating billing ${i + 1}:`, error.message);
    }
  }
  
  console.log(`\n✅ Created ${billings.length} billings successfully!`);
  return billings;
}

// Process payments for some billings
async function processPayments(billings) {
  console.log(`\n💳 Processing payments for ${Math.floor(billings.length * 0.7)} billings...`);
  
  // Process 70% of billings
  const billingsToProcess = billings.slice(0, Math.floor(billings.length * 0.7));
  
  for (let i = 0; i < billingsToProcess.length; i++) {
    try {
      const billing = billingsToProcess[i];
      
      const paymentData = {
        billing_id: billing.billing_id,
        payment_details: {
          amount: parseFloat(billing.total_amount),
          payment_method: billing.payment_method,
          card_details: {
            number: '4111111111111111',
            expiry: '12/26',
            cvv: '123',
            holder_name: 'Test User'
          }
        }
      };
      
      const response = await axios.post(`${BASE_URL}/payment/process`, paymentData);
      
      if (response.data.success) {
        console.log(`✅ Processed payment ${i + 1}/${billingsToProcess.length}: ${billing.billing_id}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ Error processing payment ${i + 1}:`, error.response?.data?.message || error.message);
    }
  }
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting data seeding...\n');
    
    // Create billings
    const billings = await seedBillings(100);
    
    // Process payments
    await processPayments(billings);
    
    console.log('\n🎉 Data seeding completed!');
    console.log('\n📊 Summary:');
    console.log(`   Total billings created: ${billings.length}`);
    console.log(`   Payments processed: ${Math.floor(billings.length * 0.7)}`);
    console.log(`   Pending payments: ${Math.ceil(billings.length * 0.3)}`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
  }
}

// Run the script
main();