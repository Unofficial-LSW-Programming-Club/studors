import express, { NextFunction, Request, Response } from 'express'
const router = express.Router()

import db from '../lib/db'
import sanitize from '../lib/sanitize'

import functions from '../../views/components/functions'

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
    if (res.locals.user.pos === 'tutor') {
      if (res.locals.user.grade < 9 && req.path != '/settings') {
        res.redirect('settings')
        return
      }
      next()
      return
    }
  }
  res.redirect('/auth/tutor')
}

// Use above function in routing
router.use(checkAuthentication)

router.get('/home', (req, res) => {
  res.render('pages/tutor/home', { darkMode: res.locals.user.dark_theme })
})

router.get('/find', (req, res) => {
  res.render('pages/tutor/find', { darkMode: res.locals.user.dark_theme })
})

router.get('/settings', (req, res) => {
  res.render('pages/tutor/settings', {
    error: '',
    darkMode: true // Check box handles
  })
})

router.get('/availability', async (req, res) => {
  // Check to make sure that increments exist and if they do create weekly availability
  const increments = await db.listIncrements()
  if (increments != undefined && increments.length != 0) {
    await db.createWeeklyAvailability()
  } else {
    res.render('pages/tutor/settings', {
      error: 'No time slots have been set by your admin',
      darkMode: res.locals.user.dark_theme
    })
    return
  }

  const times = []

  for (let i = 0; i < increments.length; i++) {
    // Creates schedule layout
    const time = increments[i]['hour']
    const push = [time, '', '', '', '', '']
    const week = await db.listWeeklyAvailabilityAtIncrement(time)
    if (week === undefined) {
      return
    }
    // Populate push for each dow
    for (let j = 0; j < 5; j++) {
      const h = week[j]['dow']
      push[h] = week[j]['id']
    }
    times.push(push)
  }

  // Check to see what the user has checked previously
  res.locals.user = req.user
  const id = res.locals.user.id
  const availability = await db.listTutorWeeklyAvailability(id)
  const checked = []
  if (availability != undefined) {
    for (let k = 0; k < availability.length; k++) {
      checked.push(availability[k]['weeklyavailability_id'])
    }
  }

  // Render the page with all the data collected
  res.render('pages/tutor/availability', {
    times: times,
    checked: checked,
    functions: functions,
    error: req.query.error,
    darkMode: res.locals.user.dark_theme
  })
})

// Take in data given from user for selecting availability
router.post('/availability', async (req, res) => {
  const week = await db.listWeeklyAvailability()
  res.locals.user = req.user
  const id = res.locals.user.id
  // If for some odd reason time slots disappear while user is selecting availability redirect with error
  if (week === undefined) {
    res.redirect(
      'availability?error=No%20time%20slots%20have%20been%20set%20by%20your%20admin'
    )
    return
  }
  // For every value add or remove based off checks by user
  for (let i = 0; i < week.length; i++) {
    const name: string = week[i]['id']
    if (name in req.body) {
      db.addTutorWeeklyAvailability(id, name)
    } else {
      db.removeTutorWeeklyAvailability(id, name)
    }
  }
  res.redirect('settings')
  return
})

// Show the subjects that the user can tutor in
router.get('/subjects', async (req, res) => {
  const subjects = await db.listSubjects()
  res.locals.user = req.user
  const id = res.locals.user.id
  const tutorsSubjects = await db.listTutorsSubjects(id)
  // Persist previously checked subjects
  const checked = ['']
  if (tutorsSubjects != undefined) {
    for (let i = 0; i < tutorsSubjects.length; i++) {
      checked.push(tutorsSubjects[i]['subject_id'])
    }
  }
  res.render('pages/tutor/subjects', {
    subjects: subjects,
    checked: checked,
    error: req.query.error,
    darkMode: res.locals.user.dark_theme
  })
})

// Take in data given from user for selecting subjects
router.post('/subjects', async (req, res) => {
  const subjects = await db.listSubjects()
  const body = req.body
  res.locals.user = req.user
  const id = res.locals.user.id
  // If for some odd reason subjects disappear while user is selecting availability redirect with error
  if (subjects === undefined) {
    res.redirect('subjects?error=No%20subjects%20created%20by%20your%20admin')
    return
  }

  // For every value add or remove based off checks by user
  for (let i = 0; i < subjects.length; i++) {
    const name: string = subjects[i]['subject']
    if (name in body) {
      db.addTutorsSubject(name, id)
    } else {
      db.removeTutorsSubject(name, id)
    }
  }
  res.redirect('settings')
  return
})

router.get('/upcoming', async (req, res) => {
  const upcomingSessions = await db.listSessions(
    true,
    'tutors',
    res.locals.user.id
  )
  res.render('pages/tutor/upcoming', {
    upcomingSessions: upcomingSessions,
    functions: functions,
    darkMode: res.locals.user.dark_theme
  })
})

router.get('/history', async (req, res) => {
  const pastSessions = await db.listSessions(
    false,
    'tutors',
    res.locals.user.id
  )
  res.render('pages/tutor/history', {
    pastSessions: pastSessions,
    functions: functions,
    darkMode: res.locals.user.dark_theme
  })
})

// Take in data given by user in settings
router.post('/settings', (req, res) => {
  // Sanitize user given data
  const sanitizedPhone = sanitize.phone(req.body.phone)
  const sanitizedGrade = sanitize.grade(req.body.grade, 'tutor')
  let sanitizedDarkTheme = false
  if (req.body.dark_theme != undefined && req.body.dark_theme === 'on') {
    sanitizedDarkTheme = true
  }
  if (typeof sanitizedPhone == 'string' && sanitizedGrade) {
    // Update user info if pass sanitization
    db.updateUser(
      'tutors',
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
  res.render('pages/tutor/settings', {
    error: error,
    darkMode: res.locals.user.dark_theme
  })
})

export { router }
