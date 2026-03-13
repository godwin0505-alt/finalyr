import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

dotenv.config();

const adapter = new PrismaLibSql({
  url: `file:${process.env.DATABASE_URL?.replace('file:', '') || './dev.db'}`
});
const prisma = new PrismaClient({ adapter });

async function waitForDb(retries = 12, delayMs = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      return;
    } catch (err: any) {
      const attempt = i + 1;
      console.error(`Prisma connect attempt ${attempt}/${retries} failed: ${err?.message ?? err}`);
      if (attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function seedClimateData() {
  console.log('📊 Seeding climate data...');
  
  const csvPath = path.resolve(__dirname, '../../temp_exogenous_dataset(2000-2024).csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });

  console.log(`Found ${records.length} climate records`);

  let imported = 0;
  const batchSize = 1000;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const data = batch
      .map((record: any) => {
        const date = new Date(record.Date);
        // Skip invalid dates
        if (isNaN(date.getTime())) {
          return null;
        }
        return {
          date,
          year: parseInt(record.YEAR),
          month: date.getMonth() + 1,
          day: date.getDate(),
          temperature: parseFloat(record.Temperature),
          humidity: parseFloat(record.RH2M),
          precipitation: parseFloat(record.PRECTOTCORR),
          windSpeed: parseFloat(record.WS2M),
          pressure: parseFloat(record.PS)
        };
      })
      .filter((item: any) => item !== null); // Remove invalid entries

    await prisma.climateData.createMany({
      data
    });

    imported += batch.length;
    console.log(`✅ Imported ${imported}/${records.length} records`);
  }

  console.log('✅ Climate data seeded successfully');
}

async function seedForecastData() {
  console.log('📈 Seeding forecast data...');
  
  const csvPath = path.resolve(__dirname, '../../temperature_forecast_2025_2035.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });

  console.log(`Found ${records.length} forecast records`);

  const data = records
    .map((record: any) => {
      const date = new Date(record.Date);
      if (isNaN(date.getTime())) return null;
      
      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        temperature: parseFloat(record.mean)
      };
    })
    .filter((item) => item !== null);

  console.log(`Valid forecast records: ${data.length}`);

  await prisma.forecastData.createMany({
    data
  });

  console.log('✅ Forecast data seeded successfully');
}

async function main() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await prisma.comparisonLog.deleteMany({});
    await prisma.forecastData.deleteMany({});
    await prisma.climateData.deleteMany({});
    console.log('✅ Cleared\n');

    // Seed data
    await seedClimateData();
    console.log('');
    await seedForecastData();

    console.log('\n🎉 Database seeding completed successfully!');

    // Show stats
    const climateCount = await prisma.climateData.count();
    const forecastCount = await prisma.forecastData.count();
    
    console.log('\n📊 Database Stats:');
    console.log(`  Climate Records: ${climateCount}`);
    console.log(`  Forecast Records: ${forecastCount}`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
