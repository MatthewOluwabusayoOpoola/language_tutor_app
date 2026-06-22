import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Country } from '../entities/country.entity';
import { City } from '../entities/city.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Country)
    private countryRepository: Repository<Country>,
    @InjectRepository(City)
    private cityRepository: Repository<City>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const country = await this.countryRepository.findOne({ where: { code: user.country_code } });
    const city = await this.cityRepository.findOne({ where: { code: user.city_code } });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      country_code: user.country_code,
      city_code: user.city_code,
      country_english: country?.english_name,
      city_english: city?.english_name,
      turkish_nationality: country?.turkish_nationality,
      turkish_from: country?.turkish_from,
      turkish_city_locative: city?.turkish_locative,
    };
  }

  async getCountries() {
    return this.countryRepository.find({ order: { english_name: 'ASC' } });
  }

  async getCitiesByCountry(countryCode: string) {
    return this.cityRepository.find({
      where: { country_code: countryCode },
      order: { english_name: 'ASC' },
    });
  }
}
