import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { ConversationMode } from './progress.entity';

@Entity('attempts')
export class Attempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.attempts)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: string;

  @Column({ type: 'enum', enum: ConversationMode, default: ConversationMode.NORMAL })
  mode: ConversationMode;

  @Column()
  line_number: number;

  @Column({ default: 0 })
  attempt_count: number;

  @Column({ type: 'float', default: 0 })
  best_score: number;

  @UpdateDateColumn()
  updated_at: Date;
}
