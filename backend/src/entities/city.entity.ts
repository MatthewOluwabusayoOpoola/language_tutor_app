import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Country } from './country.entity';

@Entity('cities')
export class City {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  english_name: string;

  @Column()
  turkish_locative: string; // e.g. "Lefkoşa'da yaşıyorum"

  @Column()
  country_code: string;

  @ManyToOne(() => Country, (country) => country.cities)
  @JoinColumn({ name: 'country_code', referencedColumnName: 'code' })
  country: Country;
}
