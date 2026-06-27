import mongoose from 'mongoose';
import { config } from '../utils/config.js';
import logger from '../logger/index.js';
import Category from '../models/category.model.js';
import Item from '../models/item.model.js';

export const seedDB = async () => {
  try {
    logger.info('Seeding/Syncing categories...');
    const defaultCategories = [
      { name: 'Electronics' },
      { name: 'Computer' },
      { name: 'Accessories' },
      { name: 'Furniture' },
      { name: 'Lifestyle' }
    ];
    for (const cat of defaultCategories) {
      await Category.findOneAndUpdate(
        { name: { $regex: new RegExp(`^${cat.name.trim()}$`, 'i') } },
        cat,
        { upsert: true, new: true }
      );
    }
    logger.info('Categories seeded/synced successfully');

    logger.info('Seeding/Syncing items...');
    const defaultItems = [
      {
        name: "Aether Pro Wireless",
        sku: "item_1",
        category: "Electronics",
        brand: "Aether",
        description: "Premium wireless headphones with high-fidelity sound, active noise cancellation, and a comfortable ergonomic design.",
        price: 299.99,
        quantity: 45,
        images: []
      },
      {
        name: "Tactile Core Keyboard",
        sku: "item_2",
        category: "Computer",
        brand: "Aether",
        description: "Tactile mechanical keyboard featuring custom switches, RGB backlighting, and a solid aluminum frame.",
        price: 149.50,
        quantity: 30,
        images: []
      },
      {
        name: "Nomad Canvas Pack",
        sku: "item_3",
        category: "Accessories",
        brand: "Nomad",
        description: "Durable water-resistant canvas backpack designed for modern commuters, complete with a laptop compartment and secure pockets.",
        price: 180.00,
        quantity: 85,
        images: []
      },
      {
        name: "Ergo Posture Seat",
        sku: "item_4",
        category: "Furniture",
        brand: "Ergo",
        description: "Ergonomic office chair designed for ultimate comfort, featuring adjustable lumbar support and breathable mesh material.",
        price: 349.00,
        quantity: 12,
        images: []
      },
      {
        name: "Thermal Smart Flask",
        sku: "item_5",
        category: "Lifestyle",
        brand: "Aether",
        description: "Vacuum-insulated stainless steel water bottle with an LED temperature display lid.",
        price: 45.00,
        quantity: 150,
        images: []
      },
      {
        name: "Aether Active Watch",
        sku: "item_6",
        category: "Electronics",
        brand: "Aether",
        description: "Sleek fitness tracking smartwatch with heart rate monitoring, GPS, and custom watch faces.",
        price: 199.00,
        quantity: 10,
        images: []
      },
      {
        name: "Studio Monitor Headphones",
        sku: "item_7",
        category: "Electronics",
        brand: "SoundPro",
        description: "Professional closed-back studio headphones featuring high transparency sound for mixing and recording.",
        price: 129.99,
        quantity: 25,
        images: []
      },
      {
        name: "Precision Ergonomic Mouse",
        sku: "item_8",
        category: "Computer",
        brand: "Ergo",
        description: "Ultra-precise wireless mouse designed to reduce wrist fatigue during long working hours.",
        price: 89.99,
        quantity: 60,
        images: []
      },
      {
        name: "Minimalist Desk Pad",
        sku: "item_9",
        category: "Accessories",
        brand: "Aether",
        description: "Sleek wool felt desk mat protecting your workspace and providing a smooth mouse surface.",
        price: 35.00,
        quantity: 110,
        images: []
      },
      {
        name: "Solid Oak Wood Desk",
        sku: "item_10",
        category: "Furniture",
        brand: "Ergo",
        description: "Handcrafted standing desk made from premium solid oak wood with an adjustable steel frame.",
        price: 599.00,
        quantity: 8,
        images: []
      }
    ];
    for (const item of defaultItems) {
      await Item.findOneAndUpdate(
        { sku: item.sku },
        item,
        { upsert: true, new: true }
      );
    }
    logger.info('Items seeded/synced successfully');
  } catch (error) {
    logger.error(`Error seeding database: ${error}`);
  }
};

export const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri, {
        maxPoolSize: 10,
        minPoolSize: 5,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 5000,
      });
      logger.info('Connected to MongoDB');
      await seedDB();
    }
  } catch (error) {
    logger.error(`Failed to connect to MongoDB: ${error}`);
    process.exit(1);
  }
};
