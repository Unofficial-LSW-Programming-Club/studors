import express, { NextFunction, Request, Response } from 'express'
const router = express.Router()

import db from '../lib/db'
import sanitize from '../lib/sanitize'
import time from '../lib/time'

/**
 * Ensures that the user is authenticated and signed up, if not signed up redirect to settings and if not authed then redirect to auth page
 * @param req Request
 * @param res Response
 * @param next Next Step
 * @returns Nothing
 */
function checkAuthentication(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    res.locals.user = req.user
    if (res.locals.user.pos === 'student') {
      if (res.locals.user.grade < 9 && req.path != '/settings') {
        res.redirect('/student/settings')
        return
      }
      next()
      return
    }
  }
  res.redirect('/auth/student')
}

// Use above function in routing
router.use(checkAuthentication)

router.get('/home', (req, res) => {
  res.render('pages/student/home', {
    darkMode: res.locals.user.dark_theme,
    pos: 'Student'
  })
})

router.get('/find', async (req, res) => {
  const subjects = await db.listSubjects()
  const availability = await db.listAvailability(res.locals.user.id)
  let error = ''
  if (availability && availability.length < 1) {
    error = 'Sorry, but there are no available times at the moment'
  }
  res.render('pages/student/find', {
    subjects: subjects,
    availability: availability,
    error: error,
    darkMode: res.locals.user.dark_theme,
    pos: 'Student'
  })
})

// Take in data given from user for selecting a session
router.post('/find', async (req, res) => {
  const session = await db.createSession(
    res.locals.user.id,
    req.body.tutorpicker,
    new Date(req.body.time),
    req.body.subjectpicker,
    parseInt(req.body.durationpicker) / 60
  )
  if (typeof session === 'boolean') {
    res.redirect('upcoming')
    return
  }
  // If didn't save properly
  const subjects = await db.listSubjects()
  const availability = await db.listAvailability(res.locals.user.id)
  res.render('pages/student/find', {
    subjects: subjects,
    availability: availability,
    error: session,
    darkMode: res.locals.user.dark_theme,
    pos: 'Student'
  })
})

router.get('/request', (req, res) => {
  res.render('pages/student/request', {
    darkMode: res.locals.user.dark_theme,
    pos: 'Student'
  })
})

router.get('/settings', (req, res) => {
  res.render('pages/student/settings', {
    error: '',
    darkMode: true, // Check box handles
    pos: 'Student'
  })
})

// Take in data given by user in settings
router.post('/settings', (req, res) => {
  // Sanitize user given data
  const sanitizedPhone = sanitize.phone(req.body.phone)
  const sanitizedGrade = sanitize.grade(req.body.grade, 'student')
  let sanitizedDarkTheme = false
  if (req.body.dark_theme != undefined && req.body.dark_theme === 'on') {
    sanitizedDarkTheme = true
  }
  if (typeof sanitizedPhone == 'string' && sanitizedGrade) {
    // Update user info if pass sanitization
    db.updateUser(
      'students',
      res.locals.user.id,
      sanitizedPhone,
      req.body.grade,
      sanitizedDarkTheme
    )
    // Update user cookies
    res.locals.user.phone = sanitizedPhone
    res.locals.user.grade = req.body.grade
    res.locals.user.dark_theme = req.body.dark_theme
    // Redirect to home page
    res.redirect('home')
    return
  }
  // Tabulate error
  let error = 'Invalid '
  if (!sanitizedGrade) {
    error += 'grade'
  }
  if (!sanitizedGrade && typeof sanitizedPhone == 'boolean') {
    error += ' and '
  }
  if (typeof sanitizedPhone == 'boolean') {
    error += 'phone number'
  }
  // Rerender settings page with error
  res.render('pages/student/settings', {
    error: error,
    darkMode: res.locals.user.dark_theme,
    pos: 'Student'
  })
})

router.get('/upcoming', async (req, res) => {
  const upcomingSessions = await db.listSessions(
    true,
    'students',
    res.locals.user.id,
    true
  )
  res.render('pages/student/upcoming', {
    upcomingSessions: upcomingSessions,
    time: time,
    darkMode: res.locals.user.dark_theme,
    pos: 'Student',
    message: req.query.message
  })
})

router.post('/cancel', async (req, res) => {
  const date = new Date(Number(req.body.cancel))
  const upcomingSessions = await db.listSessions(
    true,
    'students',
    res.locals.user.id,
    true
  )
  let newSessions = upcomingSessions
  const message = await db.removeSession(res.locals.user.id, 'student', date)
  let maxTries = 100
  while (upcomingSessions === newSessions && maxTries > 0) {
    newSessions = await db.listSessions(
      true,
      'students',
      res.locals.user.id,
      true
    )
    maxTries--
  }
  res.redirect('/student/upcoming?message=' + message)
  return
})

router.get('/history', async (req, res) => {
  const pastSessions = await db.listSessions(
    false,
    'students',
    res.locals.user.id,
    true
  )
  res.render('pages/student/history', {
    pastSessions: pastSessions,
    time: time,
    darkMode: res.locals.user.dark_theme,
    pos: 'Student'
  })
})

export { router }
