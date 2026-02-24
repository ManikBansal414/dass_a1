// Create Admin Account Script
// Run this script to create an admin account in MongoDB

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Admin Schema (inline to avoid circular dependencies)
const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'admin'
  }
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(' Connected to MongoDB');

    // Get admin details
    const name = await askQuestion('Admin Name (default: Admin): ') || 'Admin';
    const email = await askQuestion('Admin Email (default: admin@felicity.com): ') || 'admin@felicity.com';
    const password = await askQuestion('Admin Password (default: admin123): ') || 'admin123';

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      console.log('\n Admin with this email already exists!');
      const overwrite = await askQuestion('Do you want to update the password? (yes/no): ');
      if (overwrite.toLowerCase() === 'yes' || overwrite.toLowerCase() === 'y') {
        existingAdmin.password = await bcrypt.hash(password, 10);
        await existingAdmin.save();
        console.log('\n Admin password updated successfully!');
        console.log(`  Email: ${email}`);
        console.log(`  Password: ${password}`);
      }
    } else {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create admin
      const admin = await Admin.create({
        name,
        email,
        password: hashedPassword
      });

      console.log('\n Admin account created successfully!');
      console.log(`  Name: ${admin.name}`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Password: ${password}`);
    }

  } catch (error) {
    console.error('\n Error creating admin:', error.message);
  } finally {
    await mongoose.connection.close();
    rl.close();
  }
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Run the script
console.log('');
console.log('  Felicity Admin Account Creator');
console.log('\n');

createAdmin();
