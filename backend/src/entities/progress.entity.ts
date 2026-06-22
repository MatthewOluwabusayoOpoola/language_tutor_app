import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

export enum ConversationMode {
  NORMAL = 'normal',
  ROMANTIC = 'romantic',
}

@Entity('progress')
export class Progress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.progress)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: string;

  @Column({ type: 'enum', enum: ConversationMode, default: ConversationMode.NORMAL })
  mode: ConversationMode;

  @Column({ default: 1 })
  current_day: number;

  @Column({ default: 1 })
  current_line: number;

  @Column({ type: 'jsonb', default: '[]' })
  completed_days_json: number[];

  @UpdateDateColumn()
  updated_at: Date;
}
