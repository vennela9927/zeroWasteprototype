// Quick Database Population Script
// Run this once with: node seedData.js

const admin = require('firebase-admin');

// Initialize Firebase Admin
// NOTE: You need to download your service account key from Firebase Console
// Go to: Project Settings > Service Accounts > Generate New Private Key
// Save as serviceAccountKey.json in the frontend folder

try {
  const serviceAccount = require('./serviceAccountKey.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('❌ Error loading service account key.');
  console.error('Please download serviceAccountKey.json from Firebase Console:');
  console.error('Project Settings > Service Accounts > Generate New Private Key');
  process.exit(1);
}

const db = admin.firestore();

const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'];

const CITY_COORDS = {
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Delhi': { lat: 28.7041, lng: 77.1025 },
  'Bangalore': { lat: 12.9716, lng: 77.5946 },
  'Hyderabad': { lat: 17.3850, lng: 78.4867 },
  'Chennai': { lat: 13.0827, lng: 80.2707 },
  'Kolkata': { lat: 22.5726, lng: 88.3639 },
  'Pune': { lat: 18.5204, lng: 73.8567 },
  'Ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'Jaipur': { lat: 26.9124, lng: 75.7873 },
  'Lucknow': { lat: 26.8467, lng: 80.9462 }
};

const FOODS = [
  { name: 'Veg Biryani', type: 'cooked_rice' },
  { name: 'Dal Tadka', type: 'cooked_curry' },
  { name: 'Paneer Curry', type: 'cooked_curry' },
  { name: 'Chapati', type: 'cooked_bread' },
  { name: 'Mixed Vegetables', type: 'cooked_vegetables' },
  { name: 'Samosa', type: 'packaged_snacks' },
  { name: 'Fresh Fruits', type: 'raw_fruits' },
  { name: 'Bread Loaves', type: 'packaged_snacks' },
  { name: 'Rice Pulao', type: 'cooked_rice' },
  { name: 'Chicken Curry', type: 'cooked_meat' }
];

const DONORS = [
  'Taj Hotels', 'ITC Grand', 'Oberoi Restaurant', 'Radisson Blu', 'Marriott Hotel',
  'Hyatt Regency', 'The Leela Palace', 'JW Marriott', 'Hilton Garden', 'Crowne Plaza',
  'Novotel', 'Sheraton', 'Hotel Sahara Star', 'The Lalit', 'Fortune Hotel',
  'Lemon Tree', 'Ginger Hotel', 'Sarovar Portico', 'Park Plaza', 'Ramada'
];

const NGOS = [
  'Feeding India', 'Akshaya Patra', 'Food Bank Mumbai', 'Helping Hands Delhi',
  'Annamrita Foundation', 'Robin Hood Army', 'Goonj NGO', 'Smile Foundation',
  'CRY Foundation', 'Save the Children India'
];

function randomDate(daysAgo = 30) {
  const now = new Date();
  return new Date(now.getTime() - Math.random() * daysAgo * 24 * 60 * 60 * 1000);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedDatabase() {
  console.log('🌱 Starting database population...\n');

  const batch = db.batch();
  let batchCount = 0;
  const MAX_BATCH = 500;

  try {
    // 1. Create donors
    console.log('Creating 20 donors...');
    const donorIds = [];
    for (let i = 0; i < 20; i++) {
      const donorId = `donor_${Date.now()}_${i}`;
      const city = CITIES[i % CITIES.length];
      
      const donorRef = db.collection('users').doc(donorId);
      batch.set(donorRef, {
        uid: donorId,
        email: `${DONORS[i].toLowerCase().replace(/\s/g, '')}@example.com`,
        name: DONORS[i],
        displayName: DONORS[i],
        role: 'donor',
        type: 'restaurant',
        city: city,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        verified: Math.random() > 0.3
      });
      
      donorIds.push(donorId);
      batchCount++;
    }

    // 2. Create NGOs
    console.log('Creating 10 NGOs...');
    const ngoIds = [];
    for (let i = 0; i < 10; i++) {
      const ngoId = `ngo_${Date.now()}_${i}`;
      const city = CITIES[i % CITIES.length];
      
      const ngoRef = db.collection('users').doc(ngoId);
      batch.set(ngoRef, {
        uid: ngoId,
        email: `${NGOS[i].toLowerCase().replace(/\s/g, '')}@ngo.org`,
        name: NGOS[i],
        displayName: NGOS[i],
        role: 'recipient',
        city: city,
        capacity: randomInt(50, 250),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        verified: true
      });
      
      ngoIds.push(ngoId);
      batchCount++;
    }

    // Commit first batch
    await batch.commit();
    console.log('✅ Users created\n');

    // 3. Create food donations and claims
    console.log('Creating 100 food donations and claims...');
    
    for (let i = 0; i < 100; i++) {
      const newBatch = db.batch();
      
      const donor = DONORS[randomInt(0, DONORS.length - 1)];
      const donorId = donorIds[randomInt(0, donorIds.length - 1)];
      const food = FOODS[randomInt(0, FOODS.length - 1)];
      const city = CITIES[randomInt(0, CITIES.length - 1)];
      const coords = CITY_COORDS[city];
      
      const createdDate = randomDate(30);
      const quantity = randomInt(20, 150);
      
      // Create food item
      const foodRef = db.collection('food_items').doc();
      newBatch.set(foodRef, {
        foodName: food.name,
        name: food.name,
        foodType: food.type,
        quantity: quantity,
        quantityUnit: 'meals',
        location: `${donor}, ${city}`,
        latitude: coords.lat + (Math.random() - 0.5) * 0.1,
        longitude: coords.lng + (Math.random() - 0.5) * 0.1,
        donorId: donorId,
        donorName: donor,
        status: i < 80 ? 'requested' : 'available',
        claimed: i < 80,
        verified: Math.random() > 0.3,
        createdAt: admin.firestore.Timestamp.fromDate(createdDate),
        expiryTime: admin.firestore.Timestamp.fromDate(new Date(createdDate.getTime() + randomInt(2, 10) * 60 * 60 * 1000)),
        expiry: new Date(createdDate.getTime() + randomInt(2, 10) * 60 * 60 * 1000).toISOString()
      });
      
      // Create claim for first 80 donations
      if (i < 80) {
        const ngoId = ngoIds[randomInt(0, ngoIds.length - 1)];
        const ngoName = NGOS[randomInt(0, NGOS.length - 1)];
        const isFulfilled = i < 60; // First 60 are fulfilled
        
        const claimRef = db.collection('claims').doc();
        const claimData = {
          foodItemId: foodRef.id,
          recipientId: ngoId,
          recipientName: ngoName,
          quantity: quantity,
          foodName: food.name,
          status: isFulfilled ? 'fulfilled' : 'approved',
          requestedAt: admin.firestore.Timestamp.fromDate(createdDate),
          createdAt: admin.firestore.Timestamp.fromDate(createdDate)
        };
        
        if (isFulfilled) {
          claimData.deliveredAt = admin.firestore.Timestamp.fromDate(
            new Date(createdDate.getTime() + 3 * 60 * 60 * 1000)
          );
        }
        
        newBatch.set(claimRef, claimData);
      }
      
      await newBatch.commit();
      
      if ((i + 1) % 10 === 0) {
        console.log(`  Progress: ${i + 1}/100 donations created`);
      }
    }
    
    console.log('✅ Food donations and claims created\n');

    // 4. Create micro-donations
    console.log('Creating 30 micro-donations...');
    const microBatch = db.batch();
    for (let i = 0; i < 30; i++) {
      const amount = [5, 10, 20, 50, 100][randomInt(0, 4)];
      const donationRef = db.collection('micro_donations').doc();
      
      microBatch.set(donationRef, {
        donorName: `Donor ${i + 1}`,
        amount: amount,
        currency: 'INR',
        purpose: 'logistics',
        paymentId: `pay_${Date.now()}_${i}`,
        paymentMethod: 'upi',
        status: 'completed',
        timestamp: admin.firestore.Timestamp.fromDate(randomDate(15))
      });
    }
    await microBatch.commit();
    console.log('✅ Micro-donations created\n');

    console.log('🎉 DATABASE POPULATED SUCCESSFULLY!\n');
    console.log('Summary:');
    console.log('  ✅ 20 Donors');
    console.log('  ✅ 10 NGOs');
    console.log('  ✅ 100 Food Donations');
    console.log('  ✅ 80 Claims (60 fulfilled, 20 approved)');
    console.log('  ✅ 30 Micro-donations');
    console.log('\n📊 Refresh your Impact Dashboard to see the data!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating database:', error);
    process.exit(1);
  }
}

seedDatabase();

