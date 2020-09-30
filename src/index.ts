import 'reflect-metadata';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import redis from 'redis';
import session from 'express-session';
import cors from 'cors';
import { createConnection } from 'typeorm';

// import connectRedis from 'connect-redis';

import { __prod__, COOKIE_NAME } from './constants';

import { HelloResolver } from './resolvers/hello';
import { PostResolver } from './resolvers/post';
import { UserResolver } from './resolvers/user';
import { Post } from './entities/Post';
import { User } from './entities/User';

var RedisStore = require('connect-redis')(session);

const main = async () => {
  // sendEmail('oscar.graciae@gmail.com', 'change your password');

  await createConnection({
    type: 'postgres',
    database: 'lireddit2',
    username: 'postgres',
    password: 'desarrollo',
    logging: true,
    synchronize: true,
    entities: [User, Post],
  });

  const app = express();

  // const RedistStore = connectRedis(session);
  const redisClient = redis.createClient();

  app.use(cors( { origin: 'http://localhost:3000', credentials: true } ))

  app.use(session({
    name: COOKIE_NAME,
    secret: 'secretkey',
    store: new RedisStore({ 
      client: redisClient,
      disableTouch: true,
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // only works https,
    },
    saveUninitialized: false,
    resave: false,
  }))

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({ req, res, redis }),
  })

  apolloServer.applyMiddleware({
    app,
    // cors: { origin: 'http://localhost:3000' }
    cors: false,
  });

  app.listen(4000, () => {
    console.log(`Server started on localhost:4000`);
  });

}

main().catch((error) => {
  console.log("ERROR--->", error.message);
})