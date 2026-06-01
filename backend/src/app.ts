import 'reflect-metadata';
import express from 'express';
import session from 'express-session';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import passport from 'passport';
import { useExpressServer } from 'routing-controllers';

import {
  BASE_URL_PREFIX,
  CREDENTIALS,
  LOG_FORMAT,
  NODE_ENV,
  ORIGIN,
  PORT,
  SAML_FAILURE_REDIRECT,
  SAML_SUCCESS_REDIRECT,
  SECRET_KEY,
} from '@config';
import errorMiddleware from '@middlewares/error.middleware';
import { SessionUser } from '@interfaces/user.interface';
import { createSamlStrategy } from '@utils/saml';
import { logger, stream } from '@utils/logger';

class App {
  public app: express.Application;
  public env: string;
  public port: string | number;

  constructor(controllers: Function[]) {
    this.app = express();
    this.env = NODE_ENV || 'development';
    this.port = PORT || 3001;

    this.initializeMiddlewares();
    this.initializeSamlRoutes();
    this.initializeRoutes(controllers);
    this.initializeErrorHandling();
  }

  public listen() {
    this.app.listen(this.port, () => {
      logger.info('=================================');
      logger.info(`======= ENV: ${this.env} =======`);
      logger.info(`🚀 BFF listening on port ${this.port}`);
      logger.info('=================================');
    });
  }

  public getServer() {
    return this.app;
  }

  private initializeMiddlewares() {
    this.app.use(morgan(LOG_FORMAT || 'dev', { stream }));
    this.app.use(hpp());
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());
    this.app.use(
      cors({
        origin: ORIGIN ? ORIGIN.split(',') : true,
        credentials: CREDENTIALS,
      }),
    );

    this.app.set('trust proxy', 1);

    this.app.use(
      session({
        secret: SECRET_KEY || 'change-me',
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          sameSite: 'lax',
          secure: this.env === 'production',
          maxAge: 4 * 24 * 60 * 60 * 1000, // 4 days
        },
      }),
    );

    // passport is only used for the SAML handshake; the session source of truth
    // is req.session.user (set in the SAML callback), so no passport.session().
    this.app.use(passport.initialize());
    passport.use('saml', createSamlStrategy());
  }

  /**
   * Raw Express routes for the admin SAML flow against the fake SSO IdP.
   * Kept outside routing-controllers because they deal with redirects and the
   * SAML POST callback rather than JSON APIs.
   */
  private initializeSamlRoutes() {
    const prefix = BASE_URL_PREFIX || '';
    const successRedirect = SAML_SUCCESS_REDIRECT || '/';
    const failureRedirect = SAML_FAILURE_REDIRECT || '/';

    // Start login: redirect the browser to the IdP.
    this.app.get(`${prefix}/saml/login`, (req, res, next) => {
      passport.authenticate('saml', { session: false, failureRedirect })(req, res, next);
    });

    // IdP posts the SAMLResponse back here.
    this.app.post(
      `${prefix}/saml/login/callback`,
      express.urlencoded({ extended: false }),
      (req, res, next) => {
        passport.authenticate('saml', { session: false }, (err: unknown, user: SessionUser | false, info: { message?: string } | undefined) => {
          if (err) {
            logger.error(`SAML callback error: ${(err as Error).message ?? err}`);
            return res.redirect(`${failureRedirect}?error=AUTH_FAILED`);
          }
          if (!user) {
            return res.redirect(`${failureRedirect}?error=${info?.message ?? 'NO_USER'}`);
          }
          req.session.user = user;
          req.session.save(saveErr => {
            if (saveErr) {
              logger.error(`Could not save admin session: ${saveErr.message}`);
              return res.redirect(`${failureRedirect}?error=SESSION_ERROR`);
            }
            return res.redirect(successRedirect);
          });
        })(req, res, next);
      },
    );

    // Logout: clear our session and return to the admin login.
    this.app.get(`${prefix}/saml/logout`, (req, res) => {
      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect(`${ORIGIN ?? ''}/admin`);
      });
    });

    // SP metadata (handy when wiring up a real IdP later).
    this.app.get(`${prefix}/saml/metadata`, (_req, res) => {
      try {
        const strategy = (passport as any)._strategy('saml') as {
          generateServiceProviderMetadata: (decryptionCert: string | null, signingCert: string | null) => string;
        };
        const metadata = strategy.generateServiceProviderMetadata(null, null);
        res.type('application/xml').send(metadata);
      } catch (e) {
        logger.error(`Could not generate SP metadata: ${(e as Error).message}`);
        res.status(501).json({ message: 'METADATA_UNAVAILABLE' });
      }
    });
  }

  private initializeRoutes(controllers: Function[]) {
    useExpressServer(this.app, {
      routePrefix: BASE_URL_PREFIX,
      controllers,
      defaultErrorHandler: false,
      cors: false,
    });
  }

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }
}

export default App;
