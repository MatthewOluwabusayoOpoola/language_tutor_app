import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Country } from './entities/country.entity';
import { City } from './entities/city.entity';

const COUNTRIES = [
  { code: 'NG', english_name: 'Nigeria', turkish_nationality: 'Nijeryalıyım', turkish_from: "Nijerya'dan geliyorum" },
  { code: 'TR', english_name: 'Turkey', turkish_nationality: 'Türküm', turkish_from: "Türkiye'den geliyorum" },
  { code: 'GB', english_name: 'United Kingdom', turkish_nationality: 'İngilizim', turkish_from: "İngiltere'den geliyorum" },
  { code: 'US', english_name: 'United States', turkish_nationality: 'Amerikalıyım', turkish_from: "Amerika'dan geliyorum" },
  { code: 'DE', english_name: 'Germany', turkish_nationality: 'Almanyalıyım', turkish_from: "Almanya'dan geliyorum" },
  { code: 'FR', english_name: 'France', turkish_nationality: 'Fransızım', turkish_from: "Fransa'dan geliyorum" },
  { code: 'GH', english_name: 'Ghana', turkish_nationality: 'Ganalıyım', turkish_from: "Gana'dan geliyorum" },
  { code: 'ZA', english_name: 'South Africa', turkish_nationality: 'Güney Afrikalıyım', turkish_from: "Güney Afrika'dan geliyorum" },
  { code: 'EG', english_name: 'Egypt', turkish_nationality: 'Mısırlıyım', turkish_from: "Mısır'dan geliyorum" },
  { code: 'IN', english_name: 'India', turkish_nationality: 'Hintliyim', turkish_from: "Hindistan'dan geliyorum" },
  { code: 'CN', english_name: 'China', turkish_nationality: 'Çinliyim', turkish_from: "Çin'den geliyorum" },
  { code: 'BR', english_name: 'Brazil', turkish_nationality: 'Brezilyalıyım', turkish_from: "Brezilya'dan geliyorum" },
  { code: 'CY', english_name: 'Cyprus', turkish_nationality: 'Kıbrıslıyım', turkish_from: "Kıbrıs'tan geliyorum" },
  { code: 'IT', english_name: 'Italy', turkish_nationality: 'İtalyanım', turkish_from: "İtalya'dan geliyorum" },
  { code: 'ES', english_name: 'Spain', turkish_nationality: 'İspanyolum', turkish_from: "İspanya'dan geliyorum" },
];

const CITIES = [
  { code: 'NIC', english_name: 'Nicosia', turkish_locative: "Lefkoşa'da yaşıyorum", country_code: 'CY' },
  { code: 'LCA', english_name: 'Larnaca', turkish_locative: "Larnaka'da yaşıyorum", country_code: 'CY' },
  { code: 'LIM', english_name: 'Limassol', turkish_locative: "Limasol'da yaşıyorum", country_code: 'CY' },
  { code: 'ABJ', english_name: 'Abuja', turkish_locative: "Abuja'da yaşıyorum", country_code: 'NG' },
  { code: 'LAG', english_name: 'Lagos', turkish_locative: "Lagos'ta yaşıyorum", country_code: 'NG' },
  { code: 'IST', english_name: 'Istanbul', turkish_locative: "İstanbul'da yaşıyorum", country_code: 'TR' },
  { code: 'ANK', english_name: 'Ankara', turkish_locative: "Ankara'da yaşıyorum", country_code: 'TR' },
  { code: 'LON', english_name: 'London', turkish_locative: "Londra'da yaşıyorum", country_code: 'GB' },
  { code: 'NYC', english_name: 'New York', turkish_locative: "New York'ta yaşıyorum", country_code: 'US' },
  { code: 'BER', english_name: 'Berlin', turkish_locative: "Berlin'de yaşıyorum", country_code: 'DE' },
  { code: 'PAR', english_name: 'Paris', turkish_locative: "Paris'te yaşıyorum", country_code: 'FR' },
  { code: 'ACC', english_name: 'Accra', turkish_locative: "Accra'da yaşıyorum", country_code: 'GH' },
  { code: 'CPT', english_name: 'Cape Town', turkish_locative: "Cape Town'da yaşıyorum", country_code: 'ZA' },
  { code: 'CAI', english_name: 'Cairo', turkish_locative: "Kahire'de yaşıyorum", country_code: 'EG' },
  { code: 'MUM', english_name: 'Mumbai', turkish_locative: "Mumbai'de yaşıyorum", country_code: 'IN' },
  { code: 'BEI', english_name: 'Beijing', turkish_locative: "Pekin'de yaşıyorum", country_code: 'CN' },
  { code: 'SAO', english_name: 'São Paulo', turkish_locative: "São Paulo'da yaşıyorum", country_code: 'BR' },
  { code: 'ROM', english_name: 'Rome', turkish_locative: "Roma'da yaşıyorum", country_code: 'IT' },
  { code: 'MAD', english_name: 'Madrid', turkish_locative: "Madrid'de yaşıyorum", country_code: 'ES' },
];

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const countryRepo = app.get(getRepositoryToken(Country));
  const cityRepo = app.get(getRepositoryToken(City));

  console.log('Seeding countries...');
  for (const c of COUNTRIES) {
    const existing = await countryRepo.findOne({ where: { code: c.code } });
    if (!existing) await countryRepo.save(countryRepo.create(c));
  }

  console.log('Seeding cities...');
  for (const c of CITIES) {
    const existing = await cityRepo.findOne({ where: { code: c.code } });
    if (!existing) await cityRepo.save(cityRepo.create(c));
  }

  console.log('Seed complete.');
  await app.close();
}

seed().catch((e) => { console.error(e); process.exit(1); });
