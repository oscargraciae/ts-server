import { Resolver, Mutation, Field, Args, ArgsType, Ctx, ObjectType, Query, Arg } from "type-graphql";
import argon2 from 'argon2';
import { EntityManager } from '@mikro-orm/postgresql';

import { MyContext } from "../types";
import { User } from "../entities/User";
import { COOKIE_NAME } from "../constants";

@ArgsType()
class UsernamePasswordInput {
  @Field()
  email: string

  @Field()
  username: string

  @Field()
  password: string
}

@ObjectType()
class FieldError {
  @Field()
  field: string
  @Field()
  message: string
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[]
  @Field(() => User, { nullable: true })
  user?: User
}

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  async me(@Ctx() { em, req }: MyContext) {
    if (!req.session.userId) return null;

    const user = await em.findOne(User, { id: req.session.userId });
    return user;
  }

  @Mutation(() => UserResponse)
  async register(@Args() params: UsernamePasswordInput, @Ctx() { em }: MyContext) {
    try {
      const hashPassword = await argon2.hash(params.password);
      const result = await (em as EntityManager).createQueryBuilder(User).getKnexQuery().insert(
        {
          email: params.email, 
          username: params.username, 
          password: hashPassword,
          created_at: new Date(),
          updated_at: new Date()
        }
      ).returning('*');
      // const user = em.create(User, { username: params.username, password: hashPassword });
      // await em.persistAndFlush(user);
      console.log("return register--->" );
      return {
        user: result[0],
      };
    } catch (error) {
      console.log("ERROR--->", error);
      return {
        errors: [{
          field: 'fields',
          message: error.message,
        }]
      }
    }
  }

  @Mutation(() => UserResponse)
  async login(@Args() params: UsernamePasswordInput, @Ctx() { em, req }: MyContext): Promise<UserResponse> {
    const user = await em.findOneOrFail(User, { username: params.username });
    if (!user) {
      return {
        errors: [{
          field: 'username',
          message: 'username does not exist'
        }]
      }
    }
    const isValid = await argon2.verify(user.password, params.password);
    if (!isValid) {
      return {
        errors: [{
          field: 'password',
          message: 'incorect password'
        }]
      }
    }

    req.session!.userId = user.id;
    
    return {
      user
    };
  }

  @Mutation(() => Boolean)
  async logout(@Ctx() { req, res }: MyContext) {
    return new Promise(resolve => req.session.destroy((error) => {
      res.clearCookie(COOKIE_NAME);
      console.log("ERROR---->", error);
      if (error) {
        console.log("ERROR-2--->", error);
        resolve(false);
        return;
      }

      resolve(true);
    }))
  }

  @Mutation(() => Boolean)
  async forgotPassword(@Ctx() { req, em }: MyContext, @Arg('email') email: string) {
   // const user = await em.findOne(User, { email });
   return true;
  }
}