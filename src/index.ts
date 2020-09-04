import 'reflect-metadata';
import express from 'express';
import { MikroORM } from '@mikro-orm/core'
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import redis from 'redis';
import session from 'express-session';
import cors from 'cors';
// import connectRedis from 'connect-redis';

import { __prod__, COOKIE_NAME } from './constants';

import mikroConfig from './mikro-orm.config';
import { HelloResolver } from './resolvers/hello';
import { PostResolver } from './resolvers/post';
import { UserResolver } from './resolvers/user';
import { sendEmail } from './utils/sendEmail';

var RedisStore = require('connect-redis')(session);

const main = async () => {
  // sendEmail('oscar.graciae@gmail.com', 'change your password');
  const orm = await MikroORM.init(mikroConfig);
  await orm.getMigrator().up();
  
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

  // redisClient.on('error', (error) => {
  //   console.error("REDOS ERROR----->", error);
  // })

  // redisClient.on('ready', (error) => {
  //   console.error("REDOS ERROR----->", error);
  // })

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({ em: orm.em, req, res }),
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