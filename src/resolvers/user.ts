import { Resolver, Mutation, Field, Args, ArgsType, Ctx, ObjectType, Query } from "type-graphql";
import argon2 from 'argon2';

import { MyContext } from "../types";
import { User } from "../entities/User";
import { COOKIE_NAME } from "../constants";
import { getConnection } from "typeorm";

@ArgsType()
class UsernamePasswordInput {
  @Field({ nullable: true })
  email?: string

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
  async me(@Ctx() { req }: MyContext) {
    if (!req.session.userId) return null;

    const user = await User.findOne({ where: { id: req.session.userId } });
    return user;
  }

  @Mutation(() => UserResponse)
  async register(@Args() params: UsernamePasswordInput) {
    try {
      const hashPassword = await argon2.hash(params.password);
      const result = await getConnection()
      .createQueryBuilder()
      .insert()
      .into(User)
      .values({
        username: params.username,
        email: params.email,
        password: hashPassword,
      }).returning("*").execute();
      // await em.persistAndFlush(user);
      console.log("results--->", result);
      console.log("return register--->" );
      return {
        user: result.raw[0],
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
  async login(@Args() params: UsernamePasswordInput, @Ctx() { req }: MyContext): Promise<UserResponse> {
    // const user = await em.findOneOrFail(User, { username: params.username });
    const user = await User.findOne({ where: { username: params.username } });
    if (!user) {
      return {
        errors: [{
          field: 'username',
          message: `${params.username} username does not exist`
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

}