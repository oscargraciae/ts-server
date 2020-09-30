import { ObjectType, Field, Int } from 'type-graphql'
import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, CreateDateColumn, BaseEntity, ManyToOne } from 'typeorm'
import { User } from './User'

@ObjectType()
@Entity()
export class Post extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number

  @Field()
  @Column()
  title!: string

  @Field()
  @Column()
  text!: string

  @Field()
  @Column({ type: "int", default: 0 })
  points!: number

  @Field()
  @Column()
  creatorId: number;

  @ManyToOne(() => User, user => user.posts)
  creator: User

  @Field(() => String)
  @CreateDateColumn()
  createdAt = new Date()

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt = new Date()
}