import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { City } from './city.entity';

@Entity('countries')
export class Country {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  english_name: string;

  @Column()
  turkish_nationality: string; // e.g. "Nijeryalıyım"

  @Column()
  turkish_from: string; // e.g. "Nijerya'dan geliyorum"

  @OneToMany(() => City, (city) => city.country)
  cities: City[];
}
