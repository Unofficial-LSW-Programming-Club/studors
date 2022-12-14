import passport from 'passport'
import {
  Profile,
  Strategy as GoogleStrategy,
  VerifyCallback
} from 'passport-google-oauth20'

import db from '../lib/db'

passport.serializeUser((userObj, done) => {
  done(null, userObj)
})

passport.deserializeUser((userObj: Express.User, done) => {
  done(null, userObj)
})

passport.use(
  'student-google',
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || 'clientIDNotFound',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'clientSecretNotFound',
      callbackURL:
        process.env.SERVER_URL + '/auth/student/google' ||
        'studentRedirectNotFound',
      scope: ['email', 'profile']
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => {
      // If there is already a student with this ID
      const studentProfile = await db.authUser('students', profile.id)
      if (studentProfile) {
        done(null, studentProfile)
        return
      }
      // If there is not a student with this ID
      else if (profile._json.email != undefined) {
        if (
          (await db.checkUser(
            'students',
            '@' + profile._json.email.split('@')[1]
          )) != undefined
        ) {
          const profilePic = profile._json.picture?.replace('=s96-c', '=s256-c')
          db.createUser(
            'students',
            profile.id,
            profile._json.given_name || 'Example',
            profile._json.family_name || 'Student',
            profilePic || 'https://via.placeholder.com/256',
            profile._json.email || 'examplestudent@example.org'
          )
          let studentProfile
          let maxTries = 0
          while (studentProfile === undefined && maxTries <= 100) {
            studentProfile = await db.authUser('students', profile.id)
            maxTries++
          }
          done(null, studentProfile)
          return
        }
        done(null, false)
      }
    }
  )
)

passport.use(
  'tutor-google',
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || 'clientIDNotFound',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'clientSecretNotFound',
      callbackURL:
        process.env.SERVER_URL + '/auth/tutor/google' ||
        'tutorRedirectNotFound',
      scope: ['email', 'profile']
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => {
      // If there is already a tutor with this ID
      const tutorProfile = await db.authUser('tutors', profile.id)
      if (tutorProfile) {
        done(null, tutorProfile)
        return
      }
      // If there is not a tutor with this ID
      else if (profile._json.email != undefined) {
        if ((await db.checkUser('tutors', profile._json.email)) != undefined) {
          const profilePic = profile._json.picture?.replace('=s96-c', '=s256-c')
          db.createUser(
            'tutors',
            profile.id,
            profile._json.given_name || 'Example',
            profile._json.family_name || 'Tutor',
            profilePic || 'https://via.placeholder.com/256',
            profile._json.email || 'exampletutor@example.org'
          )
          let tutorProfile
          let maxTries = 0
          while (tutorProfile === undefined && maxTries <= 100) {
            tutorProfile = await db.authUser('tutors', profile.id)
            maxTries++
          }
          done(null, tutorProfile)
          return
        }
        done(null, false)
      }
    }
  )
)

passport.use(
  'admin-google',
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || 'clientIDNotFound',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'clientSecretNotFound',
      callbackURL:
        process.env.SERVER_URL + '/auth/admin/google' ||
        'adminRedirectNotFound',
      scope: ['email', 'profile']
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => {
      // If there is already an admin with this ID
      const adminProfile = await db.authUser('admins', profile.id)
      if (adminProfile) {
        done(null, adminProfile)
        return
      }
      // If there is not an admin with this ID
      else if (profile._json.email != undefined) {
        if ((await db.checkUser('admins', profile._json.email)) != undefined) {
          const profilePic = profile._json.picture?.replace('=s96-c', '=s256-c')
          db.createUser(
            'admins',
            profile.id,
            profile._json.given_name || 'Example',
            profile._json.family_name || 'Admin',
            profilePic || 'https://via.placeholder.com/256',
            profile._json.email || 'exampleadmin@example.org'
          )
          let adminProfile
          let maxTries = 0
          while (adminProfile === undefined && maxTries <= 100) {
            adminProfile = await db.authUser('admins', profile.id)
            maxTries++
          }
          done(null, adminProfile)
          return
        }
      }
      done(null, false)
    }
  )
)
