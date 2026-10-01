const { initializeApp, getApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();

const db = getFirestore(getApp(), "tape-garden-db");

async function seed() {
  try {
    const purchaseRef = db.collection('purchases').doc();
    const mockPurchase = {
      id: purchaseRef.id,
      buyerId: "EJJISAENOGeJXeT5HCPQgm11rCp2",
      producerId: "erCFxKg5CNeuxf8m3VE6NWpWx523",
      producerName: "Test Producer",
      itemType: "beat",
      itemId: "test-beat-789",
      itemName: "Awesome Beat",
      licenseType: "non-exclusive",
      price: 2999, // $29.99
      platformFee: 299, // $2.99
      producerPayout: 2699, // $26.99
      stripeSessionId: "cs_test_abc123",
      status: "completed",
      createdAt: FieldValue.serverTimestamp()
    };

    await purchaseRef.set(mockPurchase);
    console.log(`Successfully seeded purchase: ${purchaseRef.id}`);

    // Give the cloud function a second to process
    setTimeout(() => process.exit(0), 1000);
  } catch (err) {
    console.error("Error seeding purchase:", err);
    process.exit(1);
  }
}

seed();